package com.tuap.backend.dto;



import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class UltimaSesionResponseTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos el DTO principal
        UltimaSesionResponse response = new UltimaSesionResponse();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();
        LocalDateTime fechaPrueba = LocalDateTime.now();
        List<UltimaSesionResponse.SerieResponse> seriesPrueba = new ArrayList<>();

        // 2. Usamos los Setters
        response.setId(idPrueba);
        response.setNombre("Día de Pierna");
        response.setFechaHora(fechaPrueba);
        response.setDuracionSegundos(3600);
        response.setVolumenTotal(5500.5);
        response.setNotasGenerales("Muy buen entreno");
        response.setSeries(seriesPrueba);

        // 3. Verificamos con los Getters
        assertEquals(idPrueba, response.getId());
        assertEquals("Día de Pierna", response.getNombre());
        assertEquals(fechaPrueba, response.getFechaHora());
        assertEquals(3600, response.getDuracionSegundos());
        assertEquals(5500.5, response.getVolumenTotal());
        assertEquals("Muy buen entreno", response.getNotasGenerales());
        assertEquals(seriesPrueba, response.getSeries());
    }

    @Test
    void testConstructorLleno() {
        UUID id = UUID.randomUUID();
        LocalDateTime fecha = LocalDateTime.now();
        List<UltimaSesionResponse.SerieResponse> series = new ArrayList<>();

        UltimaSesionResponse response = new UltimaSesionResponse(
                id, "Día de Empuje", fecha, 4200, 6000.0, "Sin dolor", series
        );

        assertEquals(id, response.getId());
        assertEquals("Día de Empuje", response.getNombre());
        assertEquals(fecha, response.getFechaHora());
        assertEquals(4200, response.getDuracionSegundos());
        assertEquals(6000.0, response.getVolumenTotal());
        assertEquals("Sin dolor", response.getNotasGenerales());
        assertEquals(series, response.getSeries());
    }

    @Test
    void testClaseInternaSerieResponse() {
        // Prueba para la clase anidada estática (SerieResponse)
        UUID ejercicioId = UUID.randomUUID();
        
        UltimaSesionResponse.SerieResponse serie = new UltimaSesionResponse.SerieResponse(
                ejercicioId, "Sentadilla", 1, 100.0, 10, 8, true
        );

        // Verificamos los getters de la clase interna
        assertEquals(ejercicioId, serie.getEjercicioId());
        assertEquals("Sentadilla", serie.getEjercicioNombre());
        assertEquals(1, serie.getSetIndex());
        assertEquals(100.0, serie.getPeso());
        assertEquals(10, serie.getReps());
        assertEquals(8, serie.getRpe());
        assertTrue(serie.isHecho());
    }
}
