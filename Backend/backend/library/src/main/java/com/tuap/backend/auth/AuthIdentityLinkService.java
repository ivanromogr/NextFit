package com.tuap.backend.auth;

import java.time.Clock;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.AuthIdentity;
import com.tuap.backend.persistencia.AuthIdentityDAO;

/**
 * Links a freshly verified external identity to the authenticated NextFit
 * account. The provider subject, never email, is the ownership authority.
 */
@Service
public class AuthIdentityLinkService {
    private final AuthIdentityDAO identities;
    private final IdentityResolver users;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public AuthIdentityLinkService(AuthIdentityDAO identities, IdentityResolver users) {
        this(identities, users, Clock.systemUTC());
    }

    AuthIdentityLinkService(AuthIdentityDAO identities, IdentityResolver users, Clock clock) {
        this.identities = identities;
        this.users = users;
        this.clock = clock;
    }

    @Transactional
    public AuthIdentityLinkResponse linkExternalIdentity(AuthenticatedUser currentUser,
            VerifiedSocialIdentity verifiedIdentity) {
        requireActiveAccount(currentUser);
        AuthProvider provider = verifiedIdentity.provider();
        String subject = verifiedIdentity.providerSubject().trim();

        AuthIdentity existing = identities.findByProviderAndProviderSubject(provider, subject).orElse(null);
        if (existing != null) {
            return existingResult(currentUser, existing, provider);
        }

        try {
            identities.saveAndFlush(new AuthIdentity(currentUser.userId(), currentUser.role(), provider, subject,
                    verifiedIdentity.verifiedEmail(), clock.instant()));
            return new AuthIdentityLinkResponse(provider, AuthIdentityLinkResponse.Status.LINKED);
        } catch (DataIntegrityViolationException exception) {
            // The database constraint decides concurrent links. Re-read to make
            // same-account retries idempotent and cross-account races safe.
            AuthIdentity raced = identities.findByProviderAndProviderSubject(provider, subject)
                    .orElseThrow(() -> exception);
            return existingResult(currentUser, raced, provider);
        }
    }

    private void requireActiveAccount(AuthenticatedUser currentUser) {
        if (currentUser == null || users.findByIdAndRole(currentUser.userId(), currentUser.role()).isEmpty()) {
            throw new AccountInactiveException();
        }
    }

    private AuthIdentityLinkResponse existingResult(AuthenticatedUser currentUser, AuthIdentity existing,
            AuthProvider provider) {
        if (!existing.isActive() || !existing.getUserId().equals(currentUser.userId())
                || existing.getRole() != currentUser.role()) {
            throw new SocialIdentityAlreadyLinkedException();
        }
        return new AuthIdentityLinkResponse(provider, AuthIdentityLinkResponse.Status.ALREADY_LINKED);
    }
}
