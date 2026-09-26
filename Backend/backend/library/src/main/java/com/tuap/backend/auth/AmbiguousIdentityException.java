package com.tuap.backend.auth;

/** Raised when the same normalized email belongs to more than one persisted identity. */
public class AmbiguousIdentityException extends IllegalStateException {
    public AmbiguousIdentityException() {
        super("La identidad no es inequívoca");
    }
}
