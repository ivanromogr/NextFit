package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;

import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.PendingSocialAuth;
import com.tuap.backend.persistencia.AuthIdentityDAO;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

class SocialOnboardingServiceTest {
    private PendingSocialAuthService pending;
    private ClienteDAO clientes;
    private EntrenadorDAO entrenadores;
    private AuthIdentityService identities;
    private AuthIdentityDAO identityDao;
    private ConsentService consents;
    private SocialOnboardingService service;

    @BeforeEach void setUp() {
        pending = Mockito.mock(PendingSocialAuthService.class);
        clientes = Mockito.mock(ClienteDAO.class);
        entrenadores = Mockito.mock(EntrenadorDAO.class);
        identities = Mockito.mock(AuthIdentityService.class);
        identityDao = Mockito.mock(AuthIdentityDAO.class);
        consents = Mockito.mock(ConsentService.class);
        service = new SocialOnboardingService(pending, clientes, entrenadores, identities, identityDao, consents);
        when(identityDao.findByProviderAndProviderSubject(any(), any())).thenReturn(Optional.empty());
        when(clientes.findByEmail(any())).thenReturn(Optional.empty());
        when(entrenadores.findByEmail(any())).thenReturn(Optional.empty());
        when(clientes.save(any())).thenAnswer(invocation -> { Cliente client = invocation.getArgument(0); client.setId(UUID.randomUUID()); return client; });
        when(entrenadores.save(any())).thenAnswer(invocation -> { Entrenador trainer = invocation.getArgument(0); trainer.setId(UUID.randomUUID()); return trainer; });
    }

    @Test void createsGoogleClienteAndConsumesOnlyAfterIdentityAndConsent() {
        when(pending.findValid("google-token")).thenReturn(state(AuthProvider.GOOGLE, "g-sub", "google@test"));

        AuthenticatedUser user = service.complete(AuthProvider.GOOGLE, request("google-token", Role.CLIENTE));

        assertEquals(Role.CLIENTE, user.role());
        ArgumentCaptor<AuthProvider> provider = ArgumentCaptor.forClass(AuthProvider.class);
        verify(identities).linkIdentity(any(), provider.capture(), org.mockito.ArgumentMatchers.eq("g-sub"), org.mockito.ArgumentMatchers.eq("google@test"));
        assertEquals(AuthProvider.GOOGLE, provider.getValue());
        verify(consents).recordRegistration(any(), org.mockito.ArgumentMatchers.eq(true), org.mockito.ArgumentMatchers.eq(true), org.mockito.ArgumentMatchers.eq(false));
        verify(pending).consume(any(PendingSocialAuth.class));
    }

    @Test void createsGoogleEntrenadorAndAppleClienteAndEntrenador() {
        when(pending.findValid("google-trainer")).thenReturn(state(AuthProvider.GOOGLE, "g-trainer", "trainer@test"));
        assertEquals(Role.ENTRENADOR, service.complete(AuthProvider.GOOGLE, request("google-trainer", Role.ENTRENADOR)).role());
        when(pending.findValid("apple-client")).thenReturn(state(AuthProvider.APPLE, "a-client", "client@privaterelay.appleid.com"));
        assertEquals(Role.CLIENTE, service.complete(AuthProvider.APPLE, request("apple-client", Role.CLIENTE)).role());
        when(pending.findValid("apple-trainer")).thenReturn(state(AuthProvider.APPLE, "a-trainer", "apple-trainer@test"));
        assertEquals(Role.ENTRENADOR, service.complete(AuthProvider.APPLE, request("apple-trainer", Role.ENTRENADOR)).role());
    }

    @Test void rejectsProviderMismatchWithoutConsumingPending() {
        when(pending.findValid("apple-token")).thenReturn(state(AuthProvider.APPLE, "a-sub", "apple@test"));
        assertThrows(SocialProviderMismatchException.class, () -> service.complete(AuthProvider.GOOGLE, request("apple-token", Role.CLIENTE)));
        verify(pending, never()).consume(any(PendingSocialAuth.class));
    }

    @Test void rejectsAppleWithoutEmailWithoutCreatingAnything() {
        when(pending.findValid("apple-token")).thenReturn(state(AuthProvider.APPLE, "a-sub", null));
        assertThrows(SocialEmailRequiredException.class, () -> service.complete(AuthProvider.APPLE, request("apple-token", Role.CLIENTE)));
        verify(clientes, never()).save(any()); verify(entrenadores, never()).save(any()); verify(pending, never()).consume(any(PendingSocialAuth.class));
    }

    @Test void rejectsExistingEmailWithoutAutoLinking() {
        when(pending.findValid("token")).thenReturn(state(AuthProvider.GOOGLE, "subject", "used@test"));
        when(clientes.findByEmail("used@test")).thenReturn(Optional.of(new Cliente()));
        assertThrows(EmailAlreadyInUseException.class, () -> service.complete(AuthProvider.GOOGLE, request("token", Role.CLIENTE)));
        verify(identities, never()).linkIdentity(any(), any(), any(), any()); verify(pending, never()).consume(any(PendingSocialAuth.class));
    }

    @Test void rejectsRaceWhereProviderSubjectWasLinkedBeforeCompletion() {
        when(pending.findValid("token")).thenReturn(state(AuthProvider.APPLE, "subject", "apple@test"));
        when(identityDao.findByProviderAndProviderSubject(AuthProvider.APPLE, "subject")).thenReturn(Optional.of(Mockito.mock(AuthIdentity.class)));
        assertThrows(SocialIdentityAlreadyLinkedException.class, () -> service.complete(AuthProvider.APPLE, request("token", Role.CLIENTE)));
        verify(clientes, never()).save(any()); verify(pending, never()).consume(any(PendingSocialAuth.class));
    }

    @Test void rejectsReplayBeforeAnyNewAccountIsCreated() {
        when(pending.findValid("replayed")).thenThrow(new InvalidPendingSocialAuthException());
        assertThrows(InvalidPendingSocialAuthException.class, () -> service.complete(AuthProvider.GOOGLE, request("replayed", Role.CLIENTE)));
        verify(clientes, never()).save(any()); verify(entrenadores, never()).save(any());
    }

    @Test void propagatesFailureBeforeConsumptionSoTransactionCanRollback() {
        when(pending.findValid("token")).thenReturn(state(AuthProvider.GOOGLE, "subject", "google@test"));
        Mockito.doThrow(new RuntimeException("consent failure")).when(consents).recordRegistration(any(), any(Boolean.class), any(Boolean.class), any(Boolean.class));
        assertThrows(RuntimeException.class, () -> service.complete(AuthProvider.GOOGLE, request("token", Role.CLIENTE)));
        verify(pending, never()).consume(any(PendingSocialAuth.class));
    }

    private static SocialOnboardingRequest request(String token, Role role) {
        return new SocialOnboardingRequest(token, role, "Nombre", "Apellido", true, true, false);
    }

    private static PendingSocialAuth state(AuthProvider provider, String subject, String email) {
        return new PendingSocialAuth("hash", provider, subject, email, "Nombre", Instant.now().plusSeconds(600), Instant.now());
    }
}
