package com.tuap.backend.config;

import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.tuap.backend.auth.IdentityResolver;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final IdentityResolver identityResolver;

    public CustomUserDetailsService(IdentityResolver identityResolver) {
        this.identityResolver = identityResolver;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return identityResolver.findByEmail(email)
            .map(identity -> User.builder()
                .username(identity.email())
                .password(identity.passwordHash())
                .authorities(identity.role().toAuthority())
                .build())
            .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));
    }
}
