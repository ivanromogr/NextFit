package com.tuap.backend.auth;

import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;

/** Creates and validates signed access tokens. It has no persistence or authentication responsibility. */
@Service
public class JwtService {

    private final JwtProperties properties;
    private final Clock clock;

    @Autowired
    public JwtService(JwtProperties properties) {
        this(properties, Clock.systemUTC());
    }

    JwtService(JwtProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public String generateAccessToken(AuthenticatedUser user) {
        Instant issuedAt = Instant.now(clock);
        Instant expiresAt = issuedAt.plusSeconds(properties.getAccessTokenTtlSeconds());

        return Jwts.builder()
                .subject(user.userId().toString())
                .claim("role", user.role().name())
                .claim("email", user.email())
                .issuer(properties.getIssuer())
                .audience().add(properties.getAudience()).and()
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .id(UUID.randomUUID().toString())
                .signWith(signingKey())
                .compact();
    }

    public AuthenticatedUser extractAuthenticatedUser(String token) {
        Claims claims = parseClaims(token);
        String subject = claims.getSubject();
        String role = claims.get("role", String.class);
        String email = claims.get("email", String.class);

        try {
            return new AuthenticatedUser(UUID.fromString(subject), email, Role.fromStoredValue(role));
        } catch (IllegalArgumentException exception) {
            throw new JwtValidationException("Los claims de identidad no son válidos", exception);
        }
    }

    public long getAccessTokenTtlSeconds() {
        return properties.getAccessTokenTtlSeconds();
    }

    private Claims parseClaims(String token) {
        if (token == null || token.isBlank()) {
            throw new JwtValidationException("El token es obligatorio");
        }
        try {
            Jws<Claims> parsed = Jwts.parser()
                    .verifyWith(signingKey())
                    .clock(() -> Date.from(Instant.now(clock)))
                    .clockSkewSeconds(properties.getClockSkewSeconds())
                    .build()
                    .parseSignedClaims(token);
            Claims claims = parsed.getPayload();
            validateIssuer(claims);
            validateAudience(claims);
            return claims;
        } catch (ExpiredJwtException exception) {
            throw new JwtExpiredException();
        } catch (JwtExpiredException | JwtValidationException exception) {
            throw exception;
        } catch (JwtException | IllegalArgumentException exception) {
            throw new JwtValidationException("El access token no es válido", exception);
        }
    }

    private void validateIssuer(Claims claims) {
        if (!properties.getIssuer().equals(claims.getIssuer())) {
            throw new JwtValidationException("Issuer JWT no válido");
        }
    }

    private void validateAudience(Claims claims) {
        Object audience = claims.get("aud");
        boolean matches = properties.getAudience().equals(audience)
                || audience instanceof Collection<?> values && values.contains(properties.getAudience());
        if (!matches) {
            throw new JwtValidationException("Audience JWT no válida");
        }
    }

    private SecretKey signingKey() {
        return Keys.hmacShaKeyFor(Base64.getDecoder().decode(properties.getSecret()));
    }
}
