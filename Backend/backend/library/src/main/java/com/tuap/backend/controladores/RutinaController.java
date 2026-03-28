package com.tuap.backend.controladores;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.DetalleRutina;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.gestores.GestorRutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@RestController
@RequestMapping("/api/rutinas")
public class RutinaController {

    private final GestorRutina gestorRutina;
    private final RutinaDAO rutinaDAO;
    private final ClienteDAO clienteDAO;

    public RutinaController(GestorRutina gestorRutina, RutinaDAO rutinaDAO, ClienteDAO clienteDAO) {
        this.gestorRutina = gestorRutina;
        this.rutinaDAO = rutinaDAO;
        this.clienteDAO = clienteDAO;
    }

    @PostMapping("/manual")
    public ResponseEntity<Object> crearRutinaManual(@RequestBody RutinaRequest request) {
        try {
            Rutina nueva = gestorRutina.crearRutinaManual(request);
            return ResponseEntity.ok(nueva);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/auto")
    public ResponseEntity<Object> generarRutinaAutomatica(@RequestBody GenerarRutinaRequest request) {
        try {
            List<Rutina> nueva = gestorRutina.generarRutinaAutomatica(request);
            return ResponseEntity.ok(nueva);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error generando plan: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizarRutina(@PathVariable UUID id, @RequestBody java.util.Map<String, Object> rutinaDatosDTO) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            Rutina rutinaDatos = mapper.convertValue(rutinaDatosDTO, Rutina.class);
            
            Rutina actualizada = gestorRutina.actualizarRutina(id, rutinaDatos);
            return ResponseEntity.ok(actualizada);
        } catch (RuntimeException _) {
            // 🧹 SOLUCIÓN SONARQUBE: Unnamed pattern '_'
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al actualizar: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> eliminarRutina(@PathVariable UUID id) {
        try {
            gestorRutina.eliminarRutina(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al eliminar: " + e.getMessage());
        }
    }

    @GetMapping("/cliente/{idCliente}")
    public ResponseEntity<List<Rutina>> obtenerRutinas(@PathVariable UUID idCliente) {
        return ResponseEntity.ok(gestorRutina.obtenerRutinasDeCliente(idCliente));
    }

    @GetMapping("/cliente/{idCliente}/entrenador")
    public ResponseEntity<List<Rutina>> obtenerRutinasEntrenador(
            @PathVariable UUID idCliente,
            @RequestParam(required = false) String entrenadorId) { 
        
        try {
            List<Rutina> rutinas = gestorRutina.obtenerRutinasDeEntrenadorParaCliente(idCliente);

            if (entrenadorId != null) {
                rutinas = rutinas.stream()
                        .filter(r -> r.getEntrenadorId() != null && r.getEntrenadorId().toString().equals(entrenadorId))
                        .toList();
            }

            return ResponseEntity.ok(rutinas);
        } catch (Exception _) {
    
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- 1. OBTENER PLANTILLAS DEL ENTRENADOR ---
    @GetMapping("/plantillas/{entrenadorId}")
    public ResponseEntity<List<Rutina>> obtenerPlantillas(@PathVariable UUID entrenadorId) {
        try {
            List<Rutina> plantillas = rutinaDAO.findByEntrenadorIdAndEsPlantillaTrue(entrenadorId);
            return ResponseEntity.ok(plantillas);
        } catch (Exception _) {
           
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- 2. CLONAR PLANTILLA A UN CLIENTE ---
    @PostMapping("/clonar/{plantillaId}/cliente/{clienteId}")
    public ResponseEntity<Object> clonarPlantilla(@PathVariable UUID plantillaId, @PathVariable UUID clienteId) {
        try {
            Rutina plantilla = rutinaDAO.findById(plantillaId)
                .orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
            
            Cliente cliente = clienteDAO.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

            Rutina clon = new Rutina();
            clon.setNombre(plantilla.getNombre());
            clon.setObjetivo(plantilla.getObjetivo());
            clon.setDescripcion(plantilla.getDescripcion());
            clon.setNivel(plantilla.getNivel());
            clon.setCreador("ENTRENADOR"); 
            clon.setEsPlantilla(false); 
            clon.setCliente(cliente);  
            clon.setEntrenadorId(plantilla.getEntrenadorId()); 

            List<DetalleRutina> detallesClonados = new ArrayList<>();
            if (plantilla.getDetalles() != null) {
                for (DetalleRutina original : plantilla.getDetalles()) {
                    DetalleRutina nuevoDetalle = new DetalleRutina();
                    nuevoDetalle.setRutina(clon); 
                    nuevoDetalle.setEjercicio(original.getEjercicio());
                    nuevoDetalle.setSeries(original.getSeries());
                    nuevoDetalle.setRepeticiones(original.getRepeticiones());
                    nuevoDetalle.setNotas(original.getNotas());
                    nuevoDetalle.setPeso(original.getPeso());
                    nuevoDetalle.setRpe(original.getRpe());
                    nuevoDetalle.setDias(original.getDias());
                    detallesClonados.add(nuevoDetalle);
                }
            }
            clon.setDetalles(detallesClonados);

            Rutina rutinaGuardada = rutinaDAO.save(clon);
            return ResponseEntity.ok(rutinaGuardada);

        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error al clonar plantilla: " + e.getMessage());
        }
    }
}