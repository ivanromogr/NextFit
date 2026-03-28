package com.tuap.dominio.entidades;


import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Ejercicio;
class EjercicioTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad
        Ejercicio ejercicio = new Ejercicio();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();

        // 2. Usamos todos los Setters
        ejercicio.setId(idPrueba);
        ejercicio.setApiId("api-12345");
        ejercicio.setNombre("Press de Banca");
        ejercicio.setGrupoMuscular("Pecho");
        ejercicio.setEquipamiento("Barra");
        ejercicio.setParteCuerpo("Torso");
        ejercicio.setImagenUrl("http://rutaimagen.com/press.jpg");
        ejercicio.setVideoUrl("http://rutavideo.com/press.mp4");
        ejercicio.setDificultad("Intermedio");
        ejercicio.setInstrucciones("Bajar la barra hasta el pecho y empujar con fuerza.");

        // 3. Verificamos con los Getters (100% Coverage para esta clase)
        assertEquals(idPrueba, ejercicio.getId());
        assertEquals("api-12345", ejercicio.getApiId());
        assertEquals("Press de Banca", ejercicio.getNombre());
        assertEquals("Pecho", ejercicio.getGrupoMuscular());
        assertEquals("Barra", ejercicio.getEquipamiento());
        assertEquals("Torso", ejercicio.getParteCuerpo());
        assertEquals("http://rutaimagen.com/press.jpg", ejercicio.getImagenUrl());
        assertEquals("http://rutavideo.com/press.mp4", ejercicio.getVideoUrl());
        assertEquals("Intermedio", ejercicio.getDificultad());
        assertEquals("Bajar la barra hasta el pecho y empujar con fuerza.", ejercicio.getInstrucciones());
    }
}