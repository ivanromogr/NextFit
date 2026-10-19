package com.tuap.backend.servicios;

import static org.junit.jupiter.api.Assertions.*;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import com.tuap.backend.config.UploadProperties;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.servicios.storage.FileTooLargeException;
import com.tuap.backend.servicios.storage.InvalidFileException;
import com.tuap.backend.servicios.storage.StoredFile;
import com.tuap.backend.servicios.storage.StoredFileNotFoundException;
import com.tuap.backend.servicios.storage.UnsupportedFileTypeException;
import com.tuap.backend.servicios.storage.CloudinaryFileStorage;
import com.tuap.backend.servicios.storage.StorageUnavailableException;
import org.springframework.beans.factory.ObjectProvider;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class FileStorageServiceTest {
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x01};
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01};
    private static final byte[] WEBP = {0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x01};

    @TempDir Path tempDir;
    private FileStorageService storage;

    @BeforeEach
    void setUp() {
        UploadProperties properties = new UploadProperties();
        properties.setStorageDirectory(tempDir.resolve("secure-uploads").toString());
        properties.setProfileImageMaxBytes(32);
        properties.setChatAttachmentMaxBytes(64);
        storage = new FileStorageService(properties);
    }

    @Test void storesValidJpegWithOpaqueContentDerivedExtension() throws IOException {
        StoredFile stored = storage.store(file("evil.exe", "image/jpeg", JPEG), UploadPurpose.PROFILE_IMAGE);
        assertTrue(stored.storageKey().matches("[0-9a-f-]{36}\\.jpg"));
        assertEquals("evil.exe", stored.sanitizedOriginalFilename());
        assertArrayEquals(JPEG, Files.readAllBytes(tempDir.resolve("secure-uploads").resolve(stored.storageKey())));
    }

    @Test void detectsPngAndWebp() {
        assertEquals("png", storage.store(file("photo.jpg", "image/png", PNG), UploadPurpose.PROFILE_IMAGE).extension());
        assertEquals("webp", storage.store(file("photo.jpg", "image/webp", WEBP), UploadPurpose.PROFILE_IMAGE).extension());
    }

    @Test void rejectsMismatchedAndUnsupportedContent() {
        assertThrows(UnsupportedFileTypeException.class, () -> storage.store(file("a.png", "image/png", JPEG), UploadPurpose.PROFILE_IMAGE));
        for (byte[] content : new byte[][] {"<svg/>".getBytes(), "<html/>".getBytes(), {0x4D, 0x5A}, {0x25, 0x50, 0x44, 0x46}}) {
            assertThrows(UnsupportedFileTypeException.class, () -> storage.store(file("bad.bin", "application/octet-stream", content), UploadPurpose.PROFILE_IMAGE));
        }
    }

    @Test void appliesPurposeSpecificSizeLimits() {
        storage.store(file("small.jpg", "image/jpeg", JPEG), UploadPurpose.PROFILE_IMAGE);
        assertThrows(FileTooLargeException.class, () -> storage.validateSize(33, UploadPurpose.PROFILE_IMAGE));
        storage.validateSize(64, UploadPurpose.CHAT_ATTACHMENT);
        assertThrows(FileTooLargeException.class, () -> storage.validateSize(65, UploadPurpose.CHAT_ATTACHMENT));
    }

    @Test void sanitizesPathLikeOriginalNamesAndRejectsMaliciousStorageKeys() {
        assertEquals("evil.jpg", storage.sanitizeOriginalFilename("../../evil.jpg"));
        assertEquals("evil.jpg", storage.sanitizeOriginalFilename("..\\..\\evil.jpg"));
        assertEquals("evil.jpg", storage.sanitizeOriginalFilename("C:\\evil.jpg"));
        assertEquals("evil.jpg", storage.sanitizeOriginalFilename("/var/tmp/evil.jpg"));
        assertThrows(InvalidFileException.class, () -> storage.load("../outside.jpg"));
        assertThrows(InvalidFileException.class, () -> storage.delete("..\\outside.jpg"));
    }

    @Test void readsDeletesAndMakesDeletionIdempotent() throws IOException {
        StoredFile stored = storage.store(file("photo.png", "image/jpeg", JPEG), UploadPurpose.CHAT_ATTACHMENT);
        try (InputStream input = storage.load(stored.storageKey()).getInputStream()) {
            assertArrayEquals(JPEG, input.readAllBytes());
        }
        storage.delete(stored.storageKey());
        storage.delete(stored.storageKey());
        assertThrows(StoredFileNotFoundException.class, () -> storage.load(stored.storageKey()));
    }

    @Test void createsDirectoryAndDoesNotUseOriginalFilenameForWriting() throws IOException {
        storage.store(file("../../evil.jpg", "image/jpeg", JPEG), UploadPurpose.PROFILE_IMAGE);
        assertTrue(Files.isDirectory(tempDir.resolve("secure-uploads")));
        try (Stream<Path> files = Files.list(tempDir.resolve("secure-uploads"))) {
            assertTrue(files.noneMatch(path -> path.getFileName().toString().equals("evil.jpg")));
        }
    }

    @Test void refusesToOverwriteAnExistingStorageKey() throws IOException {
        UploadProperties properties = new UploadProperties();
        Path directory = tempDir.resolve("collision-uploads");
        properties.setStorageDirectory(directory.toString());
        FileStorageService collidingStorage = new FileStorageService(properties) {
            @Override protected String generateStorageKey(com.tuap.backend.servicios.storage.DetectedFileType type) {
                return "fixed.jpg";
            }
        };
        Path existing = directory.resolve("fixed.jpg");
        Files.writeString(existing, "original");

        assertThrows(InvalidFileException.class,
                () -> collidingStorage.store(file("photo.jpg", "image/jpeg", JPEG), UploadPurpose.PROFILE_IMAGE));
        assertEquals("original", Files.readString(existing));
    }

    @Test @SuppressWarnings("unchecked") void remoteStorageNeverFallsBackToLocalOnFailure() {
        UploadProperties properties = new UploadProperties();
        properties.setProvider("cloudinary");
        properties.setStorageDirectory(tempDir.resolve("remote").toString());
        CloudinaryFileStorage remote = mock(CloudinaryFileStorage.class);
        ObjectProvider<CloudinaryFileStorage> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(remote);
        FileStorageService service = new FileStorageService(properties, provider);
        StoredFile result = service.store(file("photo.png", "image/png", PNG), UploadPurpose.CHAT_ATTACHMENT);
        assertTrue(result.storageKey().startsWith("cld_"));
        verify(remote).store(result.storageKey(), PNG);
        assertFalse(Files.exists(tempDir.resolve("remote").resolve(result.storageKey())));
        service.load(result.storageKey());
        service.delete(result.storageKey());
        verify(remote).load(result.storageKey());
        verify(remote).delete(result.storageKey());
        doThrow(new StorageUnavailableException()).when(remote).store(anyString(), any());
        assertThrows(StorageUnavailableException.class,
                () -> service.store(file("photo.png", "image/png", PNG), UploadPurpose.CHAT_ATTACHMENT));
        assertEquals(0, tempDir.resolve("remote").toFile().list().length);
    }

    @Test void failsClosedForMissingOrUnknownProvider() {
        UploadProperties properties = new UploadProperties();
        properties.setProvider("cloudinary");
        assertThrows(IllegalStateException.class, () -> new FileStorageService(properties));
        properties.setProvider("typo");
        assertThrows(IllegalStateException.class, () -> new FileStorageService(properties));
        assertThrows(StorageUnavailableException.class,
                () -> storage.load("cld_11111111-1111-4111-8111-111111111111.png"));
    }

    private MockMultipartFile file(String name, String contentType, byte[] content) {
        return new MockMultipartFile("file", name, contentType, content);
    }
}
