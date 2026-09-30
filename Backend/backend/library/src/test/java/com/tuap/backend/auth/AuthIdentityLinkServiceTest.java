package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.persistencia.AuthIdentityDAO;

class AuthIdentityLinkServiceTest {
    private AuthIdentityDAO identities;
    private IdentityResolver users;
    private AuthIdentityLinkService service;
    private AuthenticatedUser current;
    private AuthenticatedUser other;

    @BeforeEach void setUp() {
        identities = org.mockito.Mockito.mock(AuthIdentityDAO.class);
        users = org.mockito.Mockito.mock(IdentityResolver.class);
        service = new AuthIdentityLinkService(identities, users,
                Clock.fixed(Instant.parse("2026-09-29T10:00:00Z"), ZoneOffset.UTC));
        current = new AuthenticatedUser(UUID.randomUUID(), "ivan@nextfit.test", Role.CLIENTE);
        other = new AuthenticatedUser(UUID.randomUUID(), "other@nextfit.test", Role.ENTRENADOR);
        when(users.findByIdAndRole(current.userId(), current.role())).thenReturn(Optional.of(current));
    }

    @Test void linksGoogleToCurrentAccountEvenWhenEmailsDiffer() {
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "google-sub")).thenReturn(Optional.empty());

        AuthIdentityLinkResponse result = service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.GOOGLE, "google-sub", "another@provider.test", null, null));

        assertEquals(AuthIdentityLinkResponse.Status.LINKED, result.status());
        verify(identities).saveAndFlush(org.mockito.ArgumentMatchers.argThat(identity ->
                identity.getUserId().equals(current.userId()) && identity.getRole() == current.role()
                && identity.getProvider() == AuthProvider.GOOGLE && identity.getProviderSubject().equals("google-sub")
                && identity.getEmailAtLinkTime().equals("another@provider.test")));
    }

    @Test void linksAppleWithNullEmailAndPrivateRelayMetadata() {
        when(identities.findByProviderAndProviderSubject(AuthProvider.APPLE, "apple-null")).thenReturn(Optional.empty());
        assertEquals(AuthIdentityLinkResponse.Status.LINKED, service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.APPLE, "apple-null", null, null, null)).status());

        when(identities.findByProviderAndProviderSubject(AuthProvider.APPLE, "apple-relay")).thenReturn(Optional.empty());
        service.linkExternalIdentity(current, new VerifiedSocialIdentity(AuthProvider.APPLE, "apple-relay",
                "opaque@privaterelay.appleid.com", null, null));
        verify(identities).saveAndFlush(org.mockito.ArgumentMatchers.argThat(identity ->
                "opaque@privaterelay.appleid.com".equals(identity.getEmailAtLinkTime())));
    }

    @Test void existingActiveIdentityForSameAccountIsIdempotent() {
        AuthIdentity identity = identity(current, AuthProvider.GOOGLE, "google-sub", true);
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "google-sub")).thenReturn(Optional.of(identity));

        assertEquals(AuthIdentityLinkResponse.Status.ALREADY_LINKED,
                service.linkExternalIdentity(current, new VerifiedSocialIdentity(AuthProvider.GOOGLE, "google-sub", "x@test", null, null)).status());
    }

    @Test void otherAccountAndInactiveIdentityAreSecureConflicts() {
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "other"))
                .thenReturn(Optional.of(identity(other, AuthProvider.GOOGLE, "other", true)));
        assertThrows(SocialIdentityAlreadyLinkedException.class, () -> service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.GOOGLE, "other", "x@test", null, null)));

        when(identities.findByProviderAndProviderSubject(AuthProvider.APPLE, "inactive"))
                .thenReturn(Optional.of(identity(current, AuthProvider.APPLE, "inactive", false)));
        assertThrows(SocialIdentityAlreadyLinkedException.class, () -> service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.APPLE, "inactive", null, null, null)));
    }

    @Test void inactiveCurrentAccountCannotLink() {
        when(users.findByIdAndRole(current.userId(), current.role())).thenReturn(Optional.empty());
        assertThrows(AccountInactiveException.class, () -> service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.GOOGLE, "google-sub", "x@test", null, null)));
        org.mockito.Mockito.verify(identities, org.mockito.Mockito.never()).saveAndFlush(any());
    }

    @Test void databaseRaceRereadsAndIsIdempotentForSameAccount() {
        AuthIdentity winner = identity(current, AuthProvider.GOOGLE, "race", true);
        when(identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, "race"))
                .thenReturn(Optional.empty(), Optional.of(winner));
        when(identities.saveAndFlush(any(AuthIdentity.class))).thenThrow(new DataIntegrityViolationException("unique"));

        assertEquals(AuthIdentityLinkResponse.Status.ALREADY_LINKED, service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.GOOGLE, "race", "x@test", null, null)).status());
    }

    @Test void databaseRaceRereadsAndRejectsOtherAccount() {
        AuthIdentity winner = identity(other, AuthProvider.APPLE, "race", true);
        when(identities.findByProviderAndProviderSubject(AuthProvider.APPLE, "race"))
                .thenReturn(Optional.empty(), Optional.of(winner));
        when(identities.saveAndFlush(any(AuthIdentity.class))).thenThrow(new DataIntegrityViolationException("unique"));

        assertThrows(SocialIdentityAlreadyLinkedException.class, () -> service.linkExternalIdentity(current,
                new VerifiedSocialIdentity(AuthProvider.APPLE, "race", null, null, null)));
    }

    private AuthIdentity identity(AuthenticatedUser user, AuthProvider provider, String subject, boolean active) {
        AuthIdentity identity = new AuthIdentity(user.userId(), user.role(), provider, subject, null, Instant.now());
        if (!active) identity.deactivate();
        return identity;
    }
}
