package com.tuap.backend.dto;



import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class UpdateEntrenadorRequestTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos el DTO
        UpdateEntrenadorRequest req = new UpdateEntrenadorRequest();

        // 2. Usamos todos los setters
        req.setNombre("Carlos");
        req.setApellido("Santana");
        req.setEmail("carlos@gym.com");
        req.setContrasena("secreta123");
        req.setEspecialidad("Musculacion");
        req.setEdad(35);
        req.setGenero("Masculino");
        req.setAniosExperiencia(8);
        req.setFormacion("Grado Superior TAFAD");
        req.setDescripcionPerfil("Te ayudo a ponerte fuerte.");
        req.setModalidadTrabajo("Presencial");
        req.setFotoPerfil("carlos.png");

        // 3. Verificamos que los getters devuelven lo que hemos seteado (100% Coverage)
        assertEquals("Carlos", req.getNombre());
        assertEquals("Santana", req.getApellido());
        assertEquals("carlos@gym.com", req.getEmail());
        assertEquals("secreta123", req.getContrasena());
        assertEquals("Musculacion", req.getEspecialidad());
        assertEquals(35, req.getEdad());
        assertEquals("Masculino", req.getGenero());
        assertEquals(8, req.getAniosExperiencia());
        assertEquals("Grado Superior TAFAD", req.getFormacion());
        assertEquals("Te ayudo a ponerte fuerte.", req.getDescripcionPerfil());
        assertEquals("Presencial", req.getModalidadTrabajo());
        assertEquals("carlos.png", req.getFotoPerfil());
    }
}
