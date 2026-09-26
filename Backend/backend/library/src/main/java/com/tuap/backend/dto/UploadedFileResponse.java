package com.tuap.backend.dto;

import java.util.UUID;

import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadVisibility;
import com.tuap.backend.dominio.entidades.UploadedFile;

public record UploadedFileResponse(UUID id, String originalFilename, String mimeType, long size,
                                   UploadPurpose purpose, UploadVisibility visibility, String url) {
    public static UploadedFileResponse from(UploadedFile file) {
        return new UploadedFileResponse(file.getId(), file.getOriginalFilename(), file.getMimeType(), file.getSize(),
                file.getPurpose(), file.getVisibility(), "/api/upload/files/" + file.getId());
    }
}
