package com.tuap.backend.auth;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Non-session result. It deliberately has no provider subject or external token. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record SocialAuthResponse(SocialAuthStatus status, AuthProvider provider, String email,
        boolean emailVerified, boolean requiresOnboarding, boolean requiresLinking, String pendingToken) {
    static SocialAuthResponse onboarding(String email, String pendingToken) {
        return new SocialAuthResponse(SocialAuthStatus.ONBOARDING_REQUIRED, AuthProvider.GOOGLE, email, true, true, false, pendingToken);
    }
    static SocialAuthResponse onboarding(String email) { return onboarding(email, null); }
    static SocialAuthResponse linking(String email) {
        return new SocialAuthResponse(SocialAuthStatus.LINK_REQUIRED, AuthProvider.GOOGLE, email, true, false, true, null);
    }
}
