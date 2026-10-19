package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

class AuthIdentityLinkControllerTest {
    private AuthIdentityLinkService links;
    private GoogleTokenVerifier google;
    private AppleTokenVerifier apple;
    private AuthController controller;
    private AuthenticatedUser current;

    @BeforeEach void setUp() {
        links = Mockito.mock(AuthIdentityLinkService.class);
        google = Mockito.mock(GoogleTokenVerifier.class);
        apple = Mockito.mock(AppleTokenVerifier.class);
        controller = new AuthController(Mockito.mock(AuthService.class), Mockito.mock(JwtService.class),
                Mockito.mock(PasswordResetService.class), Mockito.mock(RefreshTokenService.class), new RefreshTokenProperties(),
                Mockito.mock(EmailChangeService.class), Mockito.mock(AccountDeletionService.class));
        ReflectionTestUtils.setField(controller, "authIdentityLinkService", links);
        ReflectionTestUtils.setField(controller, "googleTokenVerifier", google);
        ReflectionTestUtils.setField(controller, "appleTokenVerifier", apple);
        GoogleAuthProperties googleProperties = new GoogleAuthProperties(); googleProperties.setEnabled(true);
        AppleAuthProperties appleProperties = new AppleAuthProperties(); appleProperties.setEnabled(true);
        ReflectionTestUtils.setField(controller, "googleAuthProperties", googleProperties);
        ReflectionTestUtils.setField(controller, "appleAuthProperties", appleProperties);
        current = new AuthenticatedUser(UUID.randomUUID(), "current@nextfit.test", Role.CLIENTE);
    }

    @Test void googleEndpointUsesVerifiedCredentialAndReturnsNoSession() {
        when(google.verify("credential")).thenReturn(new VerifiedGoogleIdentity("google-sub", "other@test", true, null, null, null));
        when(links.linkExternalIdentity(any(), any())).thenReturn(new AuthIdentityLinkResponse(AuthProvider.GOOGLE, AuthIdentityLinkResponse.Status.LINKED));

        var response = controller.linkGoogleIdentity(current, new GoogleIdentityLinkRequest("credential"));

        assertEquals(200, response.getStatusCode().value());
        assertEquals(AuthIdentityLinkResponse.Status.LINKED, response.getBody().status());
        org.mockito.Mockito.verify(links).linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.GOOGLE, "google-sub", "other@test", null, null));
    }

    @Test void appleEndpointAllowsNullEmailAndPassesNonceToVerifier() {
        when(apple.verify("apple-token", "nonce")).thenReturn(new VerifiedAppleIdentity("apple-sub", null, false, false, "nonce"));
        when(links.linkExternalIdentity(any(), any())).thenReturn(new AuthIdentityLinkResponse(AuthProvider.APPLE, AuthIdentityLinkResponse.Status.LINKED));

        assertEquals(AuthProvider.APPLE, controller.linkAppleIdentity(current, new AppleAuthRequest("apple-token", "nonce")).getBody().provider());
        org.mockito.Mockito.verify(apple).verify("apple-token", "nonce");
    }

    @Test void invalidProviderCredentialsAreNotConvertedToLinks() {
        when(google.verify("bad")).thenThrow(new InvalidGoogleTokenException());
        when(apple.verify("bad", "nonce")).thenThrow(new InvalidAppleTokenException());
        assertThrows(InvalidGoogleTokenException.class, () -> controller.linkGoogleIdentity(current, new GoogleIdentityLinkRequest("bad")));
        assertThrows(InvalidAppleTokenException.class, () -> controller.linkAppleIdentity(current, new AppleAuthRequest("bad", "nonce")));
        org.mockito.Mockito.verifyNoInteractions(links);
    }
}
