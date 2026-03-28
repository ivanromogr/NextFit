package com.tuap.dominio.entidades;



import org.junit.jupiter.api.Test;

import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Progreso;
class ProgresoTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad
        Progreso progreso = new Progreso();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();
        UUID entrenamientoIdPrueba = UUID.randomUUID();
        UUID clienteIdPrueba = UUID.randomUUID();
        Date fechaPrueba = new Date();

        // 2. Usamos todos los Setters
        progreso.setId(idPrueba);
        progreso.setEntrenamientoid(entrenamientoIdPrueba);
        progreso.setClienteid(clienteIdPrueba);
        progreso.setNotas("Buen progreso en sentadilla");
        progreso.setPesoactual(85.5f);
        progreso.setPesomaximo(100.0f);
        progreso.setFecha(fechaPrueba);

        // 3. Verificamos con los Getters (100% Coverage)
        assertEquals(idPrueba, progreso.getId());
        assertEquals(entrenamientoIdPrueba, progreso.getEntrenamientoid());
        assertEquals(clienteIdPrueba, progreso.getClienteid());
        assertEquals("Buen progreso en sentadilla", progreso.getNotas());
        assertEquals(85.5f, progreso.getPesoactual());
        assertEquals(100.0f, progreso.getPesomaximo());
        assertEquals(fechaPrueba, progreso.getFecha());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos el constructor lleno para subir cobertura extra
        UUID id = UUID.randomUUID();
        UUID entrenamientoId = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        Date fecha = new Date();

        Progreso progreso = new Progreso(id, entrenamientoId, clienteId, "Notas de prueba", 70.0f, 90.0f, fecha);

        assertEquals(id, progreso.getId());
        assertEquals("Notas de prueba", progreso.getNotas());
        assertEquals(70.0f, progreso.getPesoactual());
    }
}