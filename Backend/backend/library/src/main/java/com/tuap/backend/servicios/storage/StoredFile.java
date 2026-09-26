package com.tuap.backend.servicios.storage;

public record StoredFile(String storageKey, String detectedMimeType, String extension, long size,
                         String sanitizedOriginalFilename) { }
