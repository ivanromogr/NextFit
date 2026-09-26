package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private AuthenticationManager authenticationManager;
    @Mock private IdentityResolver identityResolver;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(authenticationManager, identityResolver);
    }

    @Test
    void authenticate_ClienteValido_DevuelveIdentidadCanonica() {
        UUID id = UUID.randomUUID();
        mockAuthentication("cliente@nextfit.test");
        when(identityResolver.findByEmail("cliente@nextfit.test")).thenReturn(Optional.of(
                new AuthenticatableIdentity(id, "cliente@nextfit.test", Role.CLIENTE, "hash")));

        AuthenticatedUser user = authService.authenticate(" Cliente@NextFit.Test ", "password");

        assertEquals(id, user.userId());
        assertEquals(Role.CLIENTE, user.role());
        assertEquals("cliente@nextfit.test", user.email());
    }

    @Test
    void authenticate_EntrenadorValido_DevuelveRolCorrecto() {
        UUID id = UUID.randomUUID();
        mockAuthentication("entrenador@nextfit.test");
        when(identityResolver.findByEmail("entrenador@nextfit.test")).thenReturn(Optional.of(
                new AuthenticatableIdentity(id, "entrenador@nextfit.test", Role.ENTRENADOR, "hash")));

        AuthenticatedUser user = authService.authenticate("entrenador@nextfit.test", "password");

        assertEquals(id, user.userId());
        assertEquals(Role.ENTRENADOR, user.role());
    }

    @Test
    void authenticate_PasswordIncorrecta_PropagaErrorDeSpring() {
        when(authenticationManager.authenticate(any())).thenThrow(new BadCredentialsException("incorrecta"));

        assertThrows(BadCredentialsException.class, () -> authService.authenticate("cliente@nextfit.test", "incorrecta"));
    }

    @Test
    void authenticate_EmailInexistente_PropagaErrorDeSpring() {
        when(authenticationManager.authenticate(any())).thenThrow(new UsernameNotFoundException("ausente"));

        assertThrows(UsernameNotFoundException.class, () -> authService.authenticate("nadie@nextfit.test", "password"));
    }

    @Test
    void authenticate_IdentidadAmbigua_NoLaOcultaInternamente() {
        mockAuthentication("duplicado@nextfit.test");
        when(identityResolver.findByEmail("duplicado@nextfit.test")).thenThrow(new AmbiguousIdentityException());

        assertThrows(AmbiguousIdentityException.class, () -> authService.authenticate("duplicado@nextfit.test", "password"));
    }

    private void mockAuthentication(String email) {
        Authentication authentication = UsernamePasswordAuthenticationToken.authenticated(email, "n/a", java.util.List.of());
        when(authenticationManager.authenticate(any())).thenReturn(authentication);
    }
}
