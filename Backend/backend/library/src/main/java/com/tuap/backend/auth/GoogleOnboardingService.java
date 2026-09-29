package com.tuap.backend.auth;

import org.springframework.stereotype.Service;

/** Compatibility façade preserving the established Google onboarding contract. */
@Service
public class GoogleOnboardingService {
    private final SocialOnboardingService onboarding;

    public GoogleOnboardingService(SocialOnboardingService onboarding) {
        this.onboarding = onboarding;
    }

    public AuthenticatedUser complete(GoogleOnboardingRequest request) {
        if (request == null) throw new IllegalArgumentException("Solicitud de registro con Google inválida");
        return onboarding.complete(AuthProvider.GOOGLE, new SocialOnboardingRequest(request.pendingToken(), request.role(),
                request.nombre(), request.apellido(), request.acceptTerms(), request.acceptPrivacy(), request.marketingConsent()));
    }
}
