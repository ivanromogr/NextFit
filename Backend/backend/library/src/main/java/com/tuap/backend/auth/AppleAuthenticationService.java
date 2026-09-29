package com.tuap.backend.auth;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.persistencia.AuthIdentityDAO;

@Service
public class AppleAuthenticationService {
    private final AppleAuthProperties properties; private final AppleTokenVerifier verifier; private final AuthIdentityDAO identities; private final IdentityResolver users; private final PendingSocialAuthService pending;
    public AppleAuthenticationService(AppleAuthProperties p, AppleTokenVerifier v, AuthIdentityDAO i, IdentityResolver u, PendingSocialAuthService pending) { properties=p; verifier=v; identities=i; users=u; this.pending=pending; }
    @Transactional public GoogleAuthenticationResult authenticate(AppleAuthRequest request) {
        if (!properties.isEnabled()) throw new AppleAuthDisabledException();
        VerifiedAppleIdentity apple=verifier.verify(request==null?null:request.identityToken(),request==null?null:request.nonce());
        AuthIdentity identity=identities.findByProviderAndProviderSubject(AuthProvider.APPLE,apple.subject()).orElse(null);
        if (identity!=null) { if (!identity.isActive()) throw new AppleAccountInactiveException(); AuthenticatedUser user=users.findByIdAndRole(identity.getUserId(),identity.getRole()).orElseThrow(AppleAccountInactiveException::new); identity.usedAt(java.time.Instant.now()); identities.save(identity); return GoogleAuthenticationResult.authenticated(user); }
        if (apple.email()!=null&&!apple.email().isBlank()) { try { if (users.findByEmail(apple.email()).isPresent()) return GoogleAuthenticationResult.incomplete(SocialAuthResponse.linking(AuthProvider.APPLE,apple.email())); } catch (AmbiguousIdentityException e) { return GoogleAuthenticationResult.incomplete(SocialAuthResponse.linking(AuthProvider.APPLE,apple.email())); } }
        return GoogleAuthenticationResult.incomplete(SocialAuthResponse.onboarding(AuthProvider.APPLE,apple.email(),pending.issue(VerifiedSocialIdentity.fromApple(apple))));
    }
}
