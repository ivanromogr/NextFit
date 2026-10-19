package com.tuap.backend.servicios;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.multipart.MultipartFile;

import com.tuap.backend.config.UploadProperties;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.servicios.storage.DetectedFileType;
import com.tuap.backend.servicios.storage.FileTooLargeException;
import com.tuap.backend.servicios.storage.InvalidFileException;
import com.tuap.backend.servicios.storage.StoredFile;
import com.tuap.backend.servicios.storage.StoredFileNotFoundException;
import com.tuap.backend.servicios.storage.UnsupportedFileTypeException;
import com.tuap.backend.servicios.storage.CloudinaryFileStorage;
import com.tuap.backend.servicios.storage.StorageUnavailableException;

@Service
public class FileStorageService {
    private static final int MAX_FILENAME_LENGTH = 255;
    private final UploadProperties properties;
    private final Path baseDirectory;
    private final CloudinaryFileStorage remote;

    public FileStorageService(UploadProperties properties) {
        this(properties, (CloudinaryFileStorage) null);
    }

    @Autowired
    public FileStorageService(UploadProperties properties, ObjectProvider<CloudinaryFileStorage> remote) {
        this(properties, remote.getIfAvailable());
    }

    private FileStorageService(UploadProperties properties, CloudinaryFileStorage remote) {
        if (!"local".equals(properties.getProvider()) && !"cloudinary".equals(properties.getProvider())) {
            throw new IllegalStateException("Proveedor de almacenamiento no soportado");
        }
        if ("cloudinary".equals(properties.getProvider()) && remote == null) {
            throw new IllegalStateException("El almacenamiento remoto no está configurado");
        }
        if (properties.getProfileImageMaxBytes() <= 0 || properties.getChatAttachmentMaxBytes() <= 0
                || properties.getProfileImageMaxBytes() >= Integer.MAX_VALUE
                || properties.getChatAttachmentMaxBytes() >= Integer.MAX_VALUE) {
            throw new IllegalStateException("Límites de almacenamiento no válidos");
        }
        this.properties = properties;
        this.remote = remote;
        try {
            this.baseDirectory = Path.of(properties.getStorageDirectory()).toAbsolutePath().normalize();
            Files.createDirectories(baseDirectory);
        } catch (IOException | InvalidFileException exception) {
            throw new InvalidFileException("No se pudo inicializar el directorio de almacenamiento", exception);
        }
    }

