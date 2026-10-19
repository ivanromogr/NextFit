package com.tuap.backend.controladores;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import com.tuap.backend.auth.ApiErrorResponse;
import com.tuap.backend.servicios.storage.StorageUnavailableException;

/** Includes uploads, moderation, profile replacement and account deletion. */
@RestControllerAdvice
public class StorageExceptionHandler {
    @ExceptionHandler(StorageUnavailableException.class)
    public ResponseEntity<ApiErrorResponse> unavailable() {
        return ResponseEntity.status(503).cacheControl(CacheControl.noStore())
                .body(new ApiErrorResponse(503, "STORAGE_UNAVAILABLE", "Almacenamiento temporalmente no disponible"));
    }
}
