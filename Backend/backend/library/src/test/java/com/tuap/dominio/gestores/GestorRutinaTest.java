package com.tuap.dominio.gestores;


import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.context.SecurityContextHolder;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.gestores.GestorRutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.DetalleRutinaDAO;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@ExtendWith(MockitoExtension.class)
class GestorRutinaTest {

    @InjectMocks
    private GestorRutina gestorRutina;

    @Mock private RutinaDAO rutinaDAO;
    @Mock private DetalleRutinaDAO detalleRutinaDAO;
    @Mock private ClienteDAO clienteDAO;
    @Mock private EjercicioDAO ejercicioDAO;
    @Mock private EntrenadorDAO entrenadorDAO;

    private UUID clienteId;
    private UUID ejercicioId;
    private Cliente clienteMock;
    private Ejercicio ejercicioMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        ejercicioId = UUID.randomUUID();

        clienteMock = new Cliente();
        clienteMock.setId(clienteId);

        ejercicioMock = new Ejercicio();
        ejercicioMock.setId(ejercicioId);
        ejercicioMock.setNombre("Sentadilla");
        
        // Limpiamos el contexto de seguridad para no afectar otros tests
        SecurityContextHolder.clearContext();
    }

    // 🟢 TEST 1: Crear rutina manual para un cliente (Camino Feliz)
    @Test
    void crearRutinaManual_ClienteYEjerciciosExisten_CreaRutinaCorrectamente() {
        // --- PREPARACIÓN ---
        RutinaRequest req = new RutinaRequest();
        req.setIdCliente(clienteId);
        req.setNombre("Rutina de Verano");
        req.setEsPlantilla(false);
        req.setCreador("ENTRENADOR");

        RutinaRequest.EjercicioDetalleDTO ejDto = new RutinaRequest.EjercicioDetalleDTO();
        ejDto.setIdEjercicio(ejercicioId);
        ejDto.setSeries(4);
        ejDto.setRepeticiones(12);
        
        List<RutinaRequest.EjercicioDetalleDTO> listaEjercicios = new ArrayList<>();
        listaEjercicios.add(ejDto);
        req.setEjercicios(listaEjercicios);

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        when(ejercicioDAO.findById(ejercicioId)).thenReturn(Optional.of(ejercicioMock));
        
        // Simulamos que al guardar la rutina, devuelve la misma rutina
        when(rutinaDAO.save(any(Rutina.class))).thenAnswer(i -> i.getArguments()[0]);

        // --- ACCIÓN ---
        Rutina resultado = gestorRutina.crearRutinaManual(req);

        // --- COMPROBACIÓN ---
        assertNotNull(resultado);
        assertEquals("Rutina de Verano", resultado.getNombre());
        assertFalse(resultado.isEsPlantilla());
        
        // Verificamos que se guardaron los detalles (ejercicios)
        verify(detalleRutinaDAO, times(1)).saveAll(anyList());
    }

    // 🟢 TEST 2: Generador IA crea múltiples rutinas (Camino Feliz)
    @Test
    void generarRutinaAutomatica_DatosValidos_GeneraRutinasPorDia() {
        // --- PREPARACIÓN ---
        GenerarRutinaRequest req = new GenerarRutinaRequest();
        req.setIdCliente(clienteId);
        req.setDiasPorSemana(3); // Pedimos 3 días
        req.setObjetivo("FUERZA");
        req.setNivel("Principiante");

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        when(rutinaDAO.save(any(Rutina.class))).thenAnswer(i -> i.getArguments()[0]);
        
        // Simulamos que el buscador de ejercicios SIEMPRE encuentra algo para que la IA funcione
        when(ejercicioDAO.findFirstByNombreContainingIgnoreCase(anyString()))
            .thenReturn(Optional.of(ejercicioMock));

        // --- ACCIÓN ---
        List<Rutina> resultado = gestorRutina.generarRutinaAutomatica(req);

        // --- COMPROBACIÓN ---
        assertEquals(3, resultado.size()); // Verificamos que devolvió 3 rutinas
        assertEquals("Día 1 - Plan Fuerza", resultado.get(0).getNombre()); // Verifica formato de nombre
        assertEquals("IA", resultado.get(0).getCreador());
        
        // Verifica que se guardaron los detalles 3 veces (1 por cada día)
        verify(detalleRutinaDAO, times(3)).saveAll(anyList());
    }

    // 🔴 TEST 3: Generador IA no encuentra ejercicios (Camino Triste)
    @Test
    void generarRutinaAutomatica_SinEjerciciosCompatibles_LanzaExcepcion() {
        // --- PREPARACIÓN ---
        GenerarRutinaRequest req = new GenerarRutinaRequest();
        req.setIdCliente(clienteId);
        req.setDiasPorSemana(1);
        req.setObjetivo("GANAR_MASA");

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        when(rutinaDAO.save(any(Rutina.class))).thenAnswer(i -> i.getArguments()[0]);
        
        // Simulamos que la base de datos está VACÍA (no hay ejercicios)
        when(ejercicioDAO.findFirstByNombreContainingIgnoreCase(anyString()))
            .thenReturn(Optional.empty());

        // --- ACCIÓN Y COMPROBACIÓN ---
        // Verificamos que lanza tu error exacto
        RuntimeException excepcion = assertThrows(RuntimeException.class, () -> {
            gestorRutina.generarRutinaAutomatica(req);
        });

        assertEquals("Error: No se encontraron ejercicios compatibles para el día 1", excepcion.getMessage());
    }
}