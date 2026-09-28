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
    @ExceptionHandler({AuthIdentityConflictException.class,LastAuthIdentityException.class}) public ResponseEntity<ApiErrorResponse> identityChange(RuntimeException e){return ResponseEntity.badRequest().body(new ApiErrorResponse(400,"INVALID_AUTH_IDENTITY_CHANGE","Cambio de método de acceso no válido"));}

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

    @ExceptionHandler(GoogleAuthDisabledException.class)
    public ResponseEntity<ApiErrorResponse> googleDisabled(GoogleAuthDisabledException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiErrorResponse(503, "GOOGLE_AUTH_DISABLED", "La autenticación con Google no está disponible"));
    }

    @ExceptionHandler(InvalidGoogleTokenException.class)
    public ResponseEntity<ApiErrorResponse> invalidGoogleToken(InvalidGoogleTokenException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(401, "INVALID_GOOGLE_TOKEN", "La credencial de Google no es válida"));
    }

    @ExceptionHandler(GoogleEmailNotVerifiedException.class)
    public ResponseEntity<ApiErrorResponse> unverifiedGoogleEmail(GoogleEmailNotVerifiedException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(401, "GOOGLE_EMAIL_NOT_VERIFIED", "El email de Google debe estar verificado"));
    }

    @ExceptionHandler(GoogleAccountInactiveException.class)
    public ResponseEntity<ApiErrorResponse> inactiveGoogleAccount(GoogleAccountInactiveException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(401, "ACCOUNT_INACTIVE", "La cuenta no está activa"));
    }
}
