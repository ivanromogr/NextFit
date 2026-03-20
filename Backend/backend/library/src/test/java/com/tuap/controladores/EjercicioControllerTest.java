package com.tuap.controladores;


import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tuap.backend.controladores.EjercicioController;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

@ExtendWith(MockitoExtension.class)
class EjercicioControllerTest {

    @InjectMocks
    private EjercicioController ejercicioController;

    @Mock
    private EjercicioDAO ejercicioDAO;

    private Ejercicio ejercicioMock;

    @BeforeEach
    void setUp() {
        ejercicioMock = new Ejercicio();
        ejercicioMock.setId(UUID.randomUUID());
        ejercicioMock.setNombre("Dominadas");
        ejercicioMock.setGrupoMuscular("Espalda");
    }

    // 🟢 TEST 1: Obtener todos los ejercicios
    @Test
    void obtenerTodos_DevuelveListaDeEjercicios() {
        // --- PREPARACIÓN ---
        when(ejercicioDAO.findAll()).thenReturn(Arrays.asList(ejercicioMock));

        // --- ACCIÓN ---
        List<Ejercicio> resultado = ejercicioController.obtenerTodos();

        // --- COMPROBACIÓN ---
        assertEquals(1, resultado.size());
        assertEquals("Dominadas", resultado.get(0).getNombre());
        verify(ejercicioDAO, times(1)).findAll();
    }

    // 🟢 TEST 2: Buscar con filtros válidos
    @Test
    void buscar_ConParametrosValidos_LlamaADaoConFiltros() {
        // --- PREPARACIÓN ---
        when(ejercicioDAO.buscarAvanzado("Dominadas", "Espalda")).thenReturn(Arrays.asList(ejercicioMock));

        // --- ACCIÓN ---
        List<Ejercicio> resultado = ejercicioController.buscar("Dominadas", "Espalda");

        // --- COMPROBACIÓN ---
        assertEquals(1, resultado.size());
        // Verificamos que le pasó los parámetros correctos a la BBDD
        verify(ejercicioDAO, times(1)).buscarAvanzado("Dominadas", "Espalda");
    }

    // 🟢 TEST 3: Buscar con textos vacíos ("") los convierte a null
    @Test
    void buscar_ConTextosVacios_LlamaADaoConNulos() {
        // --- PREPARACIÓN ---
        // Si le pasamos nulls, la base de datos devuelve todos
        when(ejercicioDAO.buscarAvanzado(null, null)).thenReturn(Arrays.asList(ejercicioMock));

        // --- ACCIÓN ---
        // Simulamos que el frontend (el móvil) manda los campos de búsqueda vacíos
        List<Ejercicio> resultado = ejercicioController.buscar("", "");

        // --- COMPROBACIÓN ---
        assertEquals(1, resultado.size());
        
        // ¡Magia! Verificamos que tu lógica del controlador (el operador ternario '? :') 
        // transformó los "" en nulls antes de hablar con la BBDD
        verify(ejercicioDAO, times(1)).buscarAvanzado(null, null);
    }
}
