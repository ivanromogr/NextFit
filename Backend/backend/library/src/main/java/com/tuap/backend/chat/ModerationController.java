package com.tuap.backend.chat;

import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.ApiErrorResponse;
import com.tuap.backend.servicios.FileStorageService;
import com.tuap.backend.servicios.storage.StoredFileNotFoundException;

@RestController
@RequestMapping("/api/moderation")
public class ModerationController {
    private final ModerationService service;
    private final FileStorageService storage;
    public ModerationController(ModerationService service, FileStorageService storage) { this.service = service; this.storage = storage; }
    @GetMapping("/access")
    public ResponseEntity<Map<String, Boolean>> access(@AuthenticationPrincipal AuthenticatedUser user) { return noStore(Map.of("allowed", service.hasAccess(user))); }
    @GetMapping("/reports")
    public ResponseEntity<ModerationService.Queue> queue(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(defaultValue = "PENDING") String status, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) { return noStore(service.queue(user, status, page, size)); }
    @GetMapping("/reports/{reporter}/{message}")
    public ResponseEntity<ModerationService.Detail> detail(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID reporter, @PathVariable UUID message) {
        return noStore(service.detail(user, reporter, message));
    }
    @PostMapping("/reports/{reporter}/{message}/decisions")
    public ResponseEntity<ModerationService.Detail> decide(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID reporter,
            @PathVariable UUID message, @RequestBody ModerationService.Decision request) { return noStore(service.decide(user, reporter, message, request)); }
    @GetMapping("/reports/{reporter}/{message}/attachment")
    public ResponseEntity<Resource> attachment(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID reporter, @PathVariable UUID message) {
        var file = service.attachment(user, reporter, message);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(file.getMimeType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().filename("adjunto-denunciado").build().toString())
                .header("X-Content-Type-Options", "nosniff").body(storage.load(file.getStorageKey()));
    }
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> denied() { return error(403, "MODERATION_FORBIDDEN", "No tienes permiso para acceder a esta denuncia"); }
    @ExceptionHandler({ModerationService.NotFound.class, StoredFileNotFoundException.class})
    public ResponseEntity<ApiErrorResponse> missing() { return error(404, "REPORT_NOT_FOUND", "Denuncia o adjunto no disponible"); }
    @ExceptionHandler({ModerationService.Conflict.class, org.springframework.orm.ObjectOptimisticLockingFailureException.class})
    public ResponseEntity<ApiErrorResponse> conflict() { return error(409, "REPORT_CHANGED", "La denuncia o restricción ha cambiado. Actualiza antes de decidir"); }
    @ExceptionHandler({IllegalArgumentException.class, org.springframework.http.converter.HttpMessageNotReadableException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> invalid() { return error(400, "INVALID_MODERATION_REQUEST", "Revisa la decisión, el motivo y los filtros"); }
    private <T> ResponseEntity<T> noStore(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
    private ResponseEntity<ApiErrorResponse> error(int status, String code, String message) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(new ApiErrorResponse(status, code, message));
    }
}
