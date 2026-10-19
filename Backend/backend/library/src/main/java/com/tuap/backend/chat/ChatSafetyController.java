package com.tuap.backend.chat;

import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.ApiErrorResponse;

@RestController
@RequestMapping("/api/chat")
public class ChatSafetyController {
    public record ReportRequest(ChatReport.Reason reason) {}
    private final ChatSafetyService safety;
    public ChatSafetyController(ChatSafetyService safety) { this.safety = safety; }
    @GetMapping("/safety/{other}")
    public ChatSafetyService.State state(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID other) {
        return safety.state(user, other);
    }
    @PutMapping("/blocks/{other}")
    public ChatSafetyService.State block(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID other) {
        return safety.block(user, other);
    }
    @DeleteMapping("/blocks/{other}")
    public ChatSafetyService.State unblock(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID other) {
        return safety.unblock(user, other);
    }
    @PostMapping("/messages/{messageId}/reports")
    public ResponseEntity<Void> report(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable UUID messageId, @RequestBody ReportRequest request) {
        safety.report(user, messageId, request.reason());
        return ResponseEntity.accepted().build();
    }
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> denied() {
        return ResponseEntity.status(403).body(new ApiErrorResponse(403, "CHAT_FORBIDDEN", "No tienes acceso a esta acción"));
    }
    @ExceptionHandler({IllegalArgumentException.class, org.springframework.http.converter.HttpMessageNotReadableException.class, org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> invalid() {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_CHAT_REQUEST", "Revisa los datos de la solicitud"));
    }
}
