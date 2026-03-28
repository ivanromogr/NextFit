package com.tuap.dominio.entidades;



import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Mensaje;
class MensajeTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad
        Mensaje mensaje = new Mensaje();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();
        UUID remitenteId = UUID.randomUUID();
        UUID destinatarioId = UUID.randomUUID();
        LocalDateTime fecha = LocalDateTime.now();

        // 2. Usamos todos los Setters
        mensaje.setId(idPrueba);
        mensaje.setRemitenteId(remitenteId);
        mensaje.setDestinatarioId(destinatarioId);
        mensaje.setArchivoUrl("http://ruta.com/foto.jpg");
        mensaje.setTipoArchivo("IMAGEN");
        mensaje.setContenido("Hola, ¿cómo vas con la rutina?");
        mensaje.setFechaHora(fecha);
        mensaje.setLeido(true);

        // 3. Verificamos con los Getters (100% Coverage)
        assertEquals(idPrueba, mensaje.getId());
        assertEquals(remitenteId, mensaje.getRemitenteId());
        assertEquals(destinatarioId, mensaje.getDestinatarioId());
        assertEquals("http://ruta.com/foto.jpg", mensaje.getArchivoUrl());
        assertEquals("IMAGEN", mensaje.getTipoArchivo());
        assertEquals("Hola, ¿cómo vas con la rutina?", mensaje.getContenido());
        assertEquals(fecha, mensaje.getFechaHora());
        assertTrue(mensaje.isLeido());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos el constructor útil
        UUID remitenteId = UUID.randomUUID();
        UUID destinatarioId = UUID.randomUUID();
        String contenido = "Mensaje de prueba";

        Mensaje mensaje = new Mensaje(remitenteId, destinatarioId, contenido);

        assertEquals(remitenteId, mensaje.getRemitenteId());
        assertEquals(destinatarioId, mensaje.getDestinatarioId());
        assertEquals(contenido, mensaje.getContenido());
        assertNotNull(mensaje.getFechaHora()); // El constructor asigna la fecha actual
        assertFalse(mensaje.isLeido()); // Por defecto es false
    }
}