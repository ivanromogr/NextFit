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
}
