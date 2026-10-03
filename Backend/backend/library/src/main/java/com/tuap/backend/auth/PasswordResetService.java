package com.tuap.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.PasswordResetToken;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.PasswordResetTokenDAO;
import com.tuap.backend.persistencia.AuthIdentityDAO;

@Service
public class PasswordResetService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final IdentityResolver identities;
    private final ClienteDAO clientes;
    private final EntrenadorDAO entrenadores;
    private final PasswordResetTokenDAO tokens;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetNotifier notifier;
    private final Clock clock;
    private final RefreshTokenService refreshTokens;
    private final long ttlMinutes;
    @Autowired(required = false) private AuthIdentityDAO authIdentities;

    @Autowired
    public PasswordResetService(IdentityResolver identities, ClienteDAO clientes, EntrenadorDAO entrenadores,
            PasswordResetTokenDAO tokens, PasswordEncoder passwordEncoder, PasswordResetNotifier notifier,
            @Value("${password-reset.ttl-minutes:30}") long ttlMinutes, RefreshTokenService refreshTokens) {
        this(identities, clientes, entrenadores, tokens, passwordEncoder, notifier, ttlMinutes, Clock.systemUTC(), refreshTokens);
    }

    PasswordResetService(IdentityResolver identities, ClienteDAO clientes, EntrenadorDAO entrenadores,
            PasswordResetTokenDAO tokens, PasswordEncoder passwordEncoder, PasswordResetNotifier notifier,
            long ttlMinutes, Clock clock, RefreshTokenService refreshTokens) {
        this.identities = identities; this.clientes = clientes; this.entrenadores = entrenadores;
        this.tokens = tokens; this.passwordEncoder = passwordEncoder; this.notifier = notifier;
        this.ttlMinutes = ttlMinutes; this.clock = clock;
        this.refreshTokens = refreshTokens;
    }

    @Transactional
    public void requestReset(String email) {
        Optional<AuthenticatableIdentity> identity;
        try { identity = identities.findByEmail(IdentityResolver.normalizeEmail(email)); } catch (RuntimeException e) { return; }
        if (identity.isEmpty()) return;
        AuthenticatedUser user = identity.get().authenticatedUser();
        if (!hasLocalIdentity(user)) return;
        Instant now = clock.instant();
        invalidateActiveTokens(user, now);
        byte[] random = new byte[32];
        RANDOM.nextBytes(random);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        tokens.save(new PasswordResetToken(user.userId(), user.role(), hash(rawToken), now.plusSeconds(ttlMinutes * 60), now));
        try { notifier.notifyReset(user, rawToken); } catch (EmailDeliveryException ignored) { }
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        if (!isValidPassword(newPassword) || rawToken == null || rawToken.isBlank()) throw new InvalidResetTokenException();
        PasswordResetToken token = tokens.findByTokenHash(hash(rawToken)).orElseThrow(InvalidResetTokenException::new);
        Instant now = clock.instant();
        if (!token.isUsableAt(now)) throw new InvalidResetTokenException();
        if (!hasLocalIdentity(new AuthenticatedUser(token.getUserId(), "reset@internal", token.getRole()))) throw new InvalidResetTokenException();
        if (!setPassword(token.getUserId(), token.getRole(), newPassword)) throw new InvalidResetTokenException();
        token.consume(now);
        invalidateActiveTokens(new AuthenticatedUser(token.getUserId(), "reset@internal", token.getRole()), now);
        refreshTokens.revokeAllForUser(token.getUserId(), token.getRole());
    }

    @Transactional
    public void changePassword(AuthenticatedUser user, String currentPassword, String newPassword) {
        if (!isValidPassword(newPassword)) throw new InvalidPasswordException();
        String currentHash = passwordHash(user.userId(), user.role()).orElseThrow(InvalidCurrentPasswordException::new);
        if (currentPassword == null || !passwordEncoder.matches(currentPassword, currentHash)) throw new InvalidCurrentPasswordException();
        if (currentPassword.equals(newPassword)) throw new NewPasswordMustBeDifferentException();
        setPassword(user.userId(), user.role(), newPassword);
        invalidateActiveTokens(user, clock.instant());
        refreshTokens.revokeAllForUser(user.userId(), user.role());
    }

    private void invalidateActiveTokens(AuthenticatedUser user, Instant now) {
        List<PasswordResetToken> active = tokens.findByUserIdAndRoleAndUsedAtIsNull(user.userId(), user.role());
        active.forEach(token -> token.consume(now));
    }
    private Optional<String> passwordHash(java.util.UUID id, Role role) {
        return switch (role) { case CLIENTE -> clientes.findById(id).map(Cliente::getContrasena); case ENTRENADOR -> entrenadores.findById(id).map(Entrenador::getContrasena); };
    }
    private boolean hasLocalIdentity(AuthenticatedUser user) { return authIdentities == null || authIdentities.existsByUserIdAndRoleAndProviderAndActiveTrue(user.userId(), user.role(), AuthProvider.LOCAL); }
    private boolean setPassword(java.util.UUID id, Role role, String raw) {
        return switch (role) {
            case CLIENTE -> clientes.findById(id).map(c -> { c.setContrasena(passwordEncoder.encode(raw)); clientes.save(c); return true; }).orElse(false);
            case ENTRENADOR -> entrenadores.findById(id).map(e -> { e.setContrasena(passwordEncoder.encode(raw)); entrenadores.save(e); return true; }).orElse(false);
        };
    }
    public static boolean isValidPassword(String value) { return value != null && value.length() >= 8 && value.length() <= 128; }
    public static String hash(String token) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("SHA-256 no disponible", e); }
    }
}
