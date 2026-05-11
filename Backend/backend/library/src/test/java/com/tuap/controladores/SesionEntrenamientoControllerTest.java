package com.tuap.controladores;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.tuap.backend.controladores.SesionEntrenamientoController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.SerieRealizada;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dominio.gestores.GestorSesion;
import com.tuap.backend.dto.GuardarSesionRequest;
import com.tuap.backend.dto.UltimaSesionResponse;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@ExtendWith(MockitoExtension.class)
class SesionEntrenamientoControllerTest {

    @InjectMocks
    private SesionEntrenamientoController sesionController;

    @Mock private GestorSesion gestorSesion;
    @Mock private SesionEntrenamientoDAO sesionDAO;
    @Mock private ClienteDAO clienteDAO;

    private UUID clienteId;
    private UUID eventoId;
    private SesionEntrenamiento sesionMock;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        eventoId = UUID.randomUUID();

        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setNombre("Arnold");
        clienteMock.setApellido("Schwarzenegger");

        sesionMock = new SesionEntrenamiento();
        sesionMock.setId(UUID.randomUUID());
        sesionMock.setCliente(clienteMock);
        sesionMock.setDuracionSegundos(3600);
        sesionMock.setVolumenTotal(5000.0);
        sesionMock.setFechaHora(LocalDateTime.now());
        sesionMock.setNotasGenerales("Buen entreno");

        // Creamos un par de series (Ej: 2 series de Sentadilla)
        Ejercicio sentadilla = new Ejercicio();
        sentadilla.setId(UUID.randomUUID());
        sentadilla.setNombre("Sentadilla");

        SerieRealizada s1 = new SerieRealizada();
        s1.setEjercicio(sentadilla);
        s1.setPeso(100.0);
        s1.setReps(10);
        s1.setRpe(8);
        s1.setHecho(true);

        SerieRealizada s2 = new SerieRealizada();
        s2.setEjercicio(sentadilla);
        s2.setPeso(100.0);
        s2.setReps(8);
        s2.setRpe(9);
        s2.setHecho(true);

        sesionMock.setSeries(Arrays.asList(s1, s2));
    }

    // 🟢 TEST 1: Guardar una sesión
    @Test
    void guardarSesion_LlamaAlGestorYDevuelve200() throws Exception {
        GuardarSesionRequest req = new GuardarSesionRequest();
        when(gestorSesion.guardarSesion(req)).thenReturn(sesionMock);

        ResponseEntity<?> respuesta = sesionController.guardarSesion(req);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        assertNotNull(body);
        assertEquals(sesionMock.getId(), body.get("id"));
        assertEquals(clienteId, body.get("clienteId"));
        assertEquals(3600, body.get("duracionSegundos"));
        assertEquals(5000.0, body.get("volumenTotal"));
        assertEquals(2, body.get("seriesGuardadas"));
    }

    // 🟢 TEST 2: Listar historial del cliente
    @Test
    void listarSesiones_DevuelveListaYStatus200() {
        when(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId)).thenReturn(Arrays.asList(sesionMock));

        ResponseEntity<?> respuesta = sesionController.listarSesiones(clienteId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        List<Map<String, Object>> lista = (List<Map<String, Object>>) respuesta.getBody();
        assertEquals(1, lista.size());
        assertEquals(sesionMock.getId(), lista.get(0).get("id"));
    }

    // 🟢 TEST 3: Obtener detalles de una sesión y verificar agrupamiento
    @Test
    void getDetalleSesionPorEvento_AgrupaSeriesPorEjercicio() {
        when(sesionDAO.findByEventoCalendario_Id(eventoId)).thenReturn(sesionMock);

        ResponseEntity<?> respuesta = sesionController.getDetalleSesionPorEvento(eventoId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        
        // Verifica los datos básicos
        assertEquals(3600, body.get("duracion"));
        assertEquals(5000.0, body.get("volumenTotal"));
        
        // Verifica el agrupamiento (Debemos tener 1 ejercicio "Sentadilla" con 2 series dentro)
        List<Map<String, Object>> ejercicios = (List<Map<String, Object>>) body.get("ejercicios");
        assertEquals(1, ejercicios.size());
        assertEquals("Sentadilla", ejercicios.get(0).get("nombre"));
        
        List<Map<String, Object>> series = (List<Map<String, Object>>) ejercicios.get(0).get("series");
        assertEquals(2, series.size()); // Verifica que hay 2 series
        assertEquals(10, series.get(0).get("repes")); // Verifica datos de la primera serie
        assertEquals(8, series.get(1).get("repes"));  // Verifica datos de la segunda serie
    }

    // 🟢 TEST 4: Obtener última sesión para clonarla
    @Test
    void obtenerUltimaSesion_SesionExiste_DevuelveResponseFormateada() {
        UUID rutinaId = UUID.randomUUID();
        when(sesionDAO.findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(clienteId, rutinaId))
            .thenReturn(Optional.of(sesionMock));

        ResponseEntity<?> respuesta = sesionController.obtenerUltimaSesion(clienteId, rutinaId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        UltimaSesionResponse body = (UltimaSesionResponse) respuesta.getBody();
        
        assertNotNull(body);
        assertEquals(3600, body.getDuracionSegundos());
        assertEquals(2, body.getSeries().size()); // 2 series que creamos en el setup
    }

    // 🟢 TEST 5: Dashboard del Entrenador ("Vista de Águila")
    @Test
    void getDashboardResumen_CalculaMetricasYFeed() {
        UUID entrenadorId = UUID.randomUUID();
        when(sesionDAO.findActividadDashboardByEntrenador(eq(entrenadorId), any(Pageable.class)))
            .thenReturn(Arrays.asList(sesionMock));
        
        // Simulamos las métricas del DAO
        when(sesionDAO.countClientesEntrenadosDashboardEnRangoByEntrenador(eq(entrenadorId), any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(5L);
        when(sesionDAO.countClientesInactivos(eq(entrenadorId), any(LocalDateTime.class))).thenReturn(2L);
        when(sesionDAO.countSesionesDashboardEnRangoByEntrenador(eq(entrenadorId), any(LocalDateTime.class), any(LocalDateTime.class))).thenReturn(4L);
        when(clienteDAO.countByEntrenador_Id(entrenadorId)).thenReturn(10L);

        ResponseEntity<?> respuesta = sesionController.getDashboardResumen(entrenadorId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        
        // Verifica el Feed
        List<Map<String, Object>> feed = (List<Map<String, Object>>) body.get("feedActividad");
        assertEquals(1, feed.size());
        assertEquals("Arnold Schwarzenegger", feed.get(0).get("clienteNombre"));

        // Verifica las Stats (Tarjetas de colores)
        Map<String, Object> stats = (Map<String, Object>) body.get("stats");
        assertEquals(5L, stats.get("hoy"));
        assertEquals(2L, stats.get("riesgo"));
        assertEquals(4L, stats.get("records"));
        
        // Verifica compatibilidad extra
        assertEquals(10L, body.get("totalClientes"));
    }
}
