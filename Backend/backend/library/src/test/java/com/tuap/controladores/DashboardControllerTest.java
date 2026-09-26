package com.tuap.controladores;


import java.time.LocalDate;
import java.time.LocalDateTime;
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
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock private com.tuap.backend.auth.OwnershipService ownershipService;

    @InjectMocks
    private DashboardController dashboardController;

    @Mock
    private EventoCalendarioDAO eventoDAO;

    @Mock
    private SesionEntrenamientoDAO sesionDAO;

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

        SesionEntrenamiento sesionAyer = new SesionEntrenamiento();
        sesionAyer.setCliente(clienteMock);
        sesionAyer.setFechaHora(hoy.minusDays(1).atTime(18, 0));
        sesionAyer.setVolumenTotal(2000.0);
        sesionAyer.setEventoCalendario(eventoAyer);

        // Simulamos la búsqueda de la semana
        when(eventoDAO.findByClienteIdAndFechaBetween(eq(clienteId), any(LocalDate.class), any(LocalDate.class)))
            .thenReturn(Arrays.asList(eventoAyer, eventoHoy));

        when(sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(
                eq(clienteId), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(Arrays.asList(sesionAyer));
        when(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId))
            .thenReturn(Arrays.asList(sesionAyer));

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

    @Test
    void getResumen_SinHistorial_DevuelveTodoACero() {
        // --- PREPARACIÓN ---
        when(eventoDAO.findByClienteIdAndFechaBetween(any(), any(), any())).thenReturn(Collections.emptyList());
        when(sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(
                any(), any(), any())).thenReturn(Collections.emptyList());
        when(sesionDAO.findByClienteIdOrderByFechaHoraDesc(any())).thenReturn(Collections.emptyList());

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

    @Test
    void getResumen_AyerNoEntreno_RompeLaRacha() {
        // --- PREPARACIÓN ---
        SesionEntrenamiento sesionHace2Dias = new SesionEntrenamiento();
        sesionHace2Dias.setFechaHora(hoy.minusDays(2).atTime(18, 0));

        // Simulamos la lista de la semana (vacía para simplificar, no nos importa para este test)
        when(eventoDAO.findByClienteIdAndFechaBetween(any(), any(), any())).thenReturn(Collections.emptyList());

        when(sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(
                any(), any(), any())).thenReturn(Collections.emptyList());
        when(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId))
            .thenReturn(Arrays.asList(sesionHace2Dias));

        // --- ACCIÓN ---
        ResponseEntity<Map<String, Object>> respuesta = dashboardController.getResumen(clienteId);

        // --- COMPROBACIÓN ---
        // La racha debe ser 0 porque ayer no se completó, cortando el conteo de días anteriores.
        assertEquals(0, respuesta.getBody().get("rachaActual"));
    }
}
