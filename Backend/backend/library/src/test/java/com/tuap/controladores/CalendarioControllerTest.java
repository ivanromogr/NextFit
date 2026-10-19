package com.tuap.controladores;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.tuap.backend.controladores.CalendarioController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.RutinaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@ExtendWith(MockitoExtension.class)
class CalendarioControllerTest {

    @InjectMocks
    private CalendarioController calendarioController;

    @Mock private EventoCalendarioDAO eventoDAO;
    @Mock private ClienteDAO clienteDAO;
    @Mock private RutinaDAO rutinaDAO;
    @Mock private SesionEntrenamientoDAO sesionDAO;
    @Mock private com.tuap.backend.auth.OwnershipService ownershipService;

    private UUID clienteId;
    private UUID entrenadorId;
    private UUID eventoId;
    private EventoCalendario eventoPendiente;
    private EventoCalendario eventoSaltado;
    private Rutina rutinaFake;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        entrenadorId = UUID.randomUUID();
        eventoId = UUID.randomUUID();

        rutinaFake = new Rutina();
        rutinaFake.setId(UUID.randomUUID());
        rutinaFake.setNombre("Rutina Fuerza");
        rutinaFake.setEntrenadorId(entrenadorId); // Pertenece a este entrenador

        // Evento 1: Para hoy (PENDIENTE)
        eventoPendiente = new EventoCalendario();
        eventoPendiente.setId(eventoId);
        eventoPendiente.setFecha(LocalDate.now());
        eventoPendiente.setCompletado(false);
        eventoPendiente.setRutina(rutinaFake);
        eventoPendiente.setEntrenadorId(entrenadorId);
        Cliente cliente = new Cliente();
        cliente.setId(clienteId);
        rutinaFake.setCliente(cliente);
        eventoPendiente.setCliente(cliente);

        // Evento 2: Del pasado (SALTADO)
        eventoSaltado = new EventoCalendario();
        eventoSaltado.setId(UUID.randomUUID());
        eventoSaltado.setFecha(LocalDate.now().minusDays(5));
        eventoSaltado.setCompletado(false);
        eventoSaltado.setRutina(rutinaFake);
        eventoSaltado.setEntrenadorId(entrenadorId);
        eventoSaltado.setCliente(cliente);
    }

    @Test
    void getEventos_CalculaEstadosCorrectamente() {
        String inicio = LocalDate.now().minusDays(10).toString();
        String fin = LocalDate.now().plusDays(10).toString();

        when(eventoDAO.findByClienteIdAndFechaBetween(eq(clienteId), any(LocalDate.class), any(LocalDate.class)))
            .thenReturn(Arrays.asList(eventoPendiente, eventoSaltado));

        // Llamamos al método pasándole el ID del entrenador
        ResponseEntity<List<Map<String, Object>>> respuesta = 
            calendarioController.getEventos(clienteId, inicio, fin, entrenadorId.toString());

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        List<Map<String, Object>> eventosDevueltos = respuesta.getBody();
        assertEquals(2, eventosDevueltos.size());

        // Verificamos que al evento de hoy le puso PENDIENTE
        assertEquals("PENDIENTE", eventosDevueltos.get(0).get("estado"));
        
        // Verificamos que al evento del pasado le puso SALTADO
        assertEquals("SALTADO", eventosDevueltos.get(1).get("estado"));
    }

    @Test
    void getEventos_BloqueaEventosDeOtroEntrenador() {
        String inicio = LocalDate.now().minusDays(1).toString();
        String fin = LocalDate.now().plusDays(1).toString();

        // Creamos una rutina y evento que pertenecen a un entrenador INTRUSO
        UUID intrusoId = UUID.randomUUID();
        Rutina rutinaIntrusa = new Rutina();
        rutinaIntrusa.setEntrenadorId(intrusoId);
        
        EventoCalendario eventoIntruso = new EventoCalendario();
        eventoIntruso.setRutina(rutinaIntrusa);
        eventoIntruso.setEntrenadorId(intrusoId);

        when(eventoDAO.findByClienteIdAndFechaBetween(eq(clienteId), any(LocalDate.class), any(LocalDate.class)))
            .thenReturn(Arrays.asList(eventoPendiente, eventoIntruso));

        // El entrenador original pide el calendario
        ResponseEntity<List<Map<String, Object>>> respuesta = 
            calendarioController.getEventos(clienteId, inicio, fin, entrenadorId.toString());

        // COMPROBACIÓN: La lista final solo debe tener 1 evento (el suyo), el del intruso se filtró
        assertEquals(1, respuesta.getBody().size());
    }

    @Test
    void crearEvento_DatosValidos_GuardaEventoCorrectamente() {
        Map<String, String> payload = new HashMap<>();
        payload.put("rutinaId", rutinaFake.getId().toString());
        payload.put("fecha", "2026-12-31");
        payload.put("entrenadorId", entrenadorId.toString());

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(new Cliente()));
        when(rutinaDAO.findById(rutinaFake.getId())).thenReturn(Optional.of(rutinaFake));

        ResponseEntity<?> respuesta = calendarioController.crearEvento(clienteId, payload);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        verify(eventoDAO, times(1)).save(any(EventoCalendario.class));
    }

    @Test
    void crearEvento_EntrenadorIntentaProgramarRutinaDeCliente_Devuelve403() {
        Rutina rutinaCliente = new Rutina();
        rutinaCliente.setId(UUID.randomUUID());
        rutinaCliente.setNombre("Rutina propia del cliente");
        rutinaCliente.setEntrenadorId(null);

        Map<String, String> payload = new HashMap<>();
        payload.put("rutinaId", rutinaCliente.getId().toString());
        payload.put("fecha", "2026-12-31");
        payload.put("entrenadorId", entrenadorId.toString());

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(new Cliente()));
        when(rutinaDAO.findById(rutinaCliente.getId())).thenReturn(Optional.of(rutinaCliente));
        doThrow(new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción"))
            .when(ownershipService).requireRoutineAccess(eq(rutinaCliente), any());

        assertThrows(org.springframework.security.access.AccessDeniedException.class,
            () -> calendarioController.crearEvento(clienteId, payload));
    }

    @Test
    void toggleCompletado_EventoExiste_CambiaEstadoYGuarda() {
        when(eventoDAO.findById(eventoId)).thenReturn(Optional.of(eventoPendiente)); // Está en false

        ResponseEntity<?> respuesta = calendarioController.toggleCompletado(eventoId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertTrue(eventoPendiente.isCompletado()); // Verifica que se cambió a true
        verify(eventoDAO, times(1)).save(eventoPendiente);
    }

    @Test
    void eliminarEvento_ConSesionAsociada_DesvinculaSesionYBorraEvento() {
        SesionEntrenamiento sesion = new SesionEntrenamiento();
        sesion.setEventoCalendario(eventoPendiente);

        when(eventoDAO.findById(eventoId)).thenReturn(Optional.of(eventoPendiente));
        when(sesionDAO.findByEventoCalendario_Id(eventoId)).thenReturn(sesion);

        ResponseEntity<?> respuesta = calendarioController.eliminarEvento(eventoId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(null, sesion.getEventoCalendario());
        verify(sesionDAO, times(1)).save(sesion);
        verify(eventoDAO, times(1)).delete(eventoPendiente);
    }
}
