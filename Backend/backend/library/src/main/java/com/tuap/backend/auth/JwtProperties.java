package com.tuap.backend.auth;

import java.util.Base64;

import org.springframework.boot.context.properties.ConfigurationProperties;

import jakarta.annotation.PostConstruct;

/** Typed JWT configuration only. Token creation and parsing belong to a later task. */
@ConfigurationProperties(prefix = "jwt")
public class JwtProperties {

    private static final int HS256_MINIMUM_SECRET_BYTES = 32;

    private String secret;
    private String issuer;
    private String audience;
    private long accessTokenTtlSeconds;
    private long clockSkewSeconds;

    @PostConstruct
    public void validate() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET es obligatorio");
        }
        try {
            if (Base64.getDecoder().decode(secret).length < HS256_MINIMUM_SECRET_BYTES) {
                throw new IllegalStateException("JWT_SECRET debe contener al menos 32 bytes Base64 para HS256");
            }
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException("JWT_SECRET debe estar codificado en Base64", exception);
        }
        if (issuer == null || issuer.isBlank() || audience == null || audience.isBlank()) {
            throw new IllegalStateException("JWT issuer y audience son obligatorios");
        }
        if (accessTokenTtlSeconds <= 0 || clockSkewSeconds < 0) {
            throw new IllegalStateException("La configuración temporal JWT no es válida");
        }
    }

    public String getSecret() { return secret; }
    public void setSecret(String secret) { this.secret = secret; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public String getAudience() { return audience; }
    public void setAudience(String audience) { this.audience = audience; }
    public long getAccessTokenTtlSeconds() { return accessTokenTtlSeconds; }
    public void setAccessTokenTtlSeconds(long accessTokenTtlSeconds) { this.accessTokenTtlSeconds = accessTokenTtlSeconds; }
    public long getClockSkewSeconds() { return clockSkewSeconds; }
    public void setClockSkewSeconds(long clockSkewSeconds) { this.clockSkewSeconds = clockSkewSeconds; }
}
