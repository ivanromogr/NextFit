package com.tuap.dominio.gestores;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

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

@ExtendWith(MockitoExtension.class) 
class GestorSesionTest {

    @InjectMocks
    private GestorSesion gestorSesion;

    @Mock private SesionEntrenamientoDAO sesionDAO;
    @Mock private ClienteDAO clienteDAO;
    @Mock private RutinaDAO rutinaDAO;
    @Mock private EjercicioDAO ejercicioDAO;
    @Mock private EventoCalendarioDAO eventoDAO;

    private UUID clienteId;
    private UUID rutinaId;
    private UUID ejercicioId;
    private Cliente clienteMock;
    private Rutina rutinaMock;
    private Ejercicio ejercicioMock;

    @BeforeEach
    void setUp() {
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

    @Test
    void guardarSesion_CaminoFeliz_CalculaVolumenCorrectamente() {
        // --- PREPARACIÓN ---
        GuardarSesionRequest req = new GuardarSesionRequest();
        req.setClienteId(clienteId);
        req.setRutinaId(rutinaId);
        req.setDuracionSegundos(3600);
        
        GuardarSesionRequest.SerieDTO serie = new GuardarSesionRequest.SerieDTO();
        
       
        serie.setEjercicioId(ejercicioId);
        serie.setPeso(100f);
        serie.setReps(10);
        serie.setHecho(true);
        serie.setSetIndex(1);
        
        List<GuardarSesionRequest.SerieDTO> series = new ArrayList<>();
        series.add(serie);
        req.setSeries(series);

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        when(rutinaDAO.findById(rutinaId)).thenReturn(Optional.of(rutinaMock));
        when(ejercicioDAO.findById(ejercicioId)).thenReturn(Optional.of(ejercicioMock));
        when(eventoDAO.buscarEventoExacto(eq(clienteId), any(LocalDate.class), eq(rutinaId)))
                .thenReturn(Optional.of(new EventoCalendario()));
        
        when(sesionDAO.save(any(SesionEntrenamiento.class))).thenAnswer(i -> i.getArguments()[0]);

        // --- ACCIÓN ---
        SesionEntrenamiento resultado = gestorSesion.guardarSesion(req);

        // --- COMPROBACIÓN ---
        assertNotNull(resultado);
        assertEquals("Rutina de Fuerza", resultado.getNombre());
        assertEquals(1000.0, resultado.getVolumenTotal());
        
        verify(sesionDAO, times(1)).save(any(SesionEntrenamiento.class));
    }

    @Test
    void guardarSesion_ClienteNoExiste_LanzaExcepcion() {
        GuardarSesionRequest req = new GuardarSesionRequest();
        req.setClienteId(clienteId);

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.empty());

        // Verificamos que lanza la excepción adecuada
        assertThrows(RuntimeException.class, () -> {
            gestorSesion.guardarSesion(req);
        });
        
        verify(sesionDAO, never()).save(any());
    }
}
