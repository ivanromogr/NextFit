package com.tuap.backend.controladores;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.tuap.backend.auth.ApiErrorResponse;
import com.tuap.backend.servicios.storage.FileTooLargeException;
import com.tuap.backend.servicios.storage.InvalidFileException;
import com.tuap.backend.servicios.storage.UnsupportedFileTypeException;
import com.tuap.backend.servicios.storage.StoredFileNotFoundException;

@RestControllerAdvice(assignableTypes = UploadController.class)
public class UploadExceptionHandler {
    @ExceptionHandler(FileTooLargeException.class)
    ResponseEntity<ApiErrorResponse> fileTooLarge(FileTooLargeException exception) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "FILE_TOO_LARGE", "El archivo supera el límite permitido");
    }

    @ExceptionHandler(UnsupportedFileTypeException.class)
    ResponseEntity<ApiErrorResponse> unsupportedType(UnsupportedFileTypeException exception) {
        return error(HttpStatus.BAD_REQUEST, "UNSUPPORTED_FILE_TYPE", "Tipo de archivo no permitido");
    }

    @ExceptionHandler(InvalidFileException.class)
    ResponseEntity<ApiErrorResponse> invalidFile(InvalidFileException exception) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_FILE", "Archivo no válido");
    }

    @ExceptionHandler(UploadController.UploadPersistenceException.class)
    ResponseEntity<ApiErrorResponse> persistenceFailure(UploadController.UploadPersistenceException exception) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "UPLOAD_PERSISTENCE_FAILED", "No se pudo guardar el archivo");
    }

    @ExceptionHandler(StoredFileNotFoundException.class)
    ResponseEntity<ApiErrorResponse> fileNotFound(StoredFileNotFoundException exception) {
        return error(HttpStatus.NOT_FOUND, "FILE_NOT_FOUND", "Archivo no encontrado");
    }

    @ExceptionHandler(UploadController.UploadAccessDeniedException.class)
    ResponseEntity<ApiErrorResponse> forbidden(UploadController.UploadAccessDeniedException exception) {
        return error(HttpStatus.FORBIDDEN, "FORBIDDEN", "No tienes permiso para acceder al archivo");
    }

    private ResponseEntity<ApiErrorResponse> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new ApiErrorResponse(status.value(), code, message));
    }
}
