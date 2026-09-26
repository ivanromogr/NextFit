package com.tuap.controladores;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import com.tuap.backend.controladores.RutinaController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.DetalleRutina;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.gestores.GestorRutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@ExtendWith(MockitoExtension.class)
class RutinaControllerTest {

    @Mock private com.tuap.backend.auth.OwnershipService ownershipService;

    @InjectMocks
    private RutinaController rutinaController;

    @Mock private GestorRutina gestorRutina;
    @Mock private RutinaDAO rutinaDAO;
    @Mock private ClienteDAO clienteDAO;

    private UUID clienteId;
    private UUID entrenadorId;
    private UUID plantillaId;
    private Rutina rutinaPlantilla;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        entrenadorId = UUID.randomUUID();
        plantillaId = UUID.randomUUID();

        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setNombre("Cliente Prueba");

        // Creamos una plantilla con un ejercicio dentro
        rutinaPlantilla = new Rutina();
        rutinaPlantilla.setId(plantillaId);
        rutinaPlantilla.setNombre("Plantilla Volumen");
        rutinaPlantilla.setEsPlantilla(true);
        rutinaPlantilla.setEntrenadorId(entrenadorId);

        DetalleRutina detalle = new DetalleRutina();
        detalle.setEjercicio(new Ejercicio());
        detalle.setSeries(4);
        detalle.setRepeticiones(12);
        
        List<DetalleRutina> listaDetalles = new ArrayList<>();
        listaDetalles.add(detalle);
        rutinaPlantilla.setDetalles(listaDetalles);
    }

    @Test
    void crearRutinaManual_LlamaAlGestorYDevuelve200() {
        RutinaRequest req = new RutinaRequest();
        Rutina rutinaNueva = new Rutina();
        rutinaNueva.setNombre("Nueva Rutina");

        when(gestorRutina.crearRutinaManual(req)).thenReturn(rutinaNueva);

        ResponseEntity<?> respuesta = rutinaController.crearRutinaManual(req);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(rutinaNueva, respuesta.getBody());
    }

    @Test
    void generarRutinaAutomatica_LlamaAlGestorYDevuelve200() {
        GenerarRutinaRequest req = new GenerarRutinaRequest();
        List<Rutina> rutinasGeneradas = Arrays.asList(new Rutina(), new Rutina());

        when(gestorRutina.generarRutinaAutomatica(req)).thenReturn(rutinasGeneradas);

        ResponseEntity<?> respuesta = rutinaController.generarRutinaAutomatica(req);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(rutinasGeneradas, respuesta.getBody());
    }

    @Test
    void obtenerRutinasEntrenador_ConEntrenadorId_FiltraYDevuelvePrivadas() {
        Rutina rutinaDeOtro = new Rutina();
        rutinaDeOtro.setEntrenadorId(UUID.randomUUID()); // De otro entrenador

        Rutina miRutina = new Rutina();
        miRutina.setEntrenadorId(entrenadorId); // De mi entrenador

        when(gestorRutina.obtenerRutinasDeEntrenadorParaCliente(clienteId))
            .thenReturn(Arrays.asList(rutinaDeOtro, miRutina));

        // Le pasamos el ID en texto para que salte el candado
        ResponseEntity<List<Map<String, Object>>> respuesta = rutinaController.obtenerRutinasEntrenador(clienteId, entrenadorId.toString());

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        // Verificamos que eliminó la rutina del intruso
        assertEquals(1, respuesta.getBody().size()); 
        assertEquals(entrenadorId, respuesta.getBody().get(0).get("entrenadorId"));
    }

    @Test
    void obtenerRutinas_ConEsPlantillaNull_NoRompeElListado() {
        Rutina rutinaAntigua = new Rutina();
        rutinaAntigua.setId(UUID.randomUUID());
        rutinaAntigua.setNombre("Rutina antigua");
        rutinaAntigua.setCreador("CLIENTE");
        ReflectionTestUtils.setField(rutinaAntigua, "esPlantilla", null);

        when(gestorRutina.obtenerRutinasDeCliente(clienteId))
            .thenReturn(List.of(rutinaAntigua));

        ResponseEntity<List<Map<String, Object>>> respuesta = rutinaController.obtenerRutinas(clienteId);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(1, respuesta.getBody().size());
        assertEquals(false, respuesta.getBody().get(0).get("esPlantilla"));
    }

    @Test
    void clonarPlantilla_PlantillaYClienteExisten_CreaClonYGuarda() {
        // --- PREPARACIÓN ---
        when(rutinaDAO.findById(plantillaId)).thenReturn(Optional.of(rutinaPlantilla));
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        
        // Simulamos que al guardar, nos devuelve la rutina que le pasamos
        when(rutinaDAO.save(any(Rutina.class))).thenAnswer(i -> i.getArguments()[0]);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = rutinaController.clonarPlantilla(plantillaId, clienteId);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        
        Rutina clon = (Rutina) respuesta.getBody();
        assertNotNull(clon);
        
        // Verificamos que copió los datos bien
        assertEquals("Plantilla Volumen", clon.getNombre());
        assertEquals("ENTRENADOR", clon.getCreador());
        
        // Verificamos que le quitó la etiqueta de "plantilla"
        assertEquals(false, clon.isEsPlantilla());
        
        // Verificamos que se la asignó a "Paco"
        assertEquals(clienteId, clon.getCliente().getId());
        
        // Verificamos que mantuvo la firma del entrenador
        assertEquals(entrenadorId, clon.getEntrenadorId());
        
        // Verificamos que copió los detalles (el ejercicio de 4x12)
        assertEquals(1, clon.getDetalles().size());
        assertEquals(4, clon.getDetalles().get(0).getSeries());
        
        // Verificamos que lo guardó en la BBDD
        verify(rutinaDAO, times(1)).save(any(Rutina.class));
    }

    @Test
    void clonarPlantilla_PlantillaNoExiste_DevuelveError500() {
        when(rutinaDAO.findById(plantillaId)).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = rutinaController.clonarPlantilla(plantillaId, clienteId);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, respuesta.getStatusCode());
        assertTrue(((String) respuesta.getBody()).contains("Plantilla no encontrada"));
    }
}
