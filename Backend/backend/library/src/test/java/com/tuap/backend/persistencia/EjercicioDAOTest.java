package com.tuap.backend.persistencia;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import com.tuap.backend.dominio.entidades.Ejercicio;

@DataJpaTest // 🪄 MAGIA: Levanta la base de datos en memoria (H2) solo para este test
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class EjercicioDAOTest {

    @Autowired
    private EjercicioDAO ejercicioDAO;

    private Ejercicio domi;
    private Ejercicio press;
    private Ejercicio flexiones;

    @BeforeEach
    void setUp() {
        // 1. Limpiamos la BD en memoria por si acaso
        ejercicioDAO.deleteAll();

        // 2. Creamos ejercicios de prueba para jugar con ellos
        domi = new Ejercicio();
        domi.setNombre("Dominadas");
        domi.setGrupoMuscular("Espalda");
        domi.setEquipamiento("Peso Corporal");

        press = new Ejercicio();
        press.setNombre("Press Banca");
        press.setGrupoMuscular("Pecho");
        press.setEquipamiento("Barra"); // ⚠️ No apto para casa

        flexiones = new Ejercicio();
        flexiones.setNombre("Flexiones Diamante");
        flexiones.setGrupoMuscular("Pecho");
        flexiones.setEquipamiento("Peso Corporal"); // ✅ Apto para casa

        // Los guardamos en nuestra base de datos temporal
        ejercicioDAO.save(domi);
        ejercicioDAO.save(press);
        ejercicioDAO.save(flexiones);
    }

    // 🟢 TEST 1: Buscar Avanzado (Filtro por nombre ignorando mayúsculas)
    @Test
    void buscarAvanzado_PorNombre_DevuelveCoincidencias() {
        // Buscamos "DOMI" en mayúsculas, debería encontrar "Dominadas"
        List<Ejercicio> resultado = ejercicioDAO.buscarAvanzado("DOMI", null);

        assertEquals(1, resultado.size());
        assertEquals("Dominadas", resultado.get(0).getNombre());
    }

    // 🟢 TEST 2: Buscar Avanzado (Filtro por músculo exacto)
    @Test
    void buscarAvanzado_PorMusculo_DevuelveCoincidencias() {
        // Buscamos Pecho, deberían salir el Press Banca y las Flexiones
        List<Ejercicio> resultado = ejercicioDAO.buscarAvanzado(null, "Pecho");

        assertEquals(2, resultado.size());
    }

    // 🟢 TEST 3: Buscar Avanzado (Filtros vacíos devuelven todo)
    @Test
    void buscarAvanzado_SinFiltros_DevuelveTodos() {
        List<Ejercicio> resultado = ejercicioDAO.buscarAvanzado(null, null);

        assertEquals(3, resultado.size());
    }

    // 🟢 TEST 4: Buscar por Nombre simple (El buscador manual)
    @Test
    void buscarPorNombre_TextoParcial_DevuelveCoincidencias() {
        // Buscamos "flex", debería sacar "Flexiones Diamante"
        List<Ejercicio> resultado = ejercicioDAO.buscarPorNombre("flex");

        assertEquals(1, resultado.size());
        assertTrue(resultado.get(0).getNombre().contains("Flexiones"));
    }

    // 🟢 TEST 5: Consulta Nativa (Ejercicio Aleatorio para CASA)
    @Test
    void encontrarEjercicioAleatorio_ParaCasa_FiltraEquipamientoCorrectamente() {
        // --- LA TRAMPA DEL TEST ---
        // Le pedimos un ejercicio de "Pecho" para hacer "en casa" (true).
        // En nuestra BD hay dos de Pecho: Press Banca (Barra) y Flexiones (Peso Corporal).
        // Si tu SQL nativo funciona, DEBE excluir el Press Banca obligatoriamente y devolver las flexiones.
        
        Ejercicio aleatorio = ejercicioDAO.encontrarEjercicioAleatorio("Pecho", true);

        assertNotNull(aleatorio);
        assertEquals("Flexiones Diamante", aleatorio.getNombre());
        assertEquals("Peso Corporal", aleatorio.getEquipamiento());
    }

    // 🟢 TEST 6: El método derivado de Spring (findFirstBy...)
    @Test
    void findFirstByNombreContainingIgnoreCase_DevuelveElPrimeroQueCoincida() {
        Optional<Ejercicio> encontrado = ejercicioDAO.findFirstByNombreContainingIgnoreCase("banca");

        assertTrue(encontrado.isPresent());
        assertEquals("Press Banca", encontrado.get().getNombre());
    }
}