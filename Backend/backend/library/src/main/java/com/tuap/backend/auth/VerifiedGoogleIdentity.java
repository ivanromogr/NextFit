package com.tuap.backend.auth;

/** Safe, verified subset of Google claims. The original credential is intentionally discarded. */
public record VerifiedGoogleIdentity(String subject, String email, boolean emailVerified,
        String name, String givenName, String familyName) {
    public VerifiedGoogleIdentity {
        if (subject == null || subject.isBlank()) throw new InvalidGoogleTokenException();
    }
}
