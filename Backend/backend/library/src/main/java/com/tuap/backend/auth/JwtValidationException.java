package com.tuap.backend.auth;

/** Access token is malformed, unsigned, or does not satisfy the NextFit claims contract. */
public class JwtValidationException extends RuntimeException {
    public JwtValidationException(String message) {
        super(message);
    }

    public JwtValidationException(String message, Throwable cause) {
        super(message, cause);
    }
}
