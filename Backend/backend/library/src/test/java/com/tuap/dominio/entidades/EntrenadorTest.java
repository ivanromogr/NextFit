package com.tuap.dominio.entidades;


import org.junit.jupiter.api.Test;
import java.util.ArrayList;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Entrenador;

class EntrenadorTest {

    @Test
    void testGettersYSetters() {
        // 1. Creamos la entidad
        Entrenador entrenador = new Entrenador();
        UUID idPrueba = UUID.randomUUID();

        // 2. Usamos todos los Setters
        entrenador.setId(idPrueba);
        entrenador.setNombre("Paco");
        entrenador.setApellido("García");
        entrenador.setEmail("paco@fit.com");
        entrenador.setContrasena("12345");
        entrenador.setRol("ENTRENADOR");
        entrenador.setEspecialidad("Fuerza");
        entrenador.setEdad(35);
        entrenador.setGenero("Masculino");
        entrenador.setAniosExperiencia(10);
        entrenador.setFormacion("INEF");
        entrenador.setDescripcionPerfil("Entrenador top");
        entrenador.setModalidadTrabajo("ONLINE");
        entrenador.setFotoPerfil("foto.jpg");
        entrenador.setBiografia("Bio de Paco");
        entrenador.setTituloAcademico("Grado en Ciencias del Deporte");
        entrenador.setTitulacion("Entrenador Personal");
        entrenador.setTarifaMensual(50.0);
        entrenador.setPerfilPublico(true);
        entrenador.setChats(new ArrayList<>());
        entrenador.setEntrenamientos(new ArrayList<>());

        // 3. Verificamos con los Getters (Esto le da el 100% de cobertura a la clase en Sonar)
        assertEquals(idPrueba, entrenador.getId());
        assertEquals("Paco", entrenador.getNombre());
        assertEquals("García", entrenador.getApellido());
        assertEquals("paco@fit.com", entrenador.getEmail());
        assertEquals("12345", entrenador.getContrasena());
        assertEquals("ENTRENADOR", entrenador.getRol());
        assertEquals("Fuerza", entrenador.getEspecialidad());
        assertEquals(35, entrenador.getEdad());
        assertEquals("Masculino", entrenador.getGenero());
        assertEquals(10, entrenador.getAniosExperiencia());
        assertEquals("INEF", entrenador.getFormacion());
        assertEquals("Entrenador top", entrenador.getDescripcionPerfil());
        assertEquals("ONLINE", entrenador.getModalidadTrabajo());
        assertEquals("foto.jpg", entrenador.getFotoPerfil());
        assertEquals("Bio de Paco", entrenador.getBiografia());
        assertEquals("Grado en Ciencias del Deporte", entrenador.getTituloAcademico());
        assertEquals("Entrenador Personal", entrenador.getTitulacion());
        assertEquals(50.0, entrenador.getTarifaMensual());
        assertTrue(entrenador.isPerfilPublico());
        assertNotNull(entrenador.getChats());
        assertNotNull(entrenador.getEntrenamientos());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos que el constructor lleno también funcione y sume cobertura
        Entrenador entrenador = new Entrenador(
            "Maria", "López", "maria@fit.com", "pass", "ENTRENADOR", 
            "Hipertrofia", 28, "Femenino", 5, "Curso NSCA", 
            "Especialista en glúteo", "PRESENCIAL", "maria.jpg"
        );

        assertEquals("Maria", entrenador.getNombre());
        assertEquals("Hipertrofia", entrenador.getEspecialidad());
    }
}