package com.tuap.backend.auth;

import java.time.Clock;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.persistencia.AuthIdentityDAO;

/** Business boundary for Google sign-in. Email is only used to detect an unsafe auto-link. */
@Service
public class GoogleAuthenticationService {
    private final GoogleAuthProperties properties;
    private final GoogleTokenVerifier verifier;
    private final AuthIdentityDAO identities;
    private final IdentityResolver users;
    private final Clock clock;
    private final PendingSocialAuthService pending;

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleAuthenticationService(GoogleAuthProperties properties, GoogleTokenVerifier verifier,
            AuthIdentityDAO identities, IdentityResolver users, PendingSocialAuthService pending) {
        this(properties, verifier, identities, users, Clock.systemUTC(), pending);
    }

    GoogleAuthenticationService(GoogleAuthProperties properties, GoogleTokenVerifier verifier,
            AuthIdentityDAO identities, IdentityResolver users, Clock clock) {
        this(properties, verifier, identities, users, clock, null);
    }
    GoogleAuthenticationService(GoogleAuthProperties properties, GoogleTokenVerifier verifier,
            AuthIdentityDAO identities, IdentityResolver users, Clock clock, PendingSocialAuthService pending) {
        this.properties = properties;
        this.verifier = verifier;
        this.identities = identities;
        this.users = users;
        this.clock = clock;
        this.pending = pending;
    }

    @Transactional
    public GoogleAuthenticationResult authenticate(GoogleAuthRequest request) {
        if (!properties.isEnabled()) throw new GoogleAuthDisabledException();
        VerifiedGoogleIdentity google = verifier.verify(request == null ? null : request.credential());
        if (!google.emailVerified() || google.email() == null || google.email().isBlank()) {
            throw new GoogleEmailNotVerifiedException();
        }

        AuthIdentity identity = identities.findByProviderAndProviderSubject(AuthProvider.GOOGLE, google.subject()).orElse(null);
        if (identity != null) {
            if (!identity.isActive()) throw new GoogleAccountInactiveException();
            AuthenticatedUser user = users.findByIdAndRole(identity.getUserId(), identity.getRole())
                    .orElseThrow(GoogleAccountInactiveException::new);
            identity.usedAt(clock.instant());
            identities.save(identity);
            return GoogleAuthenticationResult.authenticated(user);
        }

        // Never link or merge by email: a verified Google email proves control of Google, not of this account.
        try {
            if (users.findByEmail(google.email()).isPresent()) {
                return GoogleAuthenticationResult.incomplete(SocialAuthResponse.linking(google.email()));
            }
        } catch (AmbiguousIdentityException exception) {
            return GoogleAuthenticationResult.incomplete(SocialAuthResponse.linking(google.email()));
        }
        // Existing account models still require password/profile data. AUTH-6/7 will consume a server-held state.
        return GoogleAuthenticationResult.incomplete(SocialAuthResponse.onboarding(google.email(), pending == null ? null : pending.issue(google)));
    }
}
