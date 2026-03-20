package com.tuap.controladores;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.tuap.backend.controladores.EntrenadorController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.ResenaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@ExtendWith(MockitoExtension.class)
class EntrenadorControllerTest {

    @InjectMocks
    private EntrenadorController entrenadorController;

    @Mock private ClienteDAO clienteDAO;
    @Mock private EntrenadorDAO entrenadorDAO;
    @Mock private SesionEntrenamientoDAO sesionDAO;
    @Mock private ResenaDAO resenaDAO;

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

    // 🟢 TEST 1: Obtener clientes del entrenador
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

    // 🟢 TEST 2: Perfil público con valoraciones
    @Test
    void getPerfilPublico_DevuelvePerfilCompleto() {
        // --- PREPARACIÓN ---
        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));
        when(resenaDAO.calcularMediaPorEntrenador(entrenadorId)).thenReturn(4.85); // Debería redondear a 4.9
        when(resenaDAO.findByEntrenadorIdOrderByFechaDesc(entrenadorId)).thenReturn(Arrays.asList(new Resena()));
        when(clienteDAO.countByEntrenador_Id(entrenadorId)).thenReturn(25L);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.getPerfilPublico(entrenadorId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        assertEquals(4.9, body.get("valoracionMedia")); // Verifica el redondeo de tu código
        assertEquals(25L, body.get("numeroClientes"));
    }

    // 🟢 TEST 3: Fichar cliente libre (Camino Feliz)
    @Test
    void ficharCliente_AtletaLibre_LoVinculaAlEntrenador() {
        // --- PREPARACIÓN ---
        Map<String, String> payload = new HashMap<>();
        payload.put("email", "paco@gym.com");

        when(entrenadorDAO.findById(entrenadorId)).thenReturn(Optional.of(entrenadorMock));
        when(clienteDAO.findByEmail("paco@gym.com")).thenReturn(Optional.of(clienteMock)); // Paco no tiene entrenador (null)

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = entrenadorController.ficharCliente(entrenadorId, payload);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(entrenadorMock, clienteMock.getEntrenador()); // Verifica que se le asignó
        verify(clienteDAO, times(1)).save(clienteMock); // Verifica que se guardó
    }

    // 🔴 TEST 4: Fichar cliente ocupado (Regla de Exclusividad)
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

    // 🔴 TEST 5: Desvincular cliente que no es tuyo (Seguridad)
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
