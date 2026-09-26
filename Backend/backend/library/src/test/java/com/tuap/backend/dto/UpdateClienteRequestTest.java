package com.tuap.backend.dto;



import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UpdateClienteRequestTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos el DTO
        UpdateClienteRequest req = new UpdateClienteRequest();

        // 2. Usamos los Setters
        req.setNombre("Lucía");
        req.setApellido("Fernández");
        req.setEmail("lucia@ejemplo.com");
        req.setFotoPerfil("lucia.png");
        req.setPeso(62.5);
        req.setAltura(168);
        req.setObjetivo("Tonificar");
        req.setGenero("Femenino");

        // 3. Verificamos con los Getters (100% Coverage)
        assertEquals("Lucía", req.getNombre());
        assertEquals("Fernández", req.getApellido());
        assertEquals("lucia@ejemplo.com", req.getEmail());
        assertEquals("lucia.png", req.getFotoPerfil());
        assertEquals(62.5, req.getPeso());
        assertEquals(168, req.getAltura());
        assertEquals("Tonificar", req.getObjetivo());
        assertEquals("Femenino", req.getGenero());
    }
}
