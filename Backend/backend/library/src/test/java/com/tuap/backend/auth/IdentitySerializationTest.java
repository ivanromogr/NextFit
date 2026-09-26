package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;

class IdentitySerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void cliente_NoSerializaContrasena() throws Exception {
        Cliente cliente = new Cliente();
        cliente.setContrasena("hash-secreto");

        assertFalse(objectMapper.writeValueAsString(cliente).contains("contrasena"));
        assertFalse(objectMapper.writeValueAsString(cliente).contains("hash-secreto"));
    }

    @Test
    void entrenador_NoSerializaContrasena() throws Exception {
        Entrenador entrenador = new Entrenador();
        entrenador.setContrasena("hash-secreto");

        assertFalse(objectMapper.writeValueAsString(entrenador).contains("contrasena"));
        assertFalse(objectMapper.writeValueAsString(entrenador).contains("hash-secreto"));
    }
}
