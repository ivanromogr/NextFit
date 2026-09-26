package com.tuap.backend.servicios.storage;

public enum DetectedFileType {
    JPEG("image/jpeg", "jpg"),
    PNG("image/png", "png"),
    WEBP("image/webp", "webp");

    private final String mimeType;
    private final String extension;

    DetectedFileType(String mimeType, String extension) {
        this.mimeType = mimeType;
        this.extension = extension;
    }

    public String getMimeType() { return mimeType; }
    public String getExtension() { return extension; }
}
