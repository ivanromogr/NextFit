package com.tuap.backend.auth;

import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKMatcher;
import com.nimbusds.jose.jwk.JWKSelector;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.SignedJWT;
import com.nimbusds.jwt.JWTClaimsSet;

/**
 * OIDC verifier backed by Google's published JWKS. It checks signature, issuer, audience,
 * expiry and subject locally; raw credentials and claims are never logged or retained.
 */
@Service
public class GoogleIdTokenVerifierService implements GoogleTokenVerifier {
    private static final URI GOOGLE_JWKS = URI.create("https://www.googleapis.com/oauth2/v3/certs");
    private static final List<String> ISSUERS = List.of("accounts.google.com", "https://accounts.google.com");
    private final GoogleAuthProperties properties;
    private final JWKSource<SecurityContext> jwks;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleIdTokenVerifierService(GoogleAuthProperties properties) {
        this(properties, googleJwks(), Clock.systemUTC());
    }

    GoogleIdTokenVerifierService(GoogleAuthProperties properties, JWKSource<SecurityContext> jwks, Clock clock) {
        this.properties = properties;
        this.jwks = jwks;
        this.clock = clock;
    }

    private static RemoteJWKSet<SecurityContext> googleJwks() {
        try {
            return new RemoteJWKSet<>(GOOGLE_JWKS.toURL());
        } catch (java.net.MalformedURLException exception) {
            throw new IllegalStateException("Invalid fixed Google JWKS endpoint", exception);
        }
    }

    @Override
    public VerifiedGoogleIdentity verify(String credential) {
        if (credential == null || credential.isBlank() || properties.getAllowedAudiences().isEmpty()) {
            throw new InvalidGoogleTokenException();
        }
        try {
            SignedJWT jwt = SignedJWT.parse(credential);
            if (!JWSAlgorithm.RS256.equals(jwt.getHeader().getAlgorithm()) || !verifySignature(jwt)) {
                throw new InvalidGoogleTokenException();
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            validateClaims(claims);
            return new VerifiedGoogleIdentity(claims.getSubject(), claims.getStringClaim("email"),
                    Boolean.TRUE.equals(claims.getBooleanClaim("email_verified")), claims.getStringClaim("name"),
                    claims.getStringClaim("given_name"), claims.getStringClaim("family_name"));
        } catch (InvalidGoogleTokenException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new InvalidGoogleTokenException(exception);
        }
    }

    private boolean verifySignature(SignedJWT jwt) throws java.text.ParseException, java.io.IOException, JOSEException {
        List<JWK> keys = jwks.get(new JWKSelector(new JWKMatcher.Builder().keyID(jwt.getHeader().getKeyID()).build()), null);
        for (JWK key : keys) {
            if (key instanceof RSAKey rsa && jwt.verify(new RSASSAVerifier(rsa.toRSAPublicKey()))) return true;
        }
        return false;
    }

    private void validateClaims(JWTClaimsSet claims) throws java.text.ParseException {
        if (!ISSUERS.contains(claims.getIssuer()) || claims.getSubject() == null || claims.getSubject().isBlank()
                || claims.getExpirationTime() == null || !claims.getExpirationTime().toInstant().isAfter(Instant.now(clock))
                || claims.getAudience().stream().noneMatch(properties.getAllowedAudiences()::contains)) {
            throw new InvalidGoogleTokenException();
        }
    }
}
