package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

class AppleIdTokenVerifierServiceTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-28T10:00:00Z"), ZoneOffset.UTC);
    private AppleAuthProperties properties;
    private RSAKey trustedKey;

    @BeforeEach void setUp() throws Exception {
        properties = new AppleAuthProperties();
        properties.setAllowedAudiences(List.of("com.nextfit.web"));
        trustedKey = new RSAKeyGenerator(2048).keyID("apple-key").generate();
    }

    @Test void verifiesAValidAppleTokenWhenEmailIsAbsent() throws Exception {
        VerifiedAppleIdentity verified = verifier().verify(token(trustedKey, "https://appleid.apple.com", "com.nextfit.web", clock.instant().plusSeconds(60), null), "nonce");

        assertEquals("apple-sub", verified.subject());
        assertNull(verified.email());
    }

    @Test void rejectsAnInvalidIssuer() throws Exception {
        assertThrows(InvalidAppleTokenException.class, () -> verifier().verify(token(trustedKey, "https://evil.example", "com.nextfit.web", clock.instant().plusSeconds(60), "person@test"), "nonce"));
    }

    @Test void rejectsAnExpiredToken() throws Exception {
        assertThrows(InvalidAppleTokenException.class, () -> verifier().verify(token(trustedKey, "https://appleid.apple.com", "com.nextfit.web", clock.instant().minusSeconds(1), "person@test"), "nonce"));
    }

    private AppleIdTokenVerifierService verifier() {
        return new AppleIdTokenVerifierService(properties, new ImmutableJWKSet<>(new JWKSet(trustedKey.toPublicJWK())), clock);
    }

    private String token(RSAKey key, String issuer, String audience, Instant expiration, String email) throws Exception {
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder().issuer(issuer).subject("apple-sub").audience(audience)
                .expirationTime(Date.from(expiration)).claim("nonce", "nonce");
        if (email != null) claims.claim("email", email).claim("email_verified", true);
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("apple-key").build(), claims.build());
        jwt.sign(new RSASSASigner(key.toPrivateKey()));
        return jwt.serialize();
    }
}
