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
import com.tuap.backend.dominio.gestores.GestorEjerciciosApi;
import com.tuap.backend.dto.EjercicioResponse;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.servicios.EjercicioSeeder;
import com.tuap.backend.servicios.TraductorEjercicios;

@ExtendWith(MockitoExtension.class)
class EjercicioControllerTest {

    @InjectMocks
    private EjercicioController ejercicioController;

    @Mock
    private EjercicioDAO ejercicioDAO;

    @Mock
    private GestorEjerciciosApi gestorEjerciciosApi;

    @Mock
    private EjercicioSeeder ejercicioSeeder;

    @Mock
    private TraductorEjercicios traductorEjercicios;

    private Ejercicio ejercicioMock;

    @BeforeEach
    void setUp() {
        ejercicioMock = new Ejercicio();
        ejercicioMock.setId(UUID.randomUUID());
        ejercicioMock.setNombre("Dominadas");
        ejercicioMock.setGrupoMuscular("Espalda");
        ejercicioMock.setEquipamiento("Peso corporal");
    }

    @Test
    void obtenerTodos_DevuelveListaDeEjercicios() {
        // --- PREPARACIÓN ---
        when(ejercicioDAO.findAll()).thenReturn(Arrays.asList(ejercicioMock));
        when(traductorEjercicios.traducirMusculoAEspanol("Espalda")).thenReturn("Espalda");

        // --- ACCIÓN ---
        List<EjercicioResponse> resultado = ejercicioController.obtenerTodos();

        // --- COMPROBACIÓN ---
        assertEquals(1, resultado.size());
        assertEquals("Dominadas", resultado.get(0).getNombre());
        verify(ejercicioDAO, times(1)).findAll();
    }

    @Test
    void buscar_ConParametrosValidos_LlamaADaoConFiltros() {
        // --- PREPARACIÓN ---
        when(ejercicioDAO.buscarAvanzadoConListaMusculos("Dominadas", Arrays.asList("back", "lats", "traps", "spine", "rhomboids")))
                .thenReturn(Arrays.asList(ejercicioMock));
        when(traductorEjercicios.traducirMusculoAEspanol("Espalda")).thenReturn("Espalda");

        // --- ACCIÓN ---
        List<EjercicioResponse> resultado = ejercicioController.buscar("Dominadas", "Espalda");

        // --- COMPROBACIÓN ---
        assertEquals(1, resultado.size());
        // Verificamos que le pasó los parámetros correctos a la BBDD
        verify(ejercicioDAO, times(1))
                .buscarAvanzadoConListaMusculos("Dominadas", Arrays.asList("back", "lats", "traps", "spine", "rhomboids"));
    }

    @Test
    void buscar_ConTextosVacios_LlamaADaoConNulos() {
        // --- PREPARACIÓN ---
        // Si le pasamos nulls, la base de datos devuelve todos
        when(ejercicioDAO.findAll()).thenReturn(Arrays.asList(ejercicioMock));
        when(traductorEjercicios.traducirMusculoAEspanol("Espalda")).thenReturn("Espalda");

        // --- ACCIÓN ---
        // Simulamos que el frontend (el móvil) manda los campos de búsqueda vacíos
        List<EjercicioResponse> resultado = ejercicioController.buscar("", "");

        // --- COMPROBACIÓN ---
        assertEquals(1, resultado.size());
        
        // transformó los "" en nulls antes de hablar con la BBDD
        verify(ejercicioDAO, times(1)).findAll();
    }
}
