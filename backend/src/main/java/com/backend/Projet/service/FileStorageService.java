package com.backend.Projet.service;

import com.backend.Projet.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.net.MalformedURLException;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_DOCUMENT_EXTENSIONS = Set.of("jpg", "jpeg", "png", "pdf");
    private static final Set<String> ALLOWED_IMAGE_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );
    private static final Set<String> ALLOWED_DOCUMENT_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "application/pdf"
    );

    private final Path uploadRoot;
    private final long maxUploadBytes;

    public FileStorageService(
            @Value("${app.storage.upload-dir:uploads}") String uploadDir,
            @Value("${app.storage.max-upload-bytes:5242880}") long maxUploadBytes
    ) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
        this.maxUploadBytes = maxUploadBytes;
    }

    public String storeWorkerImage(MultipartFile file) {
        return store(file, "workers/images", ALLOWED_IMAGE_EXTENSIONS);
    }

    public String storeUserImage(MultipartFile file) {
        return store(file, "users/images", ALLOWED_IMAGE_EXTENSIONS);
    }

    public String storeWorkerDocument(MultipartFile file) {
        return store(file, "workers/documents", ALLOWED_DOCUMENT_EXTENSIONS);
    }

    public Path getUploadRoot() {
        return uploadRoot;
    }

    public Path resolveStoredPath(String storedPath) {
        if (storedPath == null || storedPath.isBlank() || !storedPath.startsWith("/uploads/")) {
            throw new BusinessException("Invalid stored file path");
        }

        String relativePath = storedPath.substring("/uploads/".length());
        Path resolvedPath = uploadRoot.resolve(relativePath).normalize();
        if (!resolvedPath.startsWith(uploadRoot)) {
            throw new BusinessException("Invalid stored file path");
        }
        return resolvedPath;
    }

    public Resource loadAsResource(String storedPath) {
        Path path = resolveStoredPath(storedPath);
        if (!Files.isRegularFile(path)) {
            throw new BusinessException("Stored file not found");
        }

        try {
            return new UrlResource(path.toUri());
        } catch (MalformedURLException exception) {
            throw new BusinessException("Stored file is not accessible");
        }
    }

    public String detectContentType(String storedPath) {
        Path path = resolveStoredPath(storedPath);
        try {
            String contentType = Files.probeContentType(path);
            return contentType == null ? "application/octet-stream" : contentType;
        } catch (IOException exception) {
            return "application/octet-stream";
        }
    }

    public void deleteStoredFile(String storedPath) {
        if (storedPath == null || storedPath.isBlank()) {
            return;
        }

        Path path = resolveStoredPath(storedPath);
        try {
            Files.deleteIfExists(path);
        } catch (NoSuchFileException exception) {
            // File is already gone, so there is nothing left to clean up.
        } catch (IOException exception) {
            throw new BusinessException("Failed to delete stored file");
        }
    }

    private String store(MultipartFile file, String subDirectory, Set<String> allowedExtensions) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("File is required");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        if (originalFilename.contains("..")) {
            throw new BusinessException("Invalid file name");
        }
        String extension = getExtension(originalFilename);
        if (!allowedExtensions.contains(extension)) {
            throw new BusinessException("Unsupported file type");
        }
        if (file.getSize() > maxUploadBytes) {
            throw new BusinessException("File exceeds the maximum allowed size");
        }

        try {
            byte[] fileBytes = file.getBytes();
            if (fileBytes.length > maxUploadBytes) {
                throw new BusinessException("File exceeds the maximum allowed size");
            }
            validateFileContent(fileBytes, extension, file.getContentType(), allowedExtensions);

            Path targetDirectory = uploadRoot.resolve(subDirectory).normalize();
            Files.createDirectories(targetDirectory);

            String filename = UUID.randomUUID() + "." + extension;
            Path targetFile = targetDirectory.resolve(filename).normalize();
            if (!targetFile.startsWith(targetDirectory)) {
                throw new BusinessException("Invalid file path");
            }

            try (InputStream inputStream = new ByteArrayInputStream(fileBytes)) {
                Files.copy(inputStream, targetFile, StandardCopyOption.REPLACE_EXISTING);
            }

            return "/uploads/" + uploadRoot.relativize(targetFile).toString().replace('\\', '/');
        } catch (IOException exception) {
            throw new BusinessException("Failed to store file");
        }
    }

    private void validateFileContent(byte[] fileBytes, String extension, String contentType, Set<String> allowedExtensions) {
        String normalizedContentType = contentType == null ? "" : contentType.toLowerCase();
        boolean isDocumentUpload = allowedExtensions.equals(ALLOWED_DOCUMENT_EXTENSIONS);

        if (isPdf(extension)) {
            if (!ALLOWED_DOCUMENT_CONTENT_TYPES.contains(normalizedContentType)) {
                throw new BusinessException("Unsupported file content type");
            }
            validatePdf(fileBytes);
            return;
        }

        if (isDocumentUpload && !ALLOWED_DOCUMENT_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new BusinessException("Unsupported file content type");
        }
        if (!isDocumentUpload && !ALLOWED_IMAGE_CONTENT_TYPES.contains(normalizedContentType)) {
            throw new BusinessException("Unsupported file content type");
        }

        validateImage(fileBytes);
    }

    private void validateImage(byte[] fileBytes) {
        try (ByteArrayInputStream imageStream = new ByteArrayInputStream(fileBytes)) {
            BufferedImage image = ImageIO.read(imageStream);
            if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                throw new BusinessException("Invalid image file");
            }
            if (image.getWidth() > 5000 || image.getHeight() > 5000) {
                throw new BusinessException("Image dimensions exceed the maximum allowed size");
            }
        } catch (IOException exception) {
            throw new BusinessException("Invalid image file");
        }
    }

    private void validatePdf(byte[] fileBytes) {
        if (fileBytes.length < 5) {
            throw new BusinessException("Invalid PDF file");
        }

        String header = new String(fileBytes, 0, 5, StandardCharsets.US_ASCII);
        if (!header.startsWith("%PDF-")) {
            throw new BusinessException("Invalid PDF file");
        }
    }

    private boolean isPdf(String extension) {
        return "pdf".equals(extension);
    }

    private String getExtension(String filename) {
        int lastDot = filename.lastIndexOf('.');
        if (lastDot < 0 || lastDot == filename.length() - 1) {
            throw new BusinessException("File extension is required");
        }
        return filename.substring(lastDot + 1).toLowerCase();
    }
}
