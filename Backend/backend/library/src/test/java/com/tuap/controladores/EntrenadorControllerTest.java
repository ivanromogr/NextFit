package com.tuap.controladores;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;
import com.tuap.backend.controladores.EntrenadorController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dto.EntrenadorPublicoResponse;
import com.tuap.backend.dto.ReviewPublicResponse;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.ResenaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO.ActividadDashboardResumen;

@ExtendWith(MockitoExtension.class)
class EntrenadorControllerTest {

    @InjectMocks
    private EntrenadorController entrenadorController;

    @Mock private ClienteDAO clienteDAO;
    @Mock private EntrenadorDAO entrenadorDAO;
    @Mock private SesionEntrenamientoDAO sesionDAO;
    @Mock private ResenaDAO resenaDAO;
    @Mock private com.tuap.backend.auth.OwnershipService ownershipService;

    private UUID entrenadorId;
    private UUID clienteId;
    private Entrenador entrenadorMock;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        entrenadorId = UUID.randomUUID();
        clienteId = UUID.randomUUID();

        entrenadorMock = new Entrenador();
        entrenadorMock.setId(entrenadorId);
        entrenadorMock.setNombre("Chris Bumstead");

        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setNombre("Paco");
        clienteMock.setEmail("paco@gym.com");
    }

    @Test
    void obtenerClientes_DevuelveListaConMetricas() {
        // --- PREPARACIÓN ---
        when(clienteDAO.findByEntrenadorId(entrenadorId)).thenReturn(Arrays.asList(clienteMock));
        // Simulamos que Paco ha hecho 3 sesiones esta semana
        when(sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(eq(clienteId), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(Arrays.asList(new SesionEntrenamiento(), new SesionEntrenamiento(), new SesionEntrenamiento()));

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.obtenerClientes(entrenadorId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        List<Map<String, Object>> body = (List<Map<String, Object>>) respuesta.getBody();
        assertEquals(1, body.size()); // 1 cliente
        assertEquals(3L, body.get(0).get("sesionesHechas"));
        assertTrue((Boolean) body.get(0).get("semanaCompletada")); // True porque >= 3
    }

    @Test
    void getPerfilPublico_DevuelvePerfilCompleto() {
        // --- PREPARACIÓN ---
        entrenadorMock.setPerfilPublico(true);
        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));
        when(resenaDAO.calcularMediaPorEntrenador(entrenadorId)).thenReturn(4.85); // Debería redondear a 4.9
        when(resenaDAO.findByEntrenadorIdOrderByFechaDesc(entrenadorId)).thenReturn(Arrays.asList(new Resena()));
        when(clienteDAO.countByEntrenador_Id(entrenadorId)).thenReturn(25L);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.getPerfilPublico(entrenadorId, null);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        assertEquals(4.9, body.get("valoracionMedia")); // Verifica el redondeo de tu código
        assertEquals(25L, body.get("numeroClientes"));
        EntrenadorPublicoResponse publico = (EntrenadorPublicoResponse) body.get("entrenador");
        assertEquals(entrenadorId, publico.id());
        assertFalse(java.util.Arrays.stream(EntrenadorPublicoResponse.class.getRecordComponents())
                .anyMatch(component -> component.getName().equals("email") || component.getName().equals("edad") || component.getName().equals("genero")));
    }

    @Test
    void getPerfilPublico_PrivadoDevuelve404SalvoParaElPropietario() {
        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));

        ResponseEntity<?> anonimo = entrenadorController.getPerfilPublico(entrenadorId, null);
        assertEquals(HttpStatus.NOT_FOUND, anonimo.getStatusCode());

        when(resenaDAO.calcularMediaPorEntrenador(entrenadorId)).thenReturn(null);
        when(resenaDAO.findByEntrenadorIdOrderByFechaDesc(entrenadorId)).thenReturn(List.of());
        when(clienteDAO.countByEntrenador_Id(entrenadorId)).thenReturn(0L);
        ResponseEntity<?> propietario = entrenadorController.getPerfilPublico(entrenadorId,
                new AuthenticatedUser(entrenadorId, "coach@test.com", Role.ENTRENADOR));
        assertEquals(HttpStatus.OK, propietario.getStatusCode());
    }

    @Test
    void obtenerEntrenadoresPublicos_UsaDtoSinDatosPrivados() {
        entrenadorMock.setPerfilPublico(true);
        Entrenador privado = new Entrenador();
        privado.setId(UUID.randomUUID());
        privado.setPerfilPublico(false);
        when(entrenadorDAO.findByPerfilPublicoTrue()).thenReturn(List.of(entrenadorMock));

        ResponseEntity<?> respuesta = entrenadorController.obtenerEntrenadoresPublicos(null, null, null, null);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        List<EntrenadorPublicoResponse> body = (List<EntrenadorPublicoResponse>) respuesta.getBody();
        assertEquals(1, body.size());
        assertEquals(entrenadorId, body.get(0).id());
    }

    @Test
    void getReviewsEntrenador_NoExponeEmailNiObjetivoDelAutor() {
        clienteMock.setApellido("Romo");
        clienteMock.setObjetivo("Fuerza");
        Resena resena = new Resena();
        resena.setCliente(clienteMock);
        resena.setEstrellas(5);
        when(resenaDAO.findByEntrenadorIdOrderByFechaDesc(entrenadorId)).thenReturn(List.of(resena));

        ResponseEntity<?> respuesta = entrenadorController.getReviewsEntrenador(entrenadorId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        ReviewPublicResponse review = ((List<ReviewPublicResponse>) respuesta.getBody()).get(0);
        assertEquals("Paco", review.autor().nombre());
        assertFalse(java.util.Arrays.stream(review.autor().getClass().getRecordComponents())
                .anyMatch(component -> component.getName().equals("email") || component.getName().equals("objetivo")));
    }

    @Test
    void publicarResena_DerivaAutorDelClienteAutenticado() {
        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        Map<String, Object> payload = Map.of("estrellas", 5, "comentario", "Muy buen seguimiento");

        ResponseEntity<?> respuesta = entrenadorController.publicarResena(entrenadorId, payload,
                new AuthenticatedUser(clienteId, "paco@gym.com", Role.CLIENTE));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        ArgumentCaptor<Resena> captor = ArgumentCaptor.forClass(Resena.class);
        verify(resenaDAO).save(captor.capture());
        assertEquals(clienteId, captor.getValue().getCliente().getId());
    }

    @Test
    void publicarResena_RechazaClienteNoRelacionadoYOtroRol() {
        AuthenticatedUser cliente = new AuthenticatedUser(clienteId, "paco@gym.com", Role.CLIENTE);
        org.mockito.Mockito.doThrow(new AccessDeniedException("denied"))
                .when(ownershipService).requireCanChatWith(cliente, entrenadorId);

        assertThrows(AccessDeniedException.class,
                () -> entrenadorController.publicarResena(entrenadorId, Map.of(), cliente));

        AuthenticatedUser entrenador = new AuthenticatedUser(UUID.randomUUID(), "coach@test.com", Role.ENTRENADOR);
        org.mockito.Mockito.doThrow(new AccessDeniedException("denied"))
                .when(ownershipService).requireRole(entrenador, Role.CLIENTE);
        assertThrows(AccessDeniedException.class,
                () -> entrenadorController.publicarResena(entrenadorId, Map.of(), entrenador));
        verify(resenaDAO, never()).save(any());
    }

    @Test
    void getDashboardResumen_CalculaMetricasConActividadAsignada() {
        clienteMock.setApellido("Romo");

        ActividadDashboardResumen sesion = actividadResumen(
            UUID.randomUUID(),
            clienteMock.getId(),
            clienteMock.getNombre(),
            clienteMock.getApellido(),
            "Pierna",
            LocalDateTime.now(),
            2500.0,
            1800
        );

        when(sesionDAO.findResumenActividadDashboardByEntrenador(eq(entrenadorId), any(Pageable.class)))
            .thenReturn(List.of(sesion));
        when(sesionDAO.countClientesEntrenadosDashboardEnRangoByEntrenador(eq(entrenadorId), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(1L);
        when(sesionDAO.countClientesInactivos(eq(entrenadorId), any(LocalDateTime.class))).thenReturn(0L);
        when(sesionDAO.countSesionesDashboardEnRangoByEntrenador(eq(entrenadorId), any(LocalDateTime.class), any(LocalDateTime.class)))
            .thenReturn(3L);
        when(clienteDAO.countByEntrenador_Id(entrenadorId)).thenReturn(1L);

        ResponseEntity<?> respuesta = entrenadorController.getDashboardResumen(entrenadorId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        Map<String, Long> stats = (Map<String, Long>) body.get("stats");
        List<Map<String, Object>> feed = (List<Map<String, Object>>) body.get("feedActividad");

        assertEquals(1L, stats.get("hoy"));
        assertEquals(0L, stats.get("riesgo"));
        assertEquals(3L, stats.get("records"));
        assertEquals(1, feed.size());
        assertEquals("Paco Romo", feed.get(0).get("clienteNombre"));
        assertEquals("Pierna", feed.get(0).get("rutina"));
    }

    private ActividadDashboardResumen actividadResumen(UUID id, UUID clienteId, String nombre, String apellido,
                                                       String rutina, LocalDateTime fecha,
                                                       Double volumen, Integer duracion) {
        return new ActividadDashboardResumen() {
            public UUID getId() { return id; }
            public UUID getClienteId() { return clienteId; }
            public String getClienteNombre() { return nombre; }
            public String getClienteApellido() { return apellido; }
            public String getRutina() { return rutina; }
            public LocalDateTime getFecha() { return fecha; }
            public Double getVolumen() { return volumen; }
            public Integer getDuracion() { return duracion; }
        };
    }

    @Test
    void ficharCliente_AtletaLibre_LoVinculaAlEntrenador() {
        // --- PREPARACIÓN ---
        Map<String, String> payload = new HashMap<>();
        payload.put("email", "  Paco@Gym.COM  ");

        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));
        when(clienteDAO.findByEmail("paco@gym.com")).thenReturn(Optional.of(clienteMock)); // Paco no tiene entrenador (null)

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.ficharCliente(entrenadorId, payload);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(entrenadorMock, clienteMock.getEntrenador()); // Verifica que se le asignó
        verify(clienteDAO, times(1)).save(clienteMock); // Verifica que se guardó
    }

    @Test
    void ficharCliente_AtletaOcupado_DevuelveError409() {
        // --- PREPARACIÓN ---
        Map<String, String> payload = new HashMap<>();
        payload.put("email", "paco@gym.com");

        // Creamos otro entrenador diferente
        Entrenador otroEntrenador = new Entrenador();
        otroEntrenador.setId(UUID.randomUUID());
        otroEntrenador.setNombre("Ramon Dino");
        
        // Asignamos a Paco a ese otro entrenador
        clienteMock.setEntrenador(otroEntrenador);

        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));
        when(clienteDAO.findByEmail("paco@gym.com")).thenReturn(Optional.of(clienteMock));

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.ficharCliente(entrenadorId, payload);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode()); // Verifica que salta el error 409
        Map<String, String> body = (Map<String, String>) respuesta.getBody();
        assertTrue(body.get("message").contains("ya está entrenando con otro profesional"));
        verify(clienteDAO, never()).save(any()); // Verifica que no se intentó guardar nada
    }

    @Test
    void desvincularCliente_ClienteDeOtro_DevuelveError403() {
        // --- PREPARACIÓN ---
        Entrenador otroEntrenador = new Entrenador();
        otroEntrenador.setId(UUID.randomUUID());
        clienteMock.setEntrenador(otroEntrenador); // Paco es de otro entrenador

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.desvincularCliente(entrenadorId, clienteId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.FORBIDDEN, respuesta.getStatusCode()); // Error 403
        Map<String, String> body = (Map<String, String>) respuesta.getBody();
        assertEquals("No puedes desvincular a un atleta que no es tuyo.", body.get("message"));
    }
}
