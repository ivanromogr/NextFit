package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.PasswordResetToken;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.PasswordResetTokenDAO;

class PasswordResetServiceTest {
    private IdentityResolver identities = mock(IdentityResolver.class);
    private ClienteDAO clientes = mock(ClienteDAO.class);
    private EntrenadorDAO entrenadores = mock(EntrenadorDAO.class);
    private PasswordResetTokenDAO tokens = mock(PasswordResetTokenDAO.class);
    private PasswordEncoder encoder = mock(PasswordEncoder.class);
    private PasswordResetNotifier notifier = mock(PasswordResetNotifier.class);
    private RefreshTokenService refreshTokens = mock(RefreshTokenService.class);
    private final Instant now = Instant.parse("2026-01-01T00:00:00Z");
    private PasswordResetService service;

    @BeforeEach void setup() {
        service = new PasswordResetService(identities, clientes, entrenadores, tokens, encoder, notifier,
                30, Clock.fixed(now, ZoneOffset.UTC), refreshTokens);
        when(tokens.findByUserIdAndRoleAndUsedAtIsNull(any(), any())).thenReturn(java.util.List.of());
    }

    @Test void forgot_ClienteNormalizado_CreaTokenHasheadoYNotifica() {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "cliente@nextfit.test", Role.CLIENTE);
        when(identities.findByEmail("cliente@nextfit.test"))
                .thenReturn(Optional.of(new AuthenticatableIdentity(user.userId(), user.email(), user.role(), "hash")));

        service.requestReset(" Cliente@NextFit.Test ");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        ArgumentCaptor<String> raw = ArgumentCaptor.forClass(String.class);
        verify(tokens).save(saved.capture());
        verify(notifier).notifyReset(eq(user), raw.capture());
        assertEquals(43, raw.getValue().length()); // 32 bytes, Base64 URL without padding
        assertEquals(PasswordResetService.hash(raw.getValue()), saved.getValue().getTokenHash());
        assertNotEquals(raw.getValue(), saved.getValue().getTokenHash());
        assertEquals(now.plusSeconds(1800), saved.getValue().getExpiresAt());
    }

    @Test void forgot_Inexistente_NoGeneraTokenYMantieneRespuestaEnElController() {
        when(identities.findByEmail("nadie@nextfit.test")).thenReturn(Optional.empty());
        service.requestReset("nadie@nextfit.test");
        verifyNoInteractions(notifier);
        verify(tokens, never()).save(any());
    }
    @Test void forgot_FalloDeEntregaPermaneceNeutral() {
        AuthenticatedUser user = new AuthenticatedUser(UUID.randomUUID(), "cliente@nextfit.test", Role.CLIENTE);
        when(identities.findByEmail(user.email())).thenReturn(Optional.of(new AuthenticatableIdentity(user.userId(), user.email(), user.role(), "hash")));
        doThrow(new EmailDeliveryException()).when(notifier).notifyReset(eq(user), anyString());
        assertDoesNotThrow(() -> service.requestReset(user.email()));
        verify(tokens).save(any(PasswordResetToken.class));
    }

    @Test void reset_EntrenadorValido_CambiaHashYConsumeToken() {
        UUID id = UUID.randomUUID();
        PasswordResetToken token = new PasswordResetToken(id, Role.ENTRENADOR,
                PasswordResetService.hash("reset-token"), now.plusSeconds(60), now);
        Entrenador entrenador = new Entrenador(); entrenador.setId(id); entrenador.setContrasena("old-hash");
        when(tokens.findByTokenHash(PasswordResetService.hash("reset-token"))).thenReturn(Optional.of(token));
        when(entrenadores.findById(id)).thenReturn(Optional.of(entrenador));
        when(encoder.encode("new-password")).thenReturn("new-bcrypt");

        service.resetPassword("reset-token", "new-password");

        assertEquals("new-bcrypt", entrenador.getContrasena());
        assertEquals(now, token.getUsedAt());
        verify(entrenadores).save(entrenador);
    }

    @Test void reset_ReutilizadoOExpirado_DevuelveErrorGenerico() {
        PasswordResetToken expired = new PasswordResetToken(UUID.randomUUID(), Role.CLIENTE,
                PasswordResetService.hash("expired"), now.minusSeconds(1), now.minusSeconds(100));
        when(tokens.findByTokenHash(PasswordResetService.hash("expired"))).thenReturn(Optional.of(expired));
        assertThrows(InvalidResetTokenException.class, () -> service.resetPassword("expired", "new-password"));
        assertThrows(InvalidResetTokenException.class, () -> service.resetPassword("inventado", "new-password"));
    }

    @Test void change_Cliente_VerificaActualYNoAceptaNuevaInvalida() {
        UUID id = UUID.randomUUID();
        Cliente cliente = new Cliente(); cliente.setId(id); cliente.setContrasena("current-hash");
        AuthenticatedUser user = new AuthenticatedUser(id, "cliente@nextfit.test", Role.CLIENTE);
        when(clientes.findById(id)).thenReturn(Optional.of(cliente));
        when(encoder.matches("actual", "current-hash")).thenReturn(true);
        when(encoder.encode("new-password")).thenReturn("new-bcrypt");

        service.changePassword(user, "actual", "new-password");
        assertEquals("new-bcrypt", cliente.getContrasena());
        assertThrows(InvalidPasswordException.class, () -> service.changePassword(user, "actual", "short"));
        when(encoder.matches("mala", "new-bcrypt")).thenReturn(false);
        assertThrows(InvalidCurrentPasswordException.class, () -> service.changePassword(user, "mala", "another-good-password"));
    }
    @Test void change_Entrenador_RevocaRefreshEInvalidaResetYRechazaPasswordIgual() {
        UUID id = UUID.randomUUID(); Entrenador entrenador = new Entrenador(); entrenador.setId(id); entrenador.setContrasena("current-hash");
        AuthenticatedUser user = new AuthenticatedUser(id, "coach@nextfit.test", Role.ENTRENADOR);
        PasswordResetToken pending = new PasswordResetToken(id, Role.ENTRENADOR, PasswordResetService.hash("pending"), now.plusSeconds(60), now);
        when(entrenadores.findById(id)).thenReturn(Optional.of(entrenador)); when(encoder.matches("actual-password", "current-hash")).thenReturn(true); when(encoder.encode("new-password")).thenReturn("new-bcrypt");
        when(tokens.findByUserIdAndRoleAndUsedAtIsNull(id, Role.ENTRENADOR)).thenReturn(java.util.List.of(pending));
        service.changePassword(user, "actual-password", "new-password");
        assertEquals("new-bcrypt", entrenador.getContrasena()); assertEquals(now, pending.getUsedAt()); verify(refreshTokens).revokeAllForUser(id, Role.ENTRENADOR);
        when(encoder.matches("same-password", "new-bcrypt")).thenReturn(true);
        assertThrows(NewPasswordMustBeDifferentException.class, () -> service.changePassword(user, "same-password", "same-password"));
        verify(refreshTokens, times(1)).revokeAllForUser(id, Role.ENTRENADOR);
    }
}
