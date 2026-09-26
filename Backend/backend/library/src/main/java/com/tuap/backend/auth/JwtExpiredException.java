package com.tuap.backend.auth;

/** Access token expired after applying the configured clock skew. */
public class JwtExpiredException extends RuntimeException {
    public JwtExpiredException() {
        super("El access token ha expirado");
    }
}
