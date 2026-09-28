package com.tuap.backend.auth;

/** Verifies a Google OIDC ID token before any claim is used by NextFit. */
public interface GoogleTokenVerifier {
    VerifiedGoogleIdentity verify(String credential);
}
