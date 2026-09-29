package com.tuap.backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.PendingSocialAuth;
import com.tuap.backend.persistencia.PendingSocialAuthDAO;

@Service
public class PendingSocialAuthService {
    private final PendingSocialAuthDAO dao;
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public PendingSocialAuthService(PendingSocialAuthDAO d) { this(d, Clock.systemUTC()); }
    PendingSocialAuthService(PendingSocialAuthDAO d, Clock c) { dao = d; clock = c; }

    public String issue(VerifiedGoogleIdentity i) {
        return issue(VerifiedSocialIdentity.fromGoogle(i));
    }

    public String issue(VerifiedSocialIdentity i) {
        byte[] b = new byte[32]; random.nextBytes(b);
        String t = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        Instant n = clock.instant();
        dao.save(new PendingSocialAuth(hash(t), i.provider(), i.providerSubject(), i.verifiedEmail(), i.givenName(), n.plus(Duration.ofMinutes(15)), n));
        return t;
    }

    public PendingSocialAuth findValid(String token) {
        PendingSocialAuth p = dao.findByTokenHash(hash(token)).orElseThrow(InvalidPendingSocialAuthException::new);
        Instant n = clock.instant();
        if (p.getConsumedAt() != null || !p.getExpiresAt().isAfter(n)) throw new InvalidPendingSocialAuthException();
        return p;
    }

    @Transactional public PendingSocialAuth consume(String token) {
        return consume(findValid(token));
    }

    @Transactional public PendingSocialAuth consume(PendingSocialAuth p) {
        if (p == null || p.getConsumedAt() != null || !p.getExpiresAt().isAfter(clock.instant())) throw new InvalidPendingSocialAuthException();
        p.consume(clock.instant()); return dao.save(p);
    }

    private String hash(String t) {
        if (t == null || t.isBlank()) throw new InvalidPendingSocialAuthException();
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(t.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
