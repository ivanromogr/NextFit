package com.tuap.backend.auth;

import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.dominio.entidades.RefreshToken;
import com.tuap.backend.persistencia.RefreshTokenDAO;

@Service
public class RefreshTokenService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final RefreshTokenDAO tokens; private final IdentityResolver identities; private final RefreshTokenProperties properties; private final Clock clock;
    @Autowired public RefreshTokenService(RefreshTokenDAO tokens, IdentityResolver identities, RefreshTokenProperties properties) { this(tokens, identities, properties, Clock.systemUTC()); }
    RefreshTokenService(RefreshTokenDAO tokens, IdentityResolver identities, RefreshTokenProperties properties, Clock clock) { this.tokens=tokens; this.identities=identities; this.properties=properties; this.clock=clock; }

    @Transactional public IssuedToken issue(AuthenticatedUser user, ClientType clientType) { return issue(user, clientType, UUID.randomUUID()); }
    @Transactional public Rotation rotate(String rawToken, ClientType clientType) {
        RefreshToken current = tokens.findByTokenHash(hash(rawToken)).orElseThrow(InvalidRefreshTokenException::new);
        Instant now=clock.instant();
        if (!current.isActiveAt(now) || current.getClientType()!=clientType) {
            if (current.getRotatedAt()!=null) revokeFamily(current.getFamilyId());
            throw new InvalidRefreshTokenException();
        }
        AuthenticatedUser user=identities.findByIdAndRole(current.getUserId(), current.getRole()).orElseGet(() -> { revokeFamily(current.getFamilyId()); throw new InvalidRefreshTokenException(); });
        IssuedToken next=issue(user, clientType, current.getFamilyId());
        current.rotateTo(next.tokenHash(), now);
        return new Rotation(user, next);
    }
    @Transactional public void revoke(String rawToken) { if (rawToken != null && !rawToken.isBlank()) tokens.findByTokenHash(hash(rawToken)).ifPresent(t -> revokeFamily(t.getFamilyId())); }
    @Transactional public void revokeFamily(UUID familyId) { Instant now=clock.instant(); tokens.findByFamilyId(familyId).forEach(t -> t.revoke(now)); }
    @Transactional public void revokeAllForUser(UUID userId, Role role) { Instant now=clock.instant(); tokens.findByUserIdAndRole(userId, role).forEach(t -> t.revoke(now)); }
    private IssuedToken issue(AuthenticatedUser user, ClientType clientType, UUID familyId) {
        byte[] bytes=new byte[32]; RANDOM.nextBytes(bytes); String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); String hash=hash(raw); Instant now=clock.instant();
        tokens.save(new RefreshToken(user.userId(), user.role(), hash, familyId, clientType, now, now.plus(Duration.ofDays(properties.getTtlDays()))));
        return new IssuedToken(raw, hash, familyId, now.plus(Duration.ofDays(properties.getTtlDays())));
    }
    public static String hash(String raw) { if(raw==null) throw new InvalidRefreshTokenException(); return PasswordResetService.hash(raw); }
    public record IssuedToken(String rawToken, String tokenHash, UUID familyId, Instant expiresAt) { }
    public record Rotation(AuthenticatedUser user, IssuedToken issuedToken) { }
}
