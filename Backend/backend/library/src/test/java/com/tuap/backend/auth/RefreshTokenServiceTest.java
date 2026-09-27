package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import com.tuap.backend.dominio.entidades.RefreshToken;
import com.tuap.backend.persistencia.RefreshTokenDAO;

class RefreshTokenServiceTest {
    private RefreshTokenDAO tokens = mock(RefreshTokenDAO.class);
    private IdentityResolver identities = mock(IdentityResolver.class);
    private final Instant now = Instant.parse("2026-01-01T00:00:00Z");
    private RefreshTokenService service;
    @BeforeEach void setup() {
        RefreshTokenProperties properties = new RefreshTokenProperties(); properties.setTtlDays(30);
        service = new RefreshTokenService(tokens, identities, properties, Clock.fixed(now, ZoneOffset.UTC));
    }
    @Test void issue_AlmacenaSoloHashConTtlYFamiliaNueva() {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "cliente@test", Role.CLIENTE);
        RefreshTokenService.IssuedToken issued = service.issue(user, ClientType.MOBILE);
        var saved = org.mockito.ArgumentCaptor.forClass(RefreshToken.class);
        verify(tokens).save(saved.capture());
        assertEquals(43, issued.rawToken().length());
        assertEquals(RefreshTokenService.hash(issued.rawToken()), saved.getValue().getTokenHash());
        assertNotEquals(issued.rawToken(), saved.getValue().getTokenHash());
        assertEquals(now.plus(Duration.ofDays(30)), saved.getValue().getExpiresAt());
    }
    @Test void rotate_ReplayRevocaFamiliaCompleta() {
        UUID userId=UUID.randomUUID(), family=UUID.randomUUID();
        RefreshToken a = new RefreshToken(userId, Role.CLIENTE, RefreshTokenService.hash("A"), family, ClientType.MOBILE, now, now.plusSeconds(3600));
        AuthenticatedUser user = new AuthenticatedUser(userId, "cliente@test", Role.CLIENTE);
        when(tokens.findByTokenHash(RefreshTokenService.hash("A"))).thenReturn(Optional.of(a));
        when(identities.findByIdAndRole(userId, Role.CLIENTE)).thenReturn(Optional.of(user));
        when(tokens.findByFamilyId(family)).thenReturn(List.of(a));
        RefreshTokenService.Rotation rotation = service.rotate("A", ClientType.MOBILE);
        assertEquals(family, rotation.issuedToken().familyId());
        assertNotNull(a.getRotatedAt());
        assertThrows(InvalidRefreshTokenException.class, () -> service.rotate("A", ClientType.MOBILE));
        verify(tokens, atLeastOnce()).findByFamilyId(family);
    }
    @Test void rotate_ExpiradoOUsuarioAusente_Rechaza() {
        UUID userId=UUID.randomUUID(), family=UUID.randomUUID();
        RefreshToken expired = new RefreshToken(userId, Role.ENTRENADOR, RefreshTokenService.hash("expired"), family, ClientType.WEB, now.minusSeconds(100), now.minusSeconds(1));
        when(tokens.findByTokenHash(RefreshTokenService.hash("expired"))).thenReturn(Optional.of(expired));
        assertThrows(InvalidRefreshTokenException.class, () -> service.rotate("expired", ClientType.WEB));
    }
    @Test void activeSessions_SoloDevuelveFamiliasActivasDelPrincipalUnaVez() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID(), web = UUID.randomUUID(), mobile = UUID.randomUUID(), revoked = UUID.randomUUID(), expired = UUID.randomUUID();
        RefreshToken activeWeb = token(a, Role.CLIENTE, web, ClientType.WEB, now.minusSeconds(20), now.plusSeconds(3600));
        RefreshToken oldRotation = token(a, Role.CLIENTE, mobile, ClientType.MOBILE, now.minusSeconds(40), now.plusSeconds(3600));
        RefreshToken activeMobile = token(a, Role.CLIENTE, mobile, ClientType.MOBILE, now.minusSeconds(10), now.plusSeconds(3600));
        oldRotation.rotateTo("next", now.minusSeconds(5));
        RefreshToken inactive = token(a, Role.CLIENTE, revoked, ClientType.WEB, now.minusSeconds(20), now.plusSeconds(3600)); inactive.revoke(now.minusSeconds(1));
        RefreshToken old = token(a, Role.CLIENTE, expired, ClientType.MOBILE, now.minusSeconds(20), now.minusSeconds(1));
        when(tokens.findByUserIdAndRole(a, Role.CLIENTE)).thenReturn(List.of(activeWeb, oldRotation, activeMobile, inactive, old));
        var sessions = service.activeSessions(new AuthenticatedUser(a, "a@test", Role.CLIENTE));
        assertEquals(2, sessions.size());
        assertEquals(Set.of(web, mobile), sessions.stream().map(SessionResponse::familyId).collect(java.util.stream.Collectors.toSet()));
        assertTrue(sessions.stream().noneMatch(s -> s.familyId().equals(b)));
    }
    @Test void revokeFamilyForUser_PropiaRevocaTodaLaFamiliaYAjenaNo() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID(), mine = UUID.randomUUID(), foreign = UUID.randomUUID();
        RefreshToken mineOld = token(a, Role.CLIENTE, mine, ClientType.WEB, now.minusSeconds(10), now.plusSeconds(3600));
        RefreshToken mineCurrent = token(a, Role.CLIENTE, mine, ClientType.WEB, now, now.plusSeconds(3600));
        RefreshToken other = token(b, Role.CLIENTE, foreign, ClientType.MOBILE, now, now.plusSeconds(3600));
        when(tokens.findByFamilyId(mine)).thenReturn(List.of(mineOld, mineCurrent));
        when(tokens.findByFamilyId(foreign)).thenReturn(List.of(other));
        AuthenticatedUser principal = new AuthenticatedUser(a, "a@test", Role.CLIENTE);
        assertTrue(service.revokeFamilyForUser(mine, principal));
        assertFalse(mineOld.isActiveAt(now)); assertFalse(mineCurrent.isActiveAt(now));
        assertFalse(service.revokeFamilyForUser(foreign, principal));
        assertTrue(other.isActiveAt(now));
    }
    @Test void revokeAllForUser_NoAfectaFamiliasDeOtroUsuario() {
        UUID a = UUID.randomUUID(), b = UUID.randomUUID();
        RefreshToken aWeb = token(a, Role.CLIENTE, UUID.randomUUID(), ClientType.WEB, now, now.plusSeconds(3600));
        RefreshToken aMobile = token(a, Role.CLIENTE, UUID.randomUUID(), ClientType.MOBILE, now, now.plusSeconds(3600));
        RefreshToken other = token(b, Role.CLIENTE, UUID.randomUUID(), ClientType.WEB, now, now.plusSeconds(3600));
        when(tokens.findByUserIdAndRole(a, Role.CLIENTE)).thenReturn(List.of(aWeb, aMobile));
        service.revokeAllForUser(a, Role.CLIENTE);
        assertFalse(aWeb.isActiveAt(now)); assertFalse(aMobile.isActiveAt(now)); assertTrue(other.isActiveAt(now));
    }
    private RefreshToken token(UUID user, Role role, UUID family, ClientType type, Instant created, Instant expires) {
        return new RefreshToken(user, role, RefreshTokenService.hash(UUID.randomUUID().toString()), family, type, created, expires);
    }
}
