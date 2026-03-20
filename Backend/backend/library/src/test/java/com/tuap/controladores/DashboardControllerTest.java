package com.tuap.controladores;


import java.time.LocalDate;
import java.util.Arrays;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.tuap.backend.controladores.DashboardController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.persistencia.EventoCalendarioDAO;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @InjectMocks
    private DashboardController dashboardController;

    @Mock
    private EventoCalendarioDAO eventoDAO;

    private UUID clienteId;
    private Cliente clienteMock;
    private Rutina rutinaMock;
    private LocalDate hoy;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        
        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        
        rutinaMock = new Rutina();
        rutinaMock.setId(UUID.randomUUID());
        rutinaMock.setNombre("Rutina Híbrida");

        hoy = LocalDate.now();
    }

    // 🟢 TEST 1: Resumen con datos, calcula racha y volumen correctamente
    @Test
    void getResumen_ConEventosYRutinaHoy_CalculaEstadisticasYRacha() {
     
        // Evento de ayer (Completado)
        EventoCalendario eventoAyer = new EventoCalendario();
        eventoAyer.setId(UUID.randomUUID());
        eventoAyer.setFecha(hoy.minusDays(1));
        eventoAyer.setCompletado(true);
        eventoAyer.setVolumenTotal(2000.0);
        eventoAyer.setRutina(rutinaMock);

        // Evento de hoy (Pendiente)
        EventoCalendario eventoHoy = new EventoCalendario();
        eventoHoy.setId(UUID.randomUUID());
        eventoHoy.setFecha(hoy);
        eventoHoy.setCompletado(false);
        eventoHoy.setVolumenTotal(0.0);
        eventoHoy.setRutina(rutinaMock);

        // Simulamos la búsqueda de la semana
        when(eventoDAO.findByClienteIdAndFechaBetween(eq(clienteId), any(LocalDate.class), any(LocalDate.class)))
            .thenReturn(Arrays.asList(eventoAyer, eventoHoy));

        // Simulamos el historial para la racha (El código espera recibir los eventos ordenados por fecha descendente: hoy, ayer...)
        when(eventoDAO.findByClienteIdAndFechaLessThanEqualOrderByFechaDesc(clienteId, hoy))
            .thenReturn(Arrays.asList(eventoHoy, eventoAyer));

        // --- ACCIÓN ---
        ResponseEntity<Map<String, Object>> respuesta = dashboardController.getResumen(clienteId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = respuesta.getBody();
        assertNotNull(body);

        // 1 entreno completado (el de ayer)
        assertEquals(1L, body.get("entrenosHechos")); 
        // 2 entrenos programados en total para la semana
        assertEquals(2L, body.get("entrenosObjetivo")); 
        // Solo cuenta el volumen del entreno de ayer
        assertEquals(2000.0, body.get("volumenSemana")); 
        
        // Verifica la lógica de Racha: Hoy no está completado, pero como es hoy, la racha no se rompe. 
        // Ayer sí se completó. Total de racha = 1.
        assertEquals(1, body.get("rachaActual")); 

        // Verifica que detecta el evento de hoy
        Map<String, Object> infoHoy = (Map<String, Object>) body.get("eventoHoy");
        assertNotNull(infoHoy);
        assertEquals("Rutina Híbrida", infoHoy.get("rutinaNombre"));
    }

    // 🟢 TEST 2: Usuario nuevo sin historial (Todo a cero)
    @Test
    void getResumen_SinHistorial_DevuelveTodoACero() {
        // --- PREPARACIÓN ---
        when(eventoDAO.findByClienteIdAndFechaBetween(any(), any(), any())).thenReturn(Collections.emptyList());
        when(eventoDAO.findByClienteIdAndFechaLessThanEqualOrderByFechaDesc(any(), any())).thenReturn(Collections.emptyList());

        // --- ACCIÓN ---
        ResponseEntity<Map<String, Object>> respuesta = dashboardController.getResumen(clienteId);

        // --- COMPROBACIÓN ---
        Map<String, Object> body = respuesta.getBody();
        assertEquals(0L, body.get("entrenosHechos"));
        assertEquals(4L, body.get("entrenosObjetivo")); // Tu código pone 4 por defecto si no hay nada
        assertEquals(0.0, body.get("volumenSemana"));
        assertEquals(0, body.get("rachaActual"));
        assertNull(body.get("eventoHoy")); // No hay rutina para hoy
    }

    // 🔴 TEST 3: Racha rota (Ayer no se entrenó)
    @Test
    void getResumen_AyerNoEntreno_RompeLaRacha() {
        // --- PREPARACIÓN ---
        // Hace 2 días (Completado)
        EventoCalendario eventoHace2Dias = new EventoCalendario();
        eventoHace2Dias.setFecha(hoy.minusDays(2));
        eventoHace2Dias.setCompletado(true);

        // Ayer (NO Completado) -> ¡Debería romper la racha!
        EventoCalendario eventoAyer = new EventoCalendario();
        eventoAyer.setFecha(hoy.minusDays(1));
        eventoAyer.setCompletado(false);

        // Simulamos la lista de la semana (vacía para simplificar, no nos importa para este test)
        when(eventoDAO.findByClienteIdAndFechaBetween(any(), any(), any())).thenReturn(Collections.emptyList());

        // Simulamos el historial ordenado: Ayer (falso), Hace 2 días (true)
        when(eventoDAO.findByClienteIdAndFechaLessThanEqualOrderByFechaDesc(clienteId, hoy))
            .thenReturn(Arrays.asList(eventoAyer, eventoHace2Dias));

        // --- ACCIÓN ---
        ResponseEntity<Map<String, Object>> respuesta = dashboardController.getResumen(clienteId);

        // --- COMPROBACIÓN ---
        // La racha debe ser 0 porque ayer no se completó, cortando el conteo de días anteriores.
        assertEquals(0, respuesta.getBody().get("rachaActual"));
    }
}