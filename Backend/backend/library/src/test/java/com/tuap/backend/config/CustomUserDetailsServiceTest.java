package com.tuap.backend.config;



import com.tuap.backend.auth.AmbiguousIdentityException;
import com.tuap.backend.auth.IdentityResolver;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private IdentityResolver identityResolver;

    @InjectMocks
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void loadUserByUsername_ClienteEncontrado() {
        when(identityResolver.findByEmail("cliente@test.com")).thenReturn(Optional.of(
                new com.tuap.backend.auth.AuthenticatableIdentity(java.util.UUID.randomUUID(), "cliente@test.com",
                        com.tuap.backend.auth.Role.CLIENTE, "pass123")));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("cliente@test.com");

        assertNotNull(userDetails);
        assertEquals("cliente@test.com", userDetails.getUsername());
        assertEquals("pass123", userDetails.getPassword());
        
        verify(identityResolver, times(1)).findByEmail("cliente@test.com");
    }

    @Test
    void loadUserByUsername_EntrenadorEncontrado() {
        when(identityResolver.findByEmail("entrenador@test.com")).thenReturn(Optional.of(
                new com.tuap.backend.auth.AuthenticatableIdentity(java.util.UUID.randomUUID(), "entrenador@test.com",
                        com.tuap.backend.auth.Role.ENTRENADOR, "pass456")));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("entrenador@test.com");

        assertNotNull(userDetails);
        assertEquals("entrenador@test.com", userDetails.getUsername());
        assertEquals("pass456", userDetails.getPassword());

        verify(identityResolver, times(1)).findByEmail("entrenador@test.com");
    }

    @Test
    void loadUserByUsername_UsuarioNoEncontrado_LanzaExcepcion() {
        when(identityResolver.findByEmail("nadie@test.com")).thenReturn(Optional.empty());

        // Verificamos que salta la excepción correcta
        assertThrows(UsernameNotFoundException.class, () -> {
            customUserDetailsService.loadUserByUsername("nadie@test.com");
        });

        verify(identityResolver, times(1)).findByEmail("nadie@test.com");
    }

    @Test
    void loadUserByUsername_IdentidadAmbigua_LanzaError() {
        when(identityResolver.findByEmail("duplicado@test.com")).thenThrow(new AmbiguousIdentityException());

        assertThrows(AmbiguousIdentityException.class,
                () -> customUserDetailsService.loadUserByUsername("duplicado@test.com"));
    }
}
