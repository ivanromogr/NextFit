package com.tuap.backend.auth;

public record AppleOnboardingRequest(String pendingToken, Role role, String nombre, String apellido,
        boolean acceptTerms, boolean acceptPrivacy, boolean marketingConsent) {
    SocialOnboardingRequest asSocialRequest() {
        return new SocialOnboardingRequest(pendingToken, role, nombre, apellido, acceptTerms, acceptPrivacy, marketingConsent);
    }
}
