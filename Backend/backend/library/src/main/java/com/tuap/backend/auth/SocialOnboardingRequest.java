package com.tuap.backend.auth;

/** Request data supplied by a social onboarding form; identity data remains server-owned. */
public record SocialOnboardingRequest(String pendingToken, Role role, String nombre, String apellido,
        boolean acceptTerms, boolean acceptPrivacy, boolean marketingConsent) {
}