    public StoredFile store(MultipartFile file, UploadPurpose purpose) {
        validateFile(file, purpose);
        byte[] content = readContent(file, purpose);
        DetectedFileType type = detect(content);
        validateDeclaredMimeType(file.getContentType(), type);

        String storageKey = generateStorageKey(type);
        if (remote != null) {
            storageKey = "cld_" + storageKey;
            remote.store(storageKey, content);
            return new StoredFile(storageKey, type.getMimeType(), type.getExtension(), content.length,
                    sanitizeOriginalFilename(file.getOriginalFilename()));
        }
        Path destination = resolveStorageKey(storageKey);
        try {
            Files.write(destination, content, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        } catch (IOException exception) {
            throw new InvalidFileException("No se pudo guardar el archivo", exception);
        }
        return new StoredFile(storageKey, type.getMimeType(), type.getExtension(), content.length,
                sanitizeOriginalFilename(file.getOriginalFilename()));
    }

    public Resource load(String storageKey) {
        if (CloudinaryFileStorage.isRemoteKey(storageKey)) return requireRemote().load(storageKey);
        Path file = resolveStorageKey(storageKey);
        if (!Files.exists(file, LinkOption.NOFOLLOW_LINKS) || !Files.isRegularFile(file, LinkOption.NOFOLLOW_LINKS)
                || Files.isSymbolicLink(file)) {
            throw new StoredFileNotFoundException("Archivo almacenado no encontrado");
        }
        try {
            return new UrlResource(file.toUri());
        } catch (IOException exception) {
            throw new StoredFileNotFoundException("Archivo almacenado no disponible");
        }
    }

    public void delete(String storageKey) {
        if (CloudinaryFileStorage.isRemoteKey(storageKey)) {
            requireRemote().delete(storageKey);
            return;
        }
        Path file = resolveStorageKey(storageKey);
        try {
            if (Files.exists(file, LinkOption.NOFOLLOW_LINKS) && !Files.isSymbolicLink(file)) {
                Files.deleteIfExists(file);
            }
        } catch (IOException exception) {
            throw new InvalidFileException("No se pudo borrar el archivo almacenado", exception);
        }
    }

    public String sanitizeOriginalFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) return "upload";
        String basename = originalFilename.replace('\\', '/');
        basename = basename.substring(basename.lastIndexOf('/') + 1);
        basename = basename.replaceAll("[\\p{Cntrl}]", "").strip();
        if (basename.isBlank()) return "upload";
        return basename.length() > MAX_FILENAME_LENGTH ? basename.substring(0, MAX_FILENAME_LENGTH) : basename;
    }

    protected String generateStorageKey(DetectedFileType type) {
        return UUID.randomUUID() + "." + type.getExtension();
    }

    private void validateFile(MultipartFile file, UploadPurpose purpose) {
        if (file == null || file.isEmpty() || file.getSize() <= 0) {
            throw new InvalidFileException("El archivo es obligatorio y no puede estar vacío");
        }
        validateSize(file.getSize(), purpose);
    }

    public void validateSize(long size, UploadPurpose purpose) {
        if (purpose == null) throw new InvalidFileException("El propósito de la subida es obligatorio");
        long maximum = purpose == UploadPurpose.PROFILE_IMAGE
                ? properties.getProfileImageMaxBytes() : properties.getChatAttachmentMaxBytes();
        if (size > maximum) throw new FileTooLargeException("El archivo supera el límite permitido");
    }

    private byte[] readContent(MultipartFile file, UploadPurpose purpose) {
        try (InputStream input = file.getInputStream()) {
            long maximum = purpose == UploadPurpose.PROFILE_IMAGE
                    ? properties.getProfileImageMaxBytes() : properties.getChatAttachmentMaxBytes();
            byte[] content = input.readNBytes(Math.toIntExact(maximum + 1));
            if (content.length == 0) throw new InvalidFileException("El archivo no contiene datos");
            validateSize(content.length, purpose);
            return content;
        } catch (IOException exception) {
            throw new InvalidFileException("No se pudo leer el archivo", exception);
        }
    }

    private DetectedFileType detect(byte[] content) {
        if (startsWith(content, 0xFF, 0xD8, 0xFF)) return DetectedFileType.JPEG;
        if (startsWith(content, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return DetectedFileType.PNG;
        if (startsWith(content, 0x52, 0x49, 0x46, 0x46) && content.length >= 12
                && content[8] == 0x57 && content[9] == 0x45 && content[10] == 0x42 && content[11] == 0x50) {
            return DetectedFileType.WEBP;
        }
        throw new UnsupportedFileTypeException("Tipo de archivo no permitido");
    }

    private boolean startsWith(byte[] content, int... prefix) {
        if (content.length < prefix.length) return false;
        for (int index = 0; index < prefix.length; index++) {
            if ((content[index] & 0xFF) != prefix[index]) return false;
        }
        return true;
    }

    private void validateDeclaredMimeType(String declaredMimeType, DetectedFileType type) {
        if (declaredMimeType == null || !type.getMimeType().equals(declaredMimeType.toLowerCase(Locale.ROOT).trim())) {
            throw new UnsupportedFileTypeException("El MIME declarado no coincide con el contenido del archivo");
        }
    }

    private Path resolveStorageKey(String storageKey) {
        if (storageKey == null || storageKey.isBlank() || storageKey.contains("\\")) throw new InvalidFileException("Storage key inválida");
        Path destination = baseDirectory.resolve(storageKey).normalize();
        if (!destination.startsWith(baseDirectory) || destination.getParent() == null
                || !destination.getParent().equals(baseDirectory)) {
            throw new InvalidFileException("Storage key fuera del directorio permitido");
        }
        return destination;
    }

    private CloudinaryFileStorage requireRemote() {
        if (remote == null) throw new StorageUnavailableException();
        return remote;
    }
}
