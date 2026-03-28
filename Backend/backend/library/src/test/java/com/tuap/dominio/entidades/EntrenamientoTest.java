package com.tuap.dominio.entidades;


import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Entrenamiento;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;

class EntrenamientoTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad
        Entrenamiento entrenamiento = new Entrenamiento();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();
        Entrenador entrenadorPrueba = new Entrenador();
        Cliente clientePrueba = new Cliente();
        String tituloPrueba = "Rutina de Piernas";
        String descripcionPrueba = "Sentadillas y prensa";

        // 2. Usamos todos los Setters
        entrenamiento.setId(idPrueba);
        entrenamiento.setTitulo(tituloPrueba);
        entrenamiento.setEntrenador(entrenadorPrueba);
        entrenamiento.setCliente(clientePrueba);
        entrenamiento.setDescripcion(descripcionPrueba);

        // 3. Verificamos con los Getters (100% Coverage)
        assertEquals(idPrueba, entrenamiento.getId());
        assertEquals(tituloPrueba, entrenamiento.getTitulo());
        assertEquals(entrenadorPrueba, entrenamiento.getEntrenador());
        assertEquals(clientePrueba, entrenamiento.getCliente());
        assertEquals(descripcionPrueba, entrenamiento.getDescripcion());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos el constructor lleno
        UUID id = UUID.randomUUID();
        Entrenador entrenador = new Entrenador();
        Cliente cliente = new Cliente();

        Entrenamiento entrenamiento = new Entrenamiento(id, "Brazos", entrenador, cliente, "Biceps y Triceps");

        assertEquals(id, entrenamiento.getId());
        assertEquals("Brazos", entrenamiento.getTitulo());
        assertEquals("Biceps y Triceps", entrenamiento.getDescripcion());
        assertEquals(entrenador, entrenamiento.getEntrenador());
        assertEquals(cliente, entrenamiento.getCliente());
    }
}