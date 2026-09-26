package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

@ExtendWith(MockitoExtension.class)
class IdentityResolverTest {

    @Mock private ClienteDAO clienteDAO;
    @Mock private EntrenadorDAO entrenadorDAO;

    private IdentityResolver resolver;
    private Cliente cliente;
    private Entrenador entrenador;

    @BeforeEach
    void setUp() {
        resolver = new IdentityResolver(clienteDAO, entrenadorDAO);
        cliente = new Cliente();
        cliente.setId(UUID.randomUUID());
        cliente.setEmail("cliente@nextfit.test");
        cliente.setRol("ROLE_CLIENTE");
        cliente.setContrasena("$2a$10$cliente");
        entrenador = new Entrenador();
        entrenador.setId(UUID.randomUUID());
        entrenador.setEmail("entrenador@nextfit.test");
        entrenador.setRol("ROLE_ENTRENADOR");
        entrenador.setContrasena("$2a$10$entrenador");
    }

    @Test
    void findByEmail_DevuelveClienteYNormalizaEmail() {
        when(clienteDAO.findByEmail("cliente@nextfit.test")).thenReturn(Optional.of(cliente));
        when(entrenadorDAO.findByEmail("cliente@nextfit.test")).thenReturn(Optional.empty());

        AuthenticatableIdentity identity = resolver.findByEmail(" Cliente@NextFit.Test ").orElseThrow();

        assertEquals(cliente.getId(), identity.userId());
        assertEquals("cliente@nextfit.test", identity.email());
        assertEquals(Role.CLIENTE, identity.role());
    }

    @Test
    void findByEmail_DevuelveEntrenador() {
        when(clienteDAO.findByEmail("entrenador@nextfit.test")).thenReturn(Optional.empty());
        when(entrenadorDAO.findByEmail("entrenador@nextfit.test")).thenReturn(Optional.of(entrenador));

        assertEquals(Role.ENTRENADOR, resolver.findByEmail("entrenador@nextfit.test").orElseThrow().role());
    }

    @Test
    void findByEmail_SinCoincidencias_DevuelveVacio() {
        when(clienteDAO.findByEmail("nadie@nextfit.test")).thenReturn(Optional.empty());
        when(entrenadorDAO.findByEmail("nadie@nextfit.test")).thenReturn(Optional.empty());

        assertFalse(resolver.findByEmail("nadie@nextfit.test").isPresent());
    }

    @Test
    void findByEmail_IdentidadAmbigua_LanzaErrorControlado() {
        when(clienteDAO.findByEmail("duplicado@nextfit.test")).thenReturn(Optional.of(cliente));
        when(entrenadorDAO.findByEmail("duplicado@nextfit.test")).thenReturn(Optional.of(entrenador));

        assertThrows(AmbiguousIdentityException.class, () -> resolver.findByEmail("duplicado@nextfit.test"));
    }
}
