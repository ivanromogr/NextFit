package com.tuap.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class AuthExceptionHandler {

    private static final ApiErrorResponse INVALID_CREDENTIALS =
            new ApiErrorResponse(401, "INVALID_CREDENTIALS", "Credenciales no válidas");

    @ExceptionHandler(AmbiguousIdentityException.class)
    public ResponseEntity<ApiErrorResponse> ambiguousIdentity(AmbiguousIdentityException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(INVALID_CREDENTIALS);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> authenticationFailure(AuthenticationException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(INVALID_CREDENTIALS);
    }

    @ExceptionHandler(InvalidResetTokenException.class)
    public ResponseEntity<ApiErrorResponse> invalidResetToken(InvalidResetTokenException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_RESET_TOKEN", "Token de restablecimiento no válido"));
    }
    @ExceptionHandler(InvalidEmailChangeTokenException.class) public ResponseEntity<ApiErrorResponse> invalidEmailChange(InvalidEmailChangeTokenException e){return ResponseEntity.badRequest().body(new ApiErrorResponse(400,"INVALID_EMAIL_CHANGE_TOKEN","Token de cambio de correo no válido"));}

    @ExceptionHandler(InvalidCurrentPasswordException.class)
    public ResponseEntity<ApiErrorResponse> invalidCurrentPassword(InvalidCurrentPasswordException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_CURRENT_PASSWORD", "Contraseña actual incorrecta"));
    }

    @ExceptionHandler(InvalidPasswordException.class)
    public ResponseEntity<ApiErrorResponse> invalidPassword(InvalidPasswordException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_PASSWORD", "Contraseña no válida"));
    }
    @ExceptionHandler(NewPasswordMustBeDifferentException.class)
    public ResponseEntity<ApiErrorResponse> newPasswordMustBeDifferent(NewPasswordMustBeDifferentException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "NEW_PASSWORD_MUST_BE_DIFFERENT", "La nueva contraseña debe ser diferente"));
    }
    @ExceptionHandler(InvalidEmailException.class)
    public ResponseEntity<ApiErrorResponse> invalidEmail(InvalidEmailException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_EMAIL", "Email no válido"));
    }
    @ExceptionHandler(EmailAlreadyInUseException.class)
    public ResponseEntity<ApiErrorResponse> emailAlreadyInUse(EmailAlreadyInUseException exception) {
        return ResponseEntity.status(409).body(new ApiErrorResponse(409, "EMAIL_ALREADY_IN_USE", "El email ya está en uso"));
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiErrorResponse> invalidRefresh(InvalidRefreshTokenException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiErrorResponse(401, "INVALID_REFRESH_TOKEN", "Sesión no válida"));
    }

    @ExceptionHandler(InvalidClientTypeException.class)
    public ResponseEntity<ApiErrorResponse> invalidClientType(InvalidClientTypeException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_CLIENT_TYPE", "Tipo de cliente no válido"));
    }
}
