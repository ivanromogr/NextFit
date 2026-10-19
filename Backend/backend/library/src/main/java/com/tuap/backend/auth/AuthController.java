package com.tuap.backend.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.http.ResponseCookie;
import org.springframework.beans.factory.annotation.Value;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;
    private final RefreshTokenService refreshTokenService;
    private final RefreshTokenProperties refreshProperties;
    private final EmailChangeService emailChangeService;
    private final AccountDeletionService accountDeletionService;
    @org.springframework.beans.factory.annotation.Autowired private AuthIdentityService authIdentityService;
    @org.springframework.beans.factory.annotation.Autowired private GoogleAuthenticationService googleAuthenticationService;
    @org.springframework.beans.factory.annotation.Autowired private GoogleOnboardingService googleOnboardingService;
    @org.springframework.beans.factory.annotation.Autowired private AppleAuthenticationService appleAuthenticationService;
    @org.springframework.beans.factory.annotation.Autowired private SocialOnboardingService socialOnboardingService;
    @org.springframework.beans.factory.annotation.Autowired private AuthIdentityLinkService authIdentityLinkService;
    @org.springframework.beans.factory.annotation.Autowired private GoogleTokenVerifier googleTokenVerifier;
    @org.springframework.beans.factory.annotation.Autowired private AppleTokenVerifier appleTokenVerifier;
    @org.springframework.beans.factory.annotation.Autowired private GoogleAuthProperties googleAuthProperties;
    @org.springframework.beans.factory.annotation.Autowired private AppleAuthProperties appleAuthProperties;
    @org.springframework.beans.factory.annotation.Autowired private ReauthenticationService reauthenticationService;
    @org.springframework.beans.factory.annotation.Autowired private AuthIdentityUnlinkService authIdentityUnlinkService;
    @org.springframework.beans.factory.annotation.Autowired private LocalIdentityCreationService localIdentityCreationService;
    @Value("${app.cors.allowed-origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    public AuthController(AuthService authService, JwtService jwtService, PasswordResetService passwordResetService,
            RefreshTokenService refreshTokenService, RefreshTokenProperties refreshProperties, EmailChangeService emailChangeService, AccountDeletionService accountDeletionService) {
        this.authService = authService;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
        this.refreshTokenService = refreshTokenService;
        this.refreshProperties = refreshProperties;
        this.emailChangeService = emailChangeService;
        this.accountDeletionService = accountDeletionService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody(required = false) LoginRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader) {
        if (request == null || !request.hasCredentials()) {
            return ResponseEntity.badRequest()
                    .body(new ApiErrorResponse(400, "INVALID_REQUEST", "Email y contraseña son obligatorios"));
        }

        AuthenticatedUser user = authService.authenticate(request.email(), request.password());
        return loginResponse(user, ClientType.fromHeader(clientTypeHeader));
    }

    @PostMapping("/google")
    public ResponseEntity<?> google(@RequestBody(required = false) GoogleAuthRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader) {
        GoogleAuthenticationResult result = googleAuthenticationService.authenticate(request);
        if (result.authenticated()) {
            return loginResponse(result.user(), ClientType.fromHeader(clientTypeHeader));
        }
        return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store").body(result.socialResponse());
    }
    @PostMapping("/apple") public ResponseEntity<?> apple(@RequestBody(required=false) AppleAuthRequest request,@RequestHeader(value="X-Client-Type",required=false) String type){GoogleAuthenticationResult result=appleAuthenticationService.authenticate(request);return result.authenticated()?loginResponse(result.user(),ClientType.fromHeader(type)):ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL,"no-store").body(result.socialResponse());}

    @PostMapping("/google/onboarding")
    public ResponseEntity<?> completeGoogleOnboarding(@RequestBody(required = false) GoogleOnboardingRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader) {
        return loginResponse(googleOnboardingService.complete(request), ClientType.fromHeader(clientTypeHeader));
    }

    @PostMapping("/apple/onboarding")
    public ResponseEntity<?> completeAppleOnboarding(@RequestBody(required = false) AppleOnboardingRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader) {
        return loginResponse(socialOnboardingService.complete(AuthProvider.APPLE, request == null ? null : request.asSocialRequest()),
                ClientType.fromHeader(clientTypeHeader));
    }

    @PostMapping("/identities/google/link")
    public ResponseEntity<AuthIdentityLinkResponse> linkGoogleIdentity(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required = false) GoogleIdentityLinkRequest request) {
        if (!googleAuthProperties.isEnabled()) throw new GoogleAuthDisabledException();
        VerifiedGoogleIdentity google = googleTokenVerifier.verify(request == null ? null : request.credential());
        if (!google.emailVerified() || google.email() == null || google.email().isBlank()) {
            throw new GoogleEmailNotVerifiedException();
        }
        return ResponseEntity.ok(authIdentityLinkService.linkExternalIdentity(user, VerifiedSocialIdentity.fromGoogle(google)));
    }

    @PostMapping("/identities/apple/link")
    public ResponseEntity<AuthIdentityLinkResponse> linkAppleIdentity(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required = false) AppleAuthRequest request) {
        if (!appleAuthProperties.isEnabled()) throw new AppleAuthDisabledException();
        VerifiedAppleIdentity apple = appleTokenVerifier.verify(request == null ? null : request.identityToken(),
                request == null ? null : request.nonce());
        return ResponseEntity.ok(authIdentityLinkService.linkExternalIdentity(user, VerifiedSocialIdentity.fromApple(apple)));
    }

    @PostMapping("/identities/reauth/password")
    public ResponseEntity<ReauthTokenResponse> reauthPassword(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required=false) ReauthPasswordRequest request) {
        return ResponseEntity.ok(reauthenticationService.password(user, request == null ? null : request.password(), request == null ? null : request.targetProvider()));
    }
    @PostMapping("/identities/reauth/google")
    public ResponseEntity<ReauthTokenResponse> reauthGoogle(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required=false) ReauthGoogleRequest request) {
        if (!googleAuthProperties.isEnabled()) throw new GoogleAuthDisabledException();
        VerifiedGoogleIdentity google=googleTokenVerifier.verify(request==null?null:request.credential());
        if(!google.emailVerified()||google.email()==null||google.email().isBlank())throw new GoogleEmailNotVerifiedException();
        return ResponseEntity.ok(reauthenticationService.provider(user,VerifiedSocialIdentity.fromGoogle(google),request==null?null:request.targetProvider()));
    }
    @PostMapping("/identities/reauth/apple")
    public ResponseEntity<ReauthTokenResponse> reauthApple(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required=false) ReauthAppleRequest request) {
        if (!appleAuthProperties.isEnabled()) throw new AppleAuthDisabledException();
        VerifiedAppleIdentity apple=appleTokenVerifier.verify(request==null?null:request.identityToken(),request==null?null:request.nonce());
        return ResponseEntity.ok(reauthenticationService.provider(user,VerifiedSocialIdentity.fromApple(apple),request==null?null:request.targetProvider()));
    }
    @PostMapping("/identities/local/reauth/google") public ResponseEntity<ReauthTokenResponse> reauthGoogleForLocal(@AuthenticationPrincipal AuthenticatedUser user,@RequestBody(required=false) GoogleIdentityLinkRequest request){if(!googleAuthProperties.isEnabled())throw new GoogleAuthDisabledException();VerifiedGoogleIdentity google=googleTokenVerifier.verify(request==null?null:request.credential());if(!google.emailVerified()||!sameEmail(user,google.email()))throw new LocalEmailNotVerifiedException();return ResponseEntity.ok(reauthenticationService.providerForCreateLocal(user,VerifiedSocialIdentity.fromGoogle(google)));}
    @PostMapping("/identities/local/reauth/apple") public ResponseEntity<ReauthTokenResponse> reauthAppleForLocal(@AuthenticationPrincipal AuthenticatedUser user,@RequestBody(required=false) AppleAuthRequest request){if(!appleAuthProperties.isEnabled())throw new AppleAuthDisabledException();VerifiedAppleIdentity apple=appleTokenVerifier.verify(request==null?null:request.identityToken(),request==null?null:request.nonce());if(!apple.emailVerified()||!sameEmail(user,apple.email()))throw new LocalEmailNotVerifiedException();return ResponseEntity.ok(reauthenticationService.providerForCreateLocal(user,VerifiedSocialIdentity.fromApple(apple)));}
    @PostMapping("/identities/local") public ResponseEntity<AuthIdentityLinkResponse> createLocal(@AuthenticationPrincipal AuthenticatedUser user,@RequestBody(required=false) LocalIdentityCreationRequest request){return ResponseEntity.ok(localIdentityCreationService.create(user,request));}
    @DeleteMapping("/identities/google") public ResponseEntity<?> unlinkGoogle(@AuthenticationPrincipal AuthenticatedUser user,@RequestBody(required=false) ReauthTokenRequest request){authIdentityUnlinkService.unlink(user,AuthProvider.GOOGLE,request==null?null:request.reauthToken());return ResponseEntity.noContent().build();}
    @DeleteMapping("/identities/apple") public ResponseEntity<?> unlinkApple(@AuthenticationPrincipal AuthenticatedUser user,@RequestBody(required=false) ReauthTokenRequest request){authIdentityUnlinkService.unlink(user,AuthProvider.APPLE,request==null?null:request.reauthToken());return ResponseEntity.noContent().build();}

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestHeader(value = "Origin", required = false) String origin,
            @CookieValue(value = "${refresh-token.cookie-name:nextfit_refresh}", required = false) String webToken,
            @RequestBody(required = false) RefreshTokenRequest request) {
        ClientType type = ClientType.fromHeader(clientTypeHeader);
        requireAllowedWebOrigin(type, origin);
        String raw = type == ClientType.WEB ? webToken : request == null ? null : request.refreshToken();
        RefreshTokenService.Rotation rotation = refreshTokenService.rotate(raw, type);
        return loginResponse(rotation.user(), type, rotation.issuedToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(@RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestHeader(value = "Origin", required = false) String origin,
            @CookieValue(value = "${refresh-token.cookie-name:nextfit_refresh}", required = false) String webToken,
            @RequestBody(required = false) RefreshTokenRequest request) {
        ClientType type = ClientType.fromHeader(clientTypeHeader);
        requireAllowedWebOrigin(type, origin);
        refreshTokenService.revoke(type == ClientType.WEB ? webToken : request == null ? null : request.refreshToken());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store");
        if (type == ClientType.WEB) response.header(org.springframework.http.HttpHeaders.SET_COOKIE, deleteCookie().toString());
        return response.body(java.util.Map.of("message", "Sesión cerrada"));
    }

    private ResponseEntity<LoginResponse> loginResponse(AuthenticatedUser user, ClientType type) {
        return loginResponse(user, type, refreshTokenService.issue(user, type));
    }
    private ResponseEntity<LoginResponse> loginResponse(AuthenticatedUser user, ClientType type, RefreshTokenService.IssuedToken refresh) {
        String access = jwtService.generateAccessToken(user);
        LoginResponse body = type == ClientType.MOBILE
                ? LoginResponse.mobile(user, access, jwtService.getAccessTokenTtlSeconds(), refresh.rawToken())
                : LoginResponse.from(user, access, jwtService.getAccessTokenTtlSeconds());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store");
        if (type == ClientType.WEB) response.header(org.springframework.http.HttpHeaders.SET_COOKIE, refreshCookie(refresh.rawToken()).toString());
        return response.body(body);
    }
    private ResponseCookie refreshCookie(String value) { return ResponseCookie.from(refreshProperties.getCookieName(), value)
            .httpOnly(true).secure(refreshProperties.isCookieSecure()).sameSite(refreshProperties.getCookieSameSite())
            .path(refreshProperties.getCookiePath()).maxAge(java.time.Duration.ofDays(refreshProperties.getTtlDays())).build(); }
    private ResponseCookie deleteCookie() { return ResponseCookie.from(refreshProperties.getCookieName(), "").httpOnly(true)
            .secure(refreshProperties.isCookieSecure()).sameSite(refreshProperties.getCookieSameSite()).path(refreshProperties.getCookiePath()).maxAge(0).build(); }
    private void requireAllowedWebOrigin(ClientType type, String origin) {
        if (type != ClientType.WEB) return;
        boolean allowed = origin != null && !origin.isBlank() && java.util.Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).anyMatch(origin::equals);
        if (!allowed) throw new InvalidRefreshTokenException();
    }
    private boolean sameEmail(AuthenticatedUser user,String email){return user!=null&&email!=null&&!email.isBlank()&&user.email()!=null&&user.email().trim().equalsIgnoreCase(email.trim());}

    @PostMapping("/password/forgot")
    public ResponseEntity<?> forgotPassword(@RequestBody(required = false) ForgotPasswordRequest request) {
        passwordResetService.requestReset(request == null ? null : request.email());
        return ResponseEntity.ok(java.util.Map.of("message", "Si existe una cuenta asociada, se han enviado instrucciones para restablecer la contraseña"));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<?> resetPassword(@RequestBody(required = false) ResetPasswordRequest request) {
        if (request == null || !PasswordResetService.isValidPassword(request.newPassword())) {
            return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_PASSWORD", "Contraseña no válida"));
        }
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(java.util.Map.of("message", "Contraseña restablecida correctamente"));
    }

    @PutMapping("/password")
    public ResponseEntity<?> changePassword(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestBody(required = false) ChangePasswordRequest request) {
        if (request == null || !PasswordResetService.isValidPassword(request.newPassword())) {
            return ResponseEntity.badRequest().body(new ApiErrorResponse(400, "INVALID_PASSWORD", "Contraseña no válida"));
        }
        passwordResetService.changePassword(user, request.currentPassword(), request.newPassword());
        return ResponseEntity.ok(java.util.Map.of("message", "Contraseña actualizada correctamente"));
    }

    @PutMapping("/email")
    public ResponseEntity<?> changeEmail(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestBody(required = false) ChangeEmailRequest request) {
        if (request == null) throw new InvalidEmailException();
        emailChangeService.request(user, request.currentPassword(), request.newEmail());
        return ResponseEntity.ok(java.util.Map.of("message", "Te hemos enviado un enlace de confirmación al nuevo correo"));
    }
    @PostMapping("/email/confirm") public ResponseEntity<?> confirmEmail(@RequestBody(required=false) java.util.Map<String,String> request,@RequestHeader(value="X-Client-Type",required=false) String clientTypeHeader){EmailChangeService.Result result=emailChangeService.confirm(request==null?null:request.get("token"),ClientType.fromHeader(clientTypeHeader));return loginResponse(result.user(),ClientType.fromHeader(clientTypeHeader),result.refresh());}
    @GetMapping("/sessions")
    public ResponseEntity<?> sessions(@AuthenticationPrincipal AuthenticatedUser user) { return ResponseEntity.ok(refreshTokenService.activeSessions(user)); }
    @GetMapping("/identities") public ResponseEntity<?> identities(@AuthenticationPrincipal AuthenticatedUser user){return ResponseEntity.ok(authIdentityService.listIdentities(user));}
    @DeleteMapping("/sessions/{familyId}")
    public ResponseEntity<?> revokeSession(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable java.util.UUID familyId) {
        return refreshTokenService.revokeFamilyForUser(familyId, user) ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
    @PostMapping("/sessions/logout-all")
    public ResponseEntity<?> logoutAll(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader) {
        ClientType type = ClientType.fromHeader(clientTypeHeader);
        refreshTokenService.revokeAllForUser(user.userId(), user.role());
        ResponseEntity.BodyBuilder response = ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store");
        if (type == ClientType.WEB) response.header(org.springframework.http.HttpHeaders.SET_COOKIE, deleteCookie().toString());
        return response.body(java.util.Map.of("message", "Sesiones cerradas"));
    }
    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@AuthenticationPrincipal AuthenticatedUser user, @RequestBody(required=false) DeleteAccountRequest request) {
        AuthProvider provider = request == null ? null : request.provider();
        if (provider == null || provider == AuthProvider.LOCAL) {
            if (request != null && (request.credential() != null || request.identityToken() != null || request.nonce() != null))
                throw new InvalidReauthenticationTokenException();
            accountDeletionService.delete(user, request == null ? null : request.currentPassword());
        } else if (provider == AuthProvider.GOOGLE) {
            if (request.currentPassword() != null || request.identityToken() != null || request.nonce() != null)
                throw new InvalidReauthenticationTokenException();
            if (!googleAuthProperties.isEnabled()) throw new GoogleAuthDisabledException();
            VerifiedGoogleIdentity verified = googleTokenVerifier.verify(request.credential());
            accountDeletionService.deleteWithSocialIdentity(user, VerifiedSocialIdentity.fromGoogle(verified));
        } else {
            if (request.currentPassword() != null || request.credential() != null)
                throw new InvalidReauthenticationTokenException();
            if (!appleAuthProperties.isEnabled()) throw new AppleAuthDisabledException();
            VerifiedAppleIdentity verified = appleTokenVerifier.verify(request.identityToken(), request.nonce());
            accountDeletionService.deleteWithSocialIdentity(user, VerifiedSocialIdentity.fromApple(verified));
        }
        return ResponseEntity.ok().header(org.springframework.http.HttpHeaders.CACHE_CONTROL, "no-store")
                .header(org.springframework.http.HttpHeaders.SET_COOKIE, deleteCookie().toString())
                .body(java.util.Map.of("message", "Cuenta eliminada"));
    }
}
