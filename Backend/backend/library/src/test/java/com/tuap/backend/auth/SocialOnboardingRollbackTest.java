package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;

import jakarta.persistence.EntityManager;

import com.tuap.backend.persistencia.ClienteDAO;

@DataJpaTest
@Import({ PendingSocialAuthService.class, SocialOnboardingService.class })
class SocialOnboardingRollbackTest {
    @Autowired private PendingSocialAuthService pending;
    @Autowired private SocialOnboardingService onboarding;
    @Autowired private ClienteDAO clientes;
    @Autowired private EntityManager entityManager;
    @MockBean private AuthIdentityService identities;
    @MockBean private ConsentService consents;

    @Test void rollsBackTheCreatedUserWhenIdentityLinkingFails() {
        String token = pending.issue(new VerifiedSocialIdentity(AuthProvider.GOOGLE, "race-sub", "rollback@test", "Nombre", null));
        doThrow(new AuthIdentityConflictException()).when(identities).linkIdentity(any(), any(), any(), any());

        assertThrows(SocialIdentityAlreadyLinkedException.class, () -> onboarding.complete(AuthProvider.GOOGLE,
                new SocialOnboardingRequest(token, Role.CLIENTE, "Nombre", "Apellido", true, true, false)));

        entityManager.clear();
        assertTrue(clientes.findByEmail("rollback@test").isEmpty());
    }
}
