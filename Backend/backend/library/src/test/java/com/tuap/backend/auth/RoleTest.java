package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class RoleTest {

    @Test
    void toAuthority_UsaAuthoritySpringCanonica() {
        assertEquals("ROLE_CLIENTE", Role.CLIENTE.toAuthority());
        assertEquals("ROLE_ENTRENADOR", Role.ENTRENADOR.toAuthority());
    }

    @Test
    void fromStoredValue_NormalizaFormatosPersistidos() {
        assertEquals(Role.CLIENTE, Role.fromStoredValue("ROLE_CLIENTE"));
        assertEquals(Role.CLIENTE, Role.fromStoredValue(" cliente "));
        assertEquals(Role.ENTRENADOR, Role.fromStoredValue("ROLE_ENTRENADOR"));
        assertEquals(Role.ENTRENADOR, Role.fromStoredValue("entrenador"));
    }

    @Test
    void fromStoredValue_RechazaRolesNoSoportados() {
        assertThrows(IllegalArgumentException.class, () -> Role.fromStoredValue("ADMIN"));
    }
}
