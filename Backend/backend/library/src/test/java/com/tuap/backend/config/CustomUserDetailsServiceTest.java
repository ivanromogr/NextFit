package com.tuap.backend.config;



import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
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
    private ClienteDAO clienteDAO;

    @Mock
    private EntrenadorDAO entrenadorDAO;

    @InjectMocks
    private CustomUserDetailsService customUserDetailsService;

    private Cliente clienteMock;
    private Entrenador entrenadorMock;

    @BeforeEach
    void setUp() {
        // Preparamos un cliente falso
        clienteMock = new Cliente();
        clienteMock.setEmail("cliente@test.com");
        clienteMock.setContrasena("pass123");
        clienteMock.setRol("ROLE_CLIENTE");

        // Preparamos un entrenador falso
        entrenadorMock = new Entrenador();
        entrenadorMock.setEmail("entrenador@test.com");
        entrenadorMock.setContrasena("pass456");
        entrenadorMock.setRol("ROLE_ENTRENADOR");
    }

    @Test
    void loadUserByUsername_ClienteEncontrado() {
        // Simulamos que la BBDD encuentra al cliente
        when(clienteDAO.findByEmail("cliente@test.com")).thenReturn(Optional.of(clienteMock));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("cliente@test.com");

        assertNotNull(userDetails);
        assertEquals("cliente@test.com", userDetails.getUsername());
        assertEquals("pass123", userDetails.getPassword());
        
        verify(clienteDAO, times(1)).findByEmail("cliente@test.com");
        verify(entrenadorDAO, never()).findByEmail(anyString()); // No debería buscar entrenadores
    }

    @Test
    void loadUserByUsername_EntrenadorEncontrado() {
        // Simulamos que no hay cliente, pero sí hay entrenador
        when(clienteDAO.findByEmail("entrenador@test.com")).thenReturn(Optional.empty());
        when(entrenadorDAO.findByEmail("entrenador@test.com")).thenReturn(Optional.of(entrenadorMock));

        UserDetails userDetails = customUserDetailsService.loadUserByUsername("entrenador@test.com");

        assertNotNull(userDetails);
        assertEquals("entrenador@test.com", userDetails.getUsername());
        assertEquals("pass456", userDetails.getPassword());

        verify(clienteDAO, times(1)).findByEmail("entrenador@test.com");
        verify(entrenadorDAO, times(1)).findByEmail("entrenador@test.com");
    }

    @Test
    void loadUserByUsername_UsuarioNoEncontrado_LanzaExcepcion() {
        // Simulamos que el email no existe en ningún lado
        when(clienteDAO.findByEmail("nadie@test.com")).thenReturn(Optional.empty());
        when(entrenadorDAO.findByEmail("nadie@test.com")).thenReturn(Optional.empty());

        // Verificamos que salta la excepción correcta
        assertThrows(UsernameNotFoundException.class, () -> {
            customUserDetailsService.loadUserByUsername("nadie@test.com");
        });

        verify(clienteDAO, times(1)).findByEmail("nadie@test.com");
        verify(entrenadorDAO, times(1)).findByEmail("nadie@test.com");
    }
}