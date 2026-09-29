package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.Test;

import com.tuap.backend.persistencia.AuthIdentityDAO;

class AppleAuthenticationServiceTest {
    @Test void rejectsAuthenticationWhenAppleIsDisabled() {
        AppleAuthProperties properties = new AppleAuthProperties();
        AppleAuthenticationService service = new AppleAuthenticationService(properties, mock(AppleTokenVerifier.class),
                mock(AuthIdentityDAO.class), mock(IdentityResolver.class), mock(PendingSocialAuthService.class));

        assertThrows(AppleAuthDisabledException.class, () -> service.authenticate(new AppleAuthRequest("token", "nonce")));
    }
}
