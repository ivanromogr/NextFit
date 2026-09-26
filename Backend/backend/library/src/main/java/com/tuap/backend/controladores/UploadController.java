package com.tuap.backend.controladores;

import java.util.Set;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadVisibility;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.dto.UploadedFileResponse;
import com.tuap.backend.persistencia.UploadedFileDAO;
import com.tuap.backend.servicios.FileStorageService;
import com.tuap.backend.servicios.ChatAttachmentAccessService;
import com.tuap.backend.servicios.storage.StoredFile;
import com.tuap.backend.servicios.storage.StoredFileNotFoundException;

@RestController
@RequestMapping("/api/upload")
public class UploadController {
    private final FileStorageService fileStorageService;
    private final UploadedFileDAO uploadedFileDAO;
    private final ChatAttachmentAccessService chatAttachmentAccessService;

    public UploadController(FileStorageService fileStorageService, UploadedFileDAO uploadedFileDAO,
                            ChatAttachmentAccessService chatAttachmentAccessService) {
        this.fileStorageService = fileStorageService;
        this.uploadedFileDAO = uploadedFileDAO;
        this.chatAttachmentAccessService = chatAttachmentAccessService;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<UploadedFileResponse> uploadFile(@RequestParam("file") MultipartFile file,
                                                            @RequestParam("purpose") UploadPurpose purpose,
                                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        StoredFile stored = fileStorageService.store(file, purpose);
        try {
            UploadedFile metadata = new UploadedFile(
                    principal.userId(), principal.role(), purpose, visibilityFor(purpose),
                    stored.storageKey(), stored.sanitizedOriginalFilename(), stored.detectedMimeType(), stored.size());
            UploadedFile saved = uploadedFileDAO.saveAndFlush(metadata);
            return ResponseEntity.ok(UploadedFileResponse.from(saved));
        } catch (RuntimeException exception) {
            fileStorageService.delete(stored.storageKey());
            throw new UploadPersistenceException(exception);
        }
    }

    private UploadVisibility visibilityFor(UploadPurpose purpose) {
        return purpose == UploadPurpose.PROFILE_IMAGE ? UploadVisibility.PUBLIC : UploadVisibility.PRIVATE;
    }

    @GetMapping("/files/{id}")
    public ResponseEntity<Resource> getFile(@PathVariable java.util.UUID id,
                                            @AuthenticationPrincipal AuthenticatedUser principal) {
        UploadedFile metadata = uploadedFileDAO.findById(id)
                .orElseThrow(() -> new StoredFileNotFoundException("Archivo no encontrado"));
        if (metadata.getVisibility() == UploadVisibility.PRIVATE
                && (principal == null || !metadata.getOwnerId().equals(principal.userId())
                || metadata.getOwnerRole() != principal.role())
                && !chatAttachmentAccessService.canAccessAsMessageParticipant(metadata, principal)) {
            throw new UploadAccessDeniedException();
        }
        if (!Set.of("image/jpeg", "image/png", "image/webp").contains(metadata.getMimeType())) {
            throw new StoredFileNotFoundException("Archivo no disponible");
        }
        Resource resource = fileStorageService.load(metadata.getStorageKey());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(metadata.getOriginalFilename()).build().toString())
                .header("X-Content-Type-Options", "nosniff");
        if (metadata.getVisibility() == UploadVisibility.PRIVATE) response.cacheControl(CacheControl.noStore());
        return response.body(resource);
    }

    public static class UploadPersistenceException extends RuntimeException {
        UploadPersistenceException(Throwable cause) { super(cause); }
    }

    public static class UploadAccessDeniedException extends RuntimeException { }
}
