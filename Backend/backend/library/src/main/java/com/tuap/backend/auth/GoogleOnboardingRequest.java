package com.tuap.backend.auth;
public record GoogleOnboardingRequest(String pendingToken, Role role, String nombre, String apellido, boolean acceptTerms, boolean acceptPrivacy, boolean marketingConsent) {}
