package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;

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

class GoogleIdTokenVerifierServiceTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-09-28T10:00:00Z"), ZoneOffset.UTC);
    private GoogleAuthProperties properties;
    private RSAKey trustedKey;

    @BeforeEach void setUp() throws Exception {
        properties = new GoogleAuthProperties(); properties.setAllowedAudiences(java.util.List.of("web-client"));
        trustedKey = new RSAKeyGenerator(2048).keyID("trusted").generate();
    }

    @Test void acceptsLocallySignedGoogleTokenOnlyAfterSignatureAndClaimValidation() throws Exception {
        VerifiedGoogleIdentity verified = verifier().verify(token(trustedKey, "https://accounts.google.com", "web-client", clock.instant().plusSeconds(60)));
        assertEquals("google-sub", verified.subject()); assertEquals("person@test", verified.email());
    }

    @Test void rejectsInvalidIssuer() throws Exception {
        assertThrows(InvalidGoogleTokenException.class, () -> verifier().verify(token(trustedKey, "https://evil.example", "web-client", clock.instant().plusSeconds(60))));
    }

    @Test void rejectsWrongAudienceAndExpiry() throws Exception {
        assertThrows(InvalidGoogleTokenException.class, () -> verifier().verify(token(trustedKey, "accounts.google.com", "other-client", clock.instant().plusSeconds(60))));
        assertThrows(InvalidGoogleTokenException.class, () -> verifier().verify(token(trustedKey, "accounts.google.com", "web-client", clock.instant().minusSeconds(1))));
    }

    @Test void rejectsTokenWhoseSignatureDoesNotMatchGoogleJwks() throws Exception {
        RSAKey attacker = new RSAKeyGenerator(2048).keyID("trusted").generate();
        assertThrows(InvalidGoogleTokenException.class, () -> verifier().verify(token(attacker, "accounts.google.com", "web-client", clock.instant().plusSeconds(60))));
    }

    private GoogleIdTokenVerifierService verifier() {
        return new GoogleIdTokenVerifierService(properties, new ImmutableJWKSet<>(new JWKSet(trustedKey.toPublicJWK())), clock);
    }
    private String token(RSAKey key, String issuer, String audience, Instant expiration) throws Exception {
        JWTClaimsSet claims = new JWTClaimsSet.Builder().issuer(issuer).subject("google-sub").audience(audience)
                .expirationTime(Date.from(expiration)).claim("email", "person@test").claim("email_verified", true).build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("trusted").build(), claims);
        jwt.sign(new RSASSASigner(key.toPrivateKey())); return jwt.serialize();
    }
}
