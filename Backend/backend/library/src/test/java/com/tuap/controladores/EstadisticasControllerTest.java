package com.tuap.controladores;


import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.tuap.backend.controladores.EstadisticasController;
import com.tuap.backend.dominio.gestores.GestorEstadisticas;

@ExtendWith(MockitoExtension.class)
class EstadisticasControllerTest {

    @InjectMocks
    private EstadisticasController estadisticasController;

    @Mock
    private GestorEstadisticas gestorEstadisticas;

    private UUID clienteId;
    private UUID entrenadorId;
    private UUID ejercicioId;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        entrenadorId = UUID.randomUUID();
        ejercicioId = UUID.randomUUID();
    }

    // 🟢 TEST 1: Estadísticas Globales
    @Test
    void getGlobalStats_DevuelveDatosYStatus200() {
        // --- PREPARACIÓN ---
        Map<String, Object> mockStats = new HashMap<>();
        mockStats.put("totalEntrenos", 15);
        mockStats.put("volumenTotal", "10t");
        
        when(gestorEstadisticas.obtenerStatsGlobales(clienteId, entrenadorId)).thenReturn(mockStats);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = estadisticasController.getGlobalStats(clienteId, entrenadorId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(mockStats, respuesta.getBody());
        verify(gestorEstadisticas, times(1)).obtenerStatsGlobales(clienteId, entrenadorId);
    }

    // 🟢 TEST 2: Progreso Ejercicio (Con datos, Camino Feliz)
    @Test
    void getExerciseStats_ConDatos_Devuelve200() {
        // --- PREPARACIÓN ---
        Map<String, Object> mockProgreso = new HashMap<>();
        mockProgreso.put("pr", 100.0);
        
        when(gestorEstadisticas.obtenerProgresoEjercicio(clienteId, ejercicioId, entrenadorId)).thenReturn(mockProgreso);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = estadisticasController.getExerciseStats(clienteId, ejercicioId, entrenadorId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(mockProgreso, respuesta.getBody());
    }

    // 🔴 TEST 3: Progreso Ejercicio (Sin datos, Camino Triste)
    @Test
    void getExerciseStats_SinDatos_Devuelve204NoContent() {
        // --- PREPARACIÓN ---
        // Simulamos que el gestor devuelve null porque el cliente nunca ha hecho ese ejercicio
        when(gestorEstadisticas.obtenerProgresoEjercicio(clienteId, ejercicioId, null)).thenReturn(null);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = estadisticasController.getExerciseStats(clienteId, ejercicioId, null);

        // --- COMPROBACIÓN ---
        // Verificamos que tu código detecta el null y lanza un 204 No Content
        assertEquals(HttpStatus.NO_CONTENT, respuesta.getStatusCode());
        assertNull(respuesta.getBody());
    }

    // 🟢 TEST 4: Récords Personales (PRs)
    @Test
    void getPersonalRecords_DevuelveListaYStatus200() {
        // --- PREPARACIÓN ---
        List<Map<String, Object>> mockPrs = Collections.emptyList();
        when(gestorEstadisticas.obtenerPersonalRecords(clienteId, entrenadorId)).thenReturn(mockPrs);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = estadisticasController.getPersonalRecords(clienteId, entrenadorId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(mockPrs, respuesta.getBody());
    }
}