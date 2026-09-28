package com.tuap.backend.auth;

/** Internal discriminated result: either a canonical account or a safe social-login state. */
public record GoogleAuthenticationResult(AuthenticatedUser user, SocialAuthResponse socialResponse) {
    static GoogleAuthenticationResult authenticated(AuthenticatedUser user) { return new GoogleAuthenticationResult(user, null); }
    static GoogleAuthenticationResult incomplete(SocialAuthResponse response) { return new GoogleAuthenticationResult(null, response); }
    public boolean authenticated() { return user != null; }
}
