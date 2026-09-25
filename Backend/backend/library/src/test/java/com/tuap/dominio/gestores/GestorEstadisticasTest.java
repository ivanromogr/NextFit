package com.tuap.dominio.gestores;


import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.entidades.SerieRealizada;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dominio.gestores.GestorEstadisticas;
import com.tuap.backend.persistencia.SerieRealizadaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@ExtendWith(MockitoExtension.class)
class GestorEstadisticasTest {

    @InjectMocks
    private GestorEstadisticas gestorEstadisticas;

    @Mock
    private SesionEntrenamientoDAO sesionDAO;
    
    @Mock
    private SerieRealizadaDAO serieDAO;

    private UUID clienteId;
    private UUID entrenadorId;
    private UUID ejercicioId;

    private SesionEntrenamiento sesionReciente;
    private SesionEntrenamiento sesionAntigua;
    private SerieRealizada serieFuerza;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        entrenadorId = UUID.randomUUID();
        ejercicioId = UUID.randomUUID();

        // 1. Preparamos una rutina asignada a un entrenador
        Rutina rutinaEntrenador = new Rutina();
        rutinaEntrenador.setEntrenadorId(entrenadorId);

        // 2. Preparamos una Sesión de Entrenamiento (Ayer)
        sesionReciente = new SesionEntrenamiento();
        sesionReciente.setId(UUID.randomUUID());
        sesionReciente.setFechaHora(LocalDateTime.now().minusDays(1)); // Hace 1 día
        sesionReciente.setDuracionSegundos(3600); // 1 hora
        sesionReciente.setVolumenTotal(5000.0);
        sesionReciente.setRutina(rutinaEntrenador);

        // 3. Preparamos una Sesión Antigua (Hace 10 días)
        sesionAntigua = new SesionEntrenamiento();
        sesionAntigua.setId(UUID.randomUUID());
        sesionAntigua.setFechaHora(LocalDateTime.now().minusDays(10));
        sesionAntigua.setDuracionSegundos(1800); // 30 mins
        sesionAntigua.setVolumenTotal(3000.0);
        // Esta rutina NO tiene entrenador (Rutina Libre)
        sesionAntigua.setRutina(new Rutina()); 

        // 4. Preparamos un Ejercicio y su Serie
        Ejercicio pressBanca = new Ejercicio();
        pressBanca.setId(ejercicioId);
        pressBanca.setNombre("Press Banca");
        pressBanca.setGrupoMuscular("Pecho");

        serieFuerza = new SerieRealizada();
        serieFuerza.setEjercicio(pressBanca);
        serieFuerza.setPeso(100.0);
        serieFuerza.setReps(10);
        serieFuerza.setHecho(true);
        serieFuerza.setSesion(sesionReciente);

        sesionReciente.setSeries(Arrays.asList(serieFuerza));
    }

    @Test
    void obtenerStatsGlobales_SinEntrenador_CalculaTotalesCorrectamente() {
        // --- PREPARACIÓN ---
        // La BBDD devuelve las dos sesiones
        when(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId))
            .thenReturn(Arrays.asList(sesionReciente, sesionAntigua));

        // --- ACCIÓN ---
        // Llamamos al método pasándole 'null' como entrenador (queremos ver TODO)
        Map<String, Object> stats = gestorEstadisticas.obtenerStatsGlobales(clienteId, null);

        // --- COMPROBACIÓN ---
        assertNotNull(stats);
        assertEquals(2, stats.get("totalEntrenos")); // 2 sesiones en total
        // Volumen total: 5000 + 3000 = 8000kg. Como lo divides por 1000, debería ser "8t"
        assertEquals("8t", stats.get("volumenTotal")); 
        // Horas: 3600s + 1800s = 5400s (1.5 horas). Al redondear es 1 hora (según tu lógica de redondeo)
       assertEquals(2L, stats.get("horasEntrenadas"));
    }

    @Test
    void obtenerStatsGlobales_ConEntrenador_FiltraSesionesPrivadas() {
        // --- PREPARACIÓN ---
        when(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId))
            .thenReturn(Arrays.asList(sesionReciente, sesionAntigua));

        // --- ACCIÓN ---
        // Pasamos el ID del entrenador. Debería ignorar la 'sesionAntigua'
        Map<String, Object> stats = gestorEstadisticas.obtenerStatsGlobales(clienteId, entrenadorId);

        // --- COMPROBACIÓN ---
        assertEquals(1, stats.get("totalEntrenos")); // Solo cuenta la sesión del entrenador
        assertEquals("5t", stats.get("volumenTotal")); // Solo cuenta los 5000kg de esa sesión
    }

    @Test
    void obtenerProgresoEjercicio_Calcula1RMYPersonalRecord() {
        // --- PREPARACIÓN ---
        // Simulamos que el cliente ha hecho 1 serie de 100kg a 10 repeticiones
        when(serieDAO.findHistorialEjercicio(clienteId, ejercicioId))
            .thenReturn(Arrays.asList(serieFuerza));

        // --- ACCIÓN ---
        Map<String, Object> progreso = gestorEstadisticas.obtenerProgresoEjercicio(clienteId, ejercicioId, null);

        // --- COMPROBACIÓN ---
        assertNotNull(progreso);
        
        // El Personal Record de peso bruto debería ser 100.0kg
        assertEquals(100.0, progreso.get("pr"));
        
        // Verificamos la fórmula del 1RM: 100 * (1 + 10/30) = 133.33
        List<Map<String, Object>> grafica = (List<Map<String, Object>>) progreso.get("grafica");
        assertEquals(1, grafica.size()); // Debería haber 1 punto en la gráfica
        assertEquals(133.33, grafica.get(0).get("valor")); // Verifica el cálculo matemático
    }
}
