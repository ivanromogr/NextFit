package com.tuap.backend.controladores;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    @Autowired
    private GestorRutina gestorRutina;

    // Inyectamos los DAO para la lógica de plantillas
    @Autowired 
    private RutinaDAO rutinaDAO;
    
    @Autowired 
    private ClienteDAO clienteDAO;

    @PostMapping("/manual")
    public ResponseEntity<?> crearRutinaManual(@RequestBody RutinaRequest request) {
        try {
            Rutina nueva = gestorRutina.crearRutinaManual(request);
            return ResponseEntity.ok(nueva);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/auto")
    public ResponseEntity<?> generarRutinaAutomatica(@RequestBody GenerarRutinaRequest request) {
        try {
            List<Rutina> nueva = gestorRutina.generarRutinaAutomatica(request);
            return ResponseEntity.ok(nueva);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error generando plan: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarRutina(@PathVariable UUID id, @RequestBody Rutina rutinaDatos) {
        try {
            Rutina actualizada = gestorRutina.actualizarRutina(id, rutinaDatos);
            return ResponseEntity.ok(actualizada);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Error al actualizar: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminarRutina(@PathVariable UUID id) {
        try {
            gestorRutina.eliminarRutina(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al eliminar: " + e.getMessage());
        }
    }

    @GetMapping("/cliente/{idCliente}")
    public List<Rutina> obtenerRutinas(@PathVariable UUID idCliente) {
        return gestorRutina.obtenerRutinasDeCliente(idCliente);
    }

    @GetMapping("/cliente/{idCliente}/entrenador")
    public ResponseEntity<List<Rutina>> obtenerRutinasEntrenador(@PathVariable UUID idCliente) {
        try {
            List<Rutina> rutinas = gestorRutina.obtenerRutinasDeEntrenadorParaCliente(idCliente);
            return ResponseEntity.ok(rutinas);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    // =========================================================================
    //                        ZONA DE PLANTILLAS MAESTRAS
    // =========================================================================

    // --- 1. OBTENER PLANTILLAS DEL ENTRENADOR ---
    @GetMapping("/plantillas/{entrenadorId}")
    public ResponseEntity<List<Rutina>> obtenerPlantillas(@PathVariable UUID entrenadorId) {
        try {
            List<Rutina> plantillas = rutinaDAO.findByEntrenadorIdAndEsPlantillaTrue(entrenadorId);
            return ResponseEntity.ok(plantillas);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // --- 2. CLONAR PLANTILLA A UN CLIENTE ---
    @PostMapping("/clonar/{plantillaId}/cliente/{clienteId}")
    public ResponseEntity<?> clonarPlantilla(@PathVariable UUID plantillaId, @PathVariable UUID clienteId) {
        try {
            // 1. Recuperar la plantilla
            Rutina plantilla = rutinaDAO.findById(plantillaId)
                .orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
            
            // 2. Recuperar al cliente
            Cliente cliente = clienteDAO.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

            // 3. Crear el clon (Copia de la Rutina)
            Rutina clon = new Rutina();
            clon.setNombre(plantilla.getNombre());
            clon.setObjetivo(plantilla.getObjetivo());
            clon.setDescripcion(plantilla.getDescripcion());
            clon.setNivel(plantilla.getNivel());
            clon.setCreador("ENTRENADOR"); 
            clon.setEsPlantilla(false); // Deja de ser plantilla
            clon.setCliente(cliente);   // Ahora pertenece al cliente

            // 4. Clonar los ejercicios
            List<DetalleRutina> detallesClonados = new ArrayList<>();
            if (plantilla.getDetalles() != null) {
                for (DetalleRutina original : plantilla.getDetalles()) {
                    DetalleRutina nuevoDetalle = new DetalleRutina();
                    
                    nuevoDetalle.setRutina(clon); 
                    nuevoDetalle.setEjercicio(original.getEjercicio());
                    
                    // 👇 AQUÍ ESTÁ LA CORRECCIÓN CON TUS CAMPOS REALES
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

            // 5. Guardar la nueva rutina
            Rutina rutinaGuardada = rutinaDAO.save(clon);

            return ResponseEntity.ok(rutinaGuardada);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Error al clonar plantilla: " + e.getMessage());
        }
    }
}