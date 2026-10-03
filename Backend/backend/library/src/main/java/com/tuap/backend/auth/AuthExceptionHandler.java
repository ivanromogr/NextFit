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
    @ExceptionHandler(PasswordPolicyViolationException.class)
    public ResponseEntity<ApiErrorResponse> passwordPolicy(PasswordPolicyViolationException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "PASSWORD_POLICY_VIOLATION", "La contraseña no cumple la política de seguridad"));
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

    @ExceptionHandler(InvalidAppleTokenException.class)
    public ResponseEntity<ApiErrorResponse> invalidAppleToken(InvalidAppleTokenException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(401, "INVALID_APPLE_TOKEN", "La credencial de Apple no es válida"));
    }

    @ExceptionHandler(AppleAuthDisabledException.class)
    public ResponseEntity<ApiErrorResponse> appleDisabled(AppleAuthDisabledException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(new ApiErrorResponse(503, "APPLE_AUTH_DISABLED", "La autenticación con Apple no está disponible"));
    }

    @ExceptionHandler(AppleAccountInactiveException.class)
    public ResponseEntity<ApiErrorResponse> inactiveAppleAccount(AppleAccountInactiveException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(401, "APPLE_ACCOUNT_INACTIVE", "La cuenta no está activa"));
    }

    @ExceptionHandler(InvalidPendingSocialAuthException.class)
    public ResponseEntity<ApiErrorResponse> invalidPendingSocialAuth(InvalidPendingSocialAuthException exception) {
        return ResponseEntity.badRequest()
                .body(new ApiErrorResponse(400, "INVALID_PENDING_SOCIAL_AUTH", "Registro social pendiente no válido"));
    }

    @ExceptionHandler(SocialProviderMismatchException.class)
    public ResponseEntity<ApiErrorResponse> socialProviderMismatch(SocialProviderMismatchException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "SOCIAL_PROVIDER_MISMATCH", "El registro social no corresponde al proveedor solicitado"));
    }

    @ExceptionHandler(SocialEmailRequiredException.class)
    public ResponseEntity<ApiErrorResponse> socialEmailRequired(SocialEmailRequiredException exception) {
        return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "SOCIAL_EMAIL_REQUIRED", "El proveedor no ha proporcionado un email válido"));
    }

    @ExceptionHandler(SocialIdentityAlreadyLinkedException.class)
    public ResponseEntity<ApiErrorResponse> socialIdentityAlreadyLinked(SocialIdentityAlreadyLinkedException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(409, "SOCIAL_IDENTITY_ALREADY_LINKED", "La identidad social ya está vinculada"));
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

    @ExceptionHandler(AccountInactiveException.class)
    public ResponseEntity<ApiErrorResponse> inactiveCurrentAccount(AccountInactiveException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiErrorResponse(401, "ACCOUNT_INACTIVE", "La cuenta no está activa"));
    }
    @ExceptionHandler(InvalidReauthenticationTokenException.class) public ResponseEntity<ApiErrorResponse> invalidReauth(InvalidReauthenticationTokenException e){return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ApiErrorResponse(401,"INVALID_REAUTH_TOKEN","Reautenticación no válida"));}
    @ExceptionHandler(LocalIdentityNotAvailableException.class) public ResponseEntity<ApiErrorResponse> noLocal(LocalIdentityNotAvailableException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(409,"LOCAL_IDENTITY_NOT_AVAILABLE","La cuenta no dispone de acceso local"));}
    @ExceptionHandler(IdentityNotLinkedException.class) public ResponseEntity<ApiErrorResponse> notLinked(IdentityNotLinkedException e){return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiErrorResponse(404,"IDENTITY_NOT_LINKED","La identidad no está vinculada"));}
    @ExceptionHandler(CannotUnlinkLastIdentityException.class) public ResponseEntity<ApiErrorResponse> lastIdentity(CannotUnlinkLastIdentityException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(409,"CANNOT_UNLINK_LAST_IDENTITY","No se puede eliminar el último método de acceso"));}
    @ExceptionHandler(LocalIdentityAlreadyExistsException.class) public ResponseEntity<ApiErrorResponse> localExists(LocalIdentityAlreadyExistsException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(409,"LOCAL_IDENTITY_ALREADY_EXISTS","La cuenta ya dispone de acceso local"));}
    @ExceptionHandler(LocalEmailRequiredException.class) public ResponseEntity<ApiErrorResponse> localEmailRequired(LocalEmailRequiredException e){return ResponseEntity.badRequest().body(new ApiErrorResponse(400,"LOCAL_EMAIL_REQUIRED","Se requiere un correo para crear acceso local"));}
    @ExceptionHandler(LocalEmailNotVerifiedException.class) public ResponseEntity<ApiErrorResponse> localEmailVerified(LocalEmailNotVerifiedException e){return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiErrorResponse(409,"LOCAL_EMAIL_NOT_VERIFIED","El correo debe estar verificado"));}
}
