package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.persistencia.AuthIdentityDAO;

class GoogleAuthenticationServiceTest {
    private GoogleAuthProperties properties;
    private GoogleTokenVerifier verifier;
    private AuthIdentityDAO identities;
    private IdentityResolver users;
    private GoogleAuthenticationService service;
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-28T10:00:00Z"), ZoneOffset.UTC);

    @BeforeEach void setUp() {
        properties = new GoogleAuthProperties(); properties.setEnabled(true);
        verifier = Mockito.mock(GoogleTokenVerifier.class); identities = Mockito.mock(AuthIdentityDAO.class); users = Mockito.mock(IdentityResolver.class);
        service = new GoogleAuthenticationService(properties, verifier, identities, users, clock);
    }

    @Test void disabledDoesNotVerifyCredential() {
        properties.setEnabled(false);
        assertThrows(GoogleAuthDisabledException.class, () -> service.authenticate(new GoogleAuthRequest("raw", null)));
        verifyNoInteractions(verifier, identities, users);
    }

    @Test void invalidVerifierResultIsNotConvertedIntoSession() {
        when(verifier.verify(any())).thenThrow(new InvalidGoogleTokenException());
        assertThrows(InvalidGoogleTokenException.class, () -> service.authenticate(new GoogleAuthRequest("raw", null)));
        verifyNoInteractions(identities, users);
    }

    @Test void unverifiedEmailIsRejectedWithoutPersistence() {
        when(verifier.verify(any())).thenReturn(google("sub-a", "a@test", false));
        assertThrows(GoogleEmailNotVerifiedException.class, () -> service.authenticate(new GoogleAuthRequest("raw", null)));
        verifyNoInteractions(identities, users);
    }

    @Test void existingGoogleIdentityAuthenticatesCanonicalAccountAndIgnoresRequestedRole() {
        AuthIdentity identity = identity(Role.ENTRENADOR, true, "sub-a", "old@test");
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "current@nextfit.test", Role.ENTRENADOR);
        when(verifier.verify(any())).thenReturn(google("sub-a", "google-changed@test", true));
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "sub-a")).thenReturn(Optional.of(identity));
        when(users.findByIdAndRole(identity.getUserId(), Role.ENTRENADOR)).thenReturn(Optional.of(user));

        GoogleAuthenticationResult result = service.authenticate(new GoogleAuthRequest("raw", Role.CLIENTE));

        assertEquals(user, result.user()); assertEquals(Role.ENTRENADOR, result.user().role());
        verify(identities).save(identity);
    }

    @Test void deletedAccountIsRejectedEvenWhenGoogleIdentityIsActive() {
        AuthIdentity identity = identity(Role.CLIENTE, true, "sub-a", "a@test");
        when(verifier.verify(any())).thenReturn(google("sub-a", "a@test", true));
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "sub-a")).thenReturn(Optional.of(identity));
        when(users.findByIdAndRole(identity.getUserId(), Role.CLIENTE)).thenReturn(Optional.empty());
        assertThrows(GoogleAccountInactiveException.class, () -> service.authenticate(new GoogleAuthRequest("raw", null)));
        verify(identities, never()).save(identity);
    }

    @Test void disabledGoogleIdentityIsRejected() {
        AuthIdentity identity = identity(Role.CLIENTE, false, "sub-a", "a@test");
        when(verifier.verify(any())).thenReturn(google("sub-a", "a@test", true));
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "sub-a")).thenReturn(Optional.of(identity));
        assertThrows(GoogleAccountInactiveException.class, () -> service.authenticate(new GoogleAuthRequest("raw", null)));
        verifyNoInteractions(users);
    }

    @Test void localEmailMatchRequiresAuthenticatedLinkAndCreatesNothing() {
        when(verifier.verify(any())).thenReturn(google("new-sub", "local@test", true));
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "new-sub")).thenReturn(Optional.empty());
        when(users.findByEmail("local@test")).thenReturn(Optional.of(new AuthenticatableIdentity(UUID.randomUUID(), "local@test", Role.CLIENTE, "hash")));
        GoogleAuthenticationResult result = service.authenticate(new GoogleAuthRequest("raw", null));
        assertEquals(SocialAuthStatus.LINK_REQUIRED, result.socialResponse().status());
        verify(identities, never()).save(any());
    }

    @Test void unknownVerifiedGoogleUserRequiresOnboardingAndCreatesNothing() {
        when(verifier.verify(any())).thenReturn(google("new-sub", "new@test", true));
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "new-sub")).thenReturn(Optional.empty());
        when(users.findByEmail("new@test")).thenReturn(Optional.empty());
        GoogleAuthenticationResult result = service.authenticate(new GoogleAuthRequest("raw", Role.CLIENTE));
        assertEquals(SocialAuthStatus.ONBOARDING_REQUIRED, result.socialResponse().status());
        verify(identities, never()).save(any());
    }

    @Test void differentSubjectWithSameEmailDoesNotMergeAndRequiresLinking() {
        when(verifier.verify(any())).thenReturn(google("second-sub", "same@test", true));
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "second-sub")).thenReturn(Optional.empty());
        when(users.findByEmail("same@test")).thenReturn(Optional.of(new AuthenticatableIdentity(UUID.randomUUID(), "same@test", Role.CLIENTE, "hash")));
        GoogleAuthenticationResult result = service.authenticate(new GoogleAuthRequest("raw", null));
        assertEquals(SocialAuthStatus.LINK_REQUIRED, result.socialResponse().status());
    }

    private VerifiedGoogleIdentity google(String sub, String email, boolean verified) { return new VerifiedGoogleIdentity(sub, email, verified, null, null, null); }
    private AuthIdentity identity(Role role, boolean active, String subject, String email) {
        AuthIdentity value = new AuthIdentity(UUID.randomUUID(), role, AuthProvider.GOOGLE, subject, email, clock.instant());
        if (!active) value.deactivate(); return value;
    }
}
