package com.tuap.backend.controladores;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.gestores.GestorRutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;

@RestController
@RequestMapping("/api/rutinas")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class RutinaController {

    @Autowired
    private GestorRutina gestorRutina;

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

    // CLIENTE: Ve TODAS (Suyas + Entrenador)
    @GetMapping("/cliente/{idCliente}")
    public List<Rutina> obtenerRutinas(@PathVariable UUID idCliente) {
        return gestorRutina.obtenerRutinasDeCliente(idCliente);
    }

    // ✅ ENTRENADOR: Solo ve las que él ha creado para el cliente
    @GetMapping("/cliente/{idCliente}/entrenador")
    public List<Rutina> obtenerRutinasEntrenador(@PathVariable UUID idCliente) {
        return gestorRutina.obtenerRutinasDeEntrenadorParaCliente(idCliente);
    }
}