package com.backend.Projet.service;

import com.backend.Projet.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "app.worker-subscription.ocr", name = "enabled", havingValue = "true")
public class TesseractReceiptOcrService implements ReceiptOcrService {

    private static final Path WINDOWS_TESSERACT_FALLBACK_PATH = Paths.get("C:\\Program Files\\Tesseract-OCR\\tesseract.exe");

    private static final List<String> DEFAULT_SUCCESS_KEYWORDS = List.of(
            "نجاح", "ناجح", "تم", "تم التحويل", "تم الدفع",
            "success", "successful", "ok", "valide", "reussi", "réussi", "succes"
    );

    private static final Pattern DATE_PATTERN = Pattern.compile(
            "\\b(\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}[-/.]\\d{1,2}[-/.]\\d{2,4})\\b"
    );

    private final FileStorageService fileStorageService;

    @Value("${app.worker-subscription.ocr.tesseract-command:tesseract}")
    private String tesseractCommand;

    @Value("${app.worker-subscription.ocr.languages:eng+fra+ara}")
    private String languages;

    @Value("${app.worker-subscription.ocr.timeout-seconds:25}")
    private long timeoutSeconds;

    @Value("${app.worker-subscription.ocr.success-keywords:success,successful,succes,reussi,reussie,réussi,réussie,ok,valide,نجاح,ناجح,تمت,مقبول}")
    private String successKeywords;

    @Override
    public ReceiptOcrAnalysis analyzeReceipt(String storedReceiptPath, String transferReference, BigDecimal expectedAmount) {
        Path receiptPath = fileStorageService.resolveStoredPath(storedReceiptPath);
        try {
            System.out.println("========== STARTING OCR ==========");
            System.out.println("Reading image: " + receiptPath.toString());
            String rawText = isPdf(receiptPath)
                    ? runTesseractOnPdf(receiptPath)
                    : runTesseract(receiptPath);
            
            System.out.println("OCR RAW TEXT EXTRACTED: \n" + rawText);
            System.out.println("========== END OCR ==========");
            return buildAnalysis(rawText, transferReference, expectedAmount);
        } catch (IOException exception) {
            System.err.println("OCR IOException: " + exception.getMessage());
            return unavailableResult("OCR failed to read the receipt file. " + exception.getMessage());
        } catch (InterruptedException exception) {
            System.err.println("OCR InterruptedException: " + exception.getMessage());
            Thread.currentThread().interrupt();
            return unavailableResult("OCR was interrupted before completion.");
        }
    }

    private ReceiptOcrAnalysis buildAnalysis(String rawText, String transferReference, BigDecimal expectedAmount) {
        String normalizedText = normalizeForSearch(rawText);
        String normalizedReference = normalizeForSearch(transferReference);
        boolean referenceMatched = !normalizedReference.isBlank() && normalizedText.contains(normalizedReference);
        boolean amountMatched = containsExpectedAmount(rawText, expectedAmount);
        String detectedDate = detectDate(rawText);
        boolean dateDetected = detectedDate != null;
        boolean successDetected = containsSuccessKeyword(normalizedText);

        // Automatic approval should require strong evidence from the receipt itself.
        boolean verified = amountMatched && (dateDetected || successDetected);

        return ReceiptOcrAnalysis.builder()
                .available(true)
                .verified(verified)
                .referenceMatched(referenceMatched)
                .amountMatched(amountMatched)
                .dateDetected(dateDetected)
                .successKeywordDetected(successDetected)
                .detectedDate(detectedDate)
                .rawText(rawText)
                .summary(buildSummary(referenceMatched, amountMatched, dateDetected, successDetected, detectedDate, verified))
                .build();
    }

    private ReceiptOcrAnalysis unavailableResult(String message) {
        return ReceiptOcrAnalysis.builder()
                .available(false)
                .verified(false)
                .referenceMatched(false)
                .amountMatched(false)
                .dateDetected(false)
                .successKeywordDetected(false)
                .rawText("")
                .summary(message)
                .build();
    }

    private String runTesseractOnPdf(Path pdfPath) throws IOException, InterruptedException {
        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            if (document.getNumberOfPages() == 0) {
                throw new BusinessException("The uploaded PDF receipt is empty");
            }
            PDFRenderer renderer = new PDFRenderer(document);
            StringBuilder combinedText = new StringBuilder();
            int pagesToRead = Math.min(document.getNumberOfPages(), 2);
            for (int page = 0; page < pagesToRead; page++) {
                BufferedImage image = renderer.renderImageWithDPI(page, 220, ImageType.RGB);
                Path tempImage = Files.createTempFile("receipt-ocr-", ".png");
                try {
                    ImageIO.write(image, "png", tempImage.toFile());
                    combinedText.append(runTesseract(tempImage)).append(System.lineSeparator());
                } finally {
                    Files.deleteIfExists(tempImage);
                }
            }
            return combinedText.toString().trim();
        }
    }

    private String runTesseract(Path inputPath) throws IOException, InterruptedException {
        Path ocrInputPath = preprocessImageForOcr(inputPath);
        try {
            List<String> candidateCommands = resolveTesseractCommandCandidates();
            IOException lastException = null;
            for (String command : candidateCommands) {
                try {
                    return runTesseractCommand(command, ocrInputPath);
                } catch (IOException exception) {
                    lastException = exception;
                }
            }
            if (lastException != null) {
                throw lastException;
            }
            throw new IOException("No usable Tesseract command was found.");
        } finally {
            if (!ocrInputPath.equals(inputPath)) {
                Files.deleteIfExists(ocrInputPath);
            }
        }
    }

    private String runTesseractCommand(String command, Path ocrInputPath) throws IOException, InterruptedException {
        ProcessBuilder processBuilder = new ProcessBuilder(
                command,
                ocrInputPath.toAbsolutePath().toString(),
                "stdout",
                "-l",
                languages,
                "--psm",
                "6"
        );
        Process process = processBuilder.start();
        boolean finished = process.waitFor(Duration.ofSeconds(timeoutSeconds).toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new IOException("Tesseract OCR timed out");
        }

        byte[] stdoutBytes = process.getInputStream().readAllBytes();
        byte[] stderrBytes = process.getErrorStream().readAllBytes();
        String stdout = new String(stdoutBytes, StandardCharsets.UTF_8);
        String stderr = new String(stderrBytes, StandardCharsets.UTF_8);
        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new IOException("Tesseract OCR failed using '" + command + "': " + stderr);
        }
        return stdout;
    }

    private List<String> resolveTesseractCommandCandidates() {
        List<String> candidates = new ArrayList<>();
        if (tesseractCommand != null && !tesseractCommand.isBlank()) {
            candidates.add(tesseractCommand.trim());
        }
        String osName = System.getProperty("os.name", "").toLowerCase(Locale.ROOT);
        if (osName.contains("win") && Files.exists(WINDOWS_TESSERACT_FALLBACK_PATH)) {
            String fallback = WINDOWS_TESSERACT_FALLBACK_PATH.toString();
            if (!candidates.contains(fallback)) {
                candidates.add(fallback);
            }
        }
        return candidates;
    }

    private boolean containsExpectedAmount(String rawText, BigDecimal expectedAmount) {
        if (expectedAmount == null) {
            return false;
        }
        String text = normalizeDigits(rawText == null ? "" : rawText).toLowerCase(Locale.ROOT);
        List<String> candidates = new ArrayList<>();
        BigDecimal normalizedAmount = expectedAmount.stripTrailingZeros();
        candidates.add(normalizedAmount.toPlainString());
        candidates.add(expectedAmount.setScale(2, RoundingMode.HALF_UP).toPlainString());
        candidates.add(normalizedAmount.toPlainString().replace('.', ','));
        candidates.add(expectedAmount.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ','));
        String integerPart = expectedAmount.toBigInteger().toString();
        candidates.add(integerPart);

        for (String candidate : candidates) {
            if (text.contains(candidate.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private String detectDate(String rawText) {
        Matcher matcher = DATE_PATTERN.matcher(normalizeDigits(rawText == null ? "" : rawText));
        return matcher.find() ? matcher.group(1) : null;
    }

    private boolean containsSuccessKeyword(String normalizedText) {
        List<String> allKeywords = new ArrayList<>(DEFAULT_SUCCESS_KEYWORDS);
        allKeywords.addAll(List.of(successKeywords.split(",")));
        for (String keyword : allKeywords) {
            String normalizedKeyword = normalizeForSearch(keyword);
            if (!normalizedKeyword.isBlank() && normalizedText.contains(normalizedKeyword)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeForSearch(String value) {
        if (value == null) {
            return "";
        }
        return normalizeDigits(value)
                .toLowerCase(Locale.ROOT)
                .replace('أ', 'ا')
                .replace('إ', 'ا')
                .replace('آ', 'ا')
                .replace('ى', 'ي')
                .replace('ة', 'ه')
                .replaceAll("[^\\p{IsAlphabetic}\\p{IsDigit}]", "");
    }

    private String normalizeDigits(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace('٠', '0')
                .replace('١', '1')
                .replace('٢', '2')
                .replace('٣', '3')
                .replace('٤', '4')
                .replace('٥', '5')
                .replace('٦', '6')
                .replace('٧', '7')
                .replace('٨', '8')
                .replace('٩', '9');
    }

    private Path preprocessImageForOcr(Path inputPath) throws IOException {
        if (isPdf(inputPath)) {
            return inputPath;
        }
        BufferedImage original = ImageIO.read(inputPath.toFile());
        if (original == null) {
            return inputPath;
        }
        int targetWidth = Math.max(original.getWidth() * 2, original.getWidth());
        int targetHeight = Math.max(original.getHeight() * 2, original.getHeight());
        BufferedImage processed = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D graphics = processed.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            graphics.drawImage(original, 0, 0, targetWidth, targetHeight, null);
        } finally {
            graphics.dispose();
        }
        Path tempImage = Files.createTempFile("receipt-ocr-preprocessed-", ".png");
        ImageIO.write(processed, "png", tempImage.toFile());
        return tempImage;
    }

    private String buildSummary(
            boolean referenceMatched,
            boolean amountMatched,
            boolean dateDetected,
            boolean successDetected,
            String detectedDate,
            boolean verified
    ) {
        List<String> parts = new ArrayList<>();
        parts.add(referenceMatched ? "reference matched" : "reference not found");
        parts.add(amountMatched ? "amount matched" : "amount not found");
        parts.add(dateDetected ? "date detected: " + detectedDate : "date not detected");
        parts.add(successDetected ? "success keyword detected" : "success keyword missing");
        parts.add(verified ? "receipt auto-verified by OCR" : "receipt still requires manual admin review");
        return "OCR analysis: " + String.join(", ", parts) + ".";
    }

    private boolean isPdf(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".pdf");
    }
}
