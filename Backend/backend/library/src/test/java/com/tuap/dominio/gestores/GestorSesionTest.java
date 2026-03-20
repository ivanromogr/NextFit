package com.tuap.dominio.gestores;


import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dto.GuardarSesionRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.RutinaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;
import com.tuap.backend.dominio.gestores.GestorSesion;
@ExtendWith(MockitoExtension.class) // Activa Mockito para esta clase
class GestorSesionTest {

    // 1. INYECTAMOS LA CLASE REAL A TESTEAR
    @InjectMocks
    private GestorSesion gestorSesion;

    // 2. CREAMOS "DOBLES DE ACCIÓN" (MOCKS) DE TUS BASES DE DATOS
    @Mock private SesionEntrenamientoDAO sesionDAO;
    @Mock private ClienteDAO clienteDAO;
    @Mock private RutinaDAO rutinaDAO;
    @Mock private EjercicioDAO ejercicioDAO;
    @Mock private EventoCalendarioDAO eventoDAO;

    // Variables de prueba que usaremos en varios tests
    private UUID clienteId;
    private UUID rutinaId;
    private UUID ejercicioId;
    private Cliente clienteMock;
    private Rutina rutinaMock;
    private Ejercicio ejercicioMock;

    @BeforeEach
    void setUp() {
        // Inicializamos datos falsos antes de cada test
        clienteId = UUID.randomUUID();
        rutinaId = UUID.randomUUID();
        ejercicioId = UUID.randomUUID();

        clienteMock = new Cliente();
        clienteMock.setId(clienteId);

        rutinaMock = new Rutina();
        rutinaMock.setId(rutinaId);
        rutinaMock.setNombre("Rutina de Fuerza");

        ejercicioMock = new Ejercicio();
        ejercicioMock.setId(ejercicioId);
        ejercicioMock.setNombre("Sentadilla");
    }

    // 🟢 TEST 1: EL CAMINO FELIZ (Todo funciona bien y calcula bien el volumen)
    @Test
    void guardarSesion_CaminoFeliz_CalculaVolumenCorrectamente() {
        // --- PREPARACIÓN (GIVEN) ---
        // 1. Fabricamos la petición (Request) que enviaría el móvil
        GuardarSesionRequest req = new GuardarSesionRequest();
        req.setClienteId(clienteId);
        req.setRutinaId(rutinaId);
        req.setDuracionSegundos(3600);
        
        // Añadimos 1 serie de 100kg x 10 repes = 1000kg de volumen
        GuardarSesionRequest.SerieDTO serie = new GuardarSesionRequest.SerieDTO();
        serie.ejercicioId = ejercicioId;
        serie.peso = 100f;
        serie.reps = 10;
        serie.hecho = true;
        
        List<GuardarSesionRequest.SerieDTO> series = new ArrayList<>();
        series.add(serie);
        req.setSeries(series);

        // 2. Entrenamos a nuestros Mocks para que respondan lo que queremos
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        when(rutinaDAO.findById(rutinaId)).thenReturn(Optional.of(rutinaMock));
        when(ejercicioDAO.findById(ejercicioId)).thenReturn(Optional.of(ejercicioMock));
        when(eventoDAO.buscarEventoExacto(eq(clienteId), any(LocalDate.class), eq(rutinaId)))
                .thenReturn(Optional.of(new EventoCalendario()));
        
        // Simulamos que al guardar la sesión, la base de datos devuelve la misma sesión
        when(sesionDAO.save(any(SesionEntrenamiento.class))).thenAnswer(i -> i.getArguments()[0]);

        // --- ACCIÓN (WHEN) ---
        // Llamamos al método real
        SesionEntrenamiento resultado = gestorSesion.guardarSesion(req);

        // --- COMPROBACIÓN (THEN) ---
        // Verificamos que no es nulo
        assertNotNull(resultado);
        // Verificamos que el nombre de la rutina se copió bien
        assertEquals("Rutina de Fuerza", resultado.getNombre());
        // 🔥 MAGIA: Verificamos que tu lógica matemática funciona: 100kg x 10 = 1000.0
        assertEquals(1000.0, resultado.getVolumenTotal());
        
        // Verificamos que el Gestor le dijo a la BBDD de sesiones que guardara los datos EXACTAMENTE 1 vez
        verify(sesionDAO, times(1)).save(any(SesionEntrenamiento.class));
    }

    // 🔴 TEST 2: EL CAMINO TRISTE (El cliente no existe)
    @Test
    void guardarSesion_ClienteNoExiste_LanzaExcepcion() {
        // --- PREPARACIÓN (GIVEN) ---
        GuardarSesionRequest req = new GuardarSesionRequest();
        req.setClienteId(clienteId);

        // Entrenamos al Mock para que devuelva VACÍO (como si el cliente no existiera)
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.empty());

        // --- ACCIÓN Y COMPROBACIÓN (WHEN & THEN) ---
        // Verificamos que Java lanza una RuntimeException con tu mensaje exacto
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            gestorSesion.guardarSesion(req);
        });

        assertEquals("Cliente no encontrado", excepcion.getMessage());
        
        // Verificamos que el sistema "abortó" y NUNCA intentó guardar la sesión
        verify(sesionDAO, never()).save(any());
    }
}
