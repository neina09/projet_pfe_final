package com.backend.Projet.service;

import com.backend.Projet.exception.BusinessException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileStorageServiceTest {

    private Path tempDirectory;

    @AfterEach
    void tearDown() throws IOException {
        if (tempDirectory != null && Files.exists(tempDirectory)) {
            Files.walk(tempDirectory)
                    .sorted((left, right) -> right.compareTo(left))
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException ignored) {
                        }
                    });
        }
    }

    @Test
    void storeWorkerImageShouldAcceptValidImageContent() throws IOException {
        tempDirectory = Files.createTempDirectory("file-storage-test");
        FileStorageService service = new FileStorageService(tempDirectory.toString(), 5 * 1024 * 1024);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                createPngBytes()
        );

        String storedPath = service.storeWorkerImage(file);

        assertTrue(storedPath.startsWith("/uploads/workers/images/"));
        assertEquals(1L, Files.list(tempDirectory.resolve("workers/images")).count());
    }

    @Test
    void storeWorkerImageShouldRejectMismatchedImageContent() throws IOException {
        tempDirectory = Files.createTempDirectory("file-storage-test");
        FileStorageService service = new FileStorageService(tempDirectory.toString(), 5 * 1024 * 1024);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                "not-an-image".getBytes()
        );

        BusinessException exception = assertThrows(BusinessException.class, () -> service.storeWorkerImage(file));

        assertEquals("Invalid image file", exception.getMessage());
    }

    @Test
    void storeWorkerDocumentShouldRejectInvalidPdfContent() throws IOException {
        tempDirectory = Files.createTempDirectory("file-storage-test");
        FileStorageService service = new FileStorageService(tempDirectory.toString(), 5 * 1024 * 1024);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "document.pdf",
                "application/pdf",
                "not-a-real-pdf".getBytes()
        );

        BusinessException exception = assertThrows(BusinessException.class, () -> service.storeWorkerDocument(file));

        assertEquals("Invalid PDF file", exception.getMessage());
    }

    @Test
    void storeWorkerImageShouldRejectOversizedFiles() throws IOException {
        tempDirectory = Files.createTempDirectory("file-storage-test");
        FileStorageService service = new FileStorageService(tempDirectory.toString(), 10);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "avatar.png",
                "image/png",
                createPngBytes()
        );

        BusinessException exception = assertThrows(BusinessException.class, () -> service.storeWorkerImage(file));

        assertEquals("File exceeds the maximum allowed size", exception.getMessage());
    }

    private byte[] createPngBytes() throws IOException {
        BufferedImage image = new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        ImageIO.write(image, "png", outputStream);
        return outputStream.toByteArray();
    }
}
