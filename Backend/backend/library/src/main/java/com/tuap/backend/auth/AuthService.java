package com.tuap.backend.auth;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Authenticates credentials through Spring Security and returns the canonical backend identity. */
@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final IdentityResolver identityResolver;
    @org.springframework.beans.factory.annotation.Autowired(required=false) private AuthIdentityService authIdentities;

    public AuthService(AuthenticationManager authenticationManager, IdentityResolver identityResolver) {
        this.authenticationManager = authenticationManager;
        this.identityResolver = identityResolver;
    }

    public AuthenticatedUser authenticate(String email, String password) {
        String normalizedEmail = IdentityResolver.normalizeEmail(email);
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(normalizedEmail, password));

        // The authenticated username is useful to Spring Security, but the response identity is
        // always rebuilt from the controlled resolver to retain UUID and canonical role.
        String authenticatedEmail = IdentityResolver.normalizeEmail(authentication.getName());
        AuthenticatedUser user=identityResolver.findByEmail(authenticatedEmail)
                .map(AuthenticatableIdentity::authenticatedUser)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
        if(authIdentities!=null){authIdentities.ensureLocalIdentity(user);authIdentities.updateLastUsed(user,AuthProvider.LOCAL);} return user;
    }
}
