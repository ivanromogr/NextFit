package com.tuap.backend.controladores;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.gestores.GestorRutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;

@RestController
@RequestMapping("/api/rutinas")
@CrossOrigin(origins = "*")
public class RutinaController {

    @Autowired
    private GestorRutina gestorRutina;

    // Generar con IA
    @PostMapping("/generar")
    public ResponseEntity<?> generarAuto(@RequestBody GenerarRutinaRequest request) {
        try {
            Rutina rutina = gestorRutina.generarRutinaAutomatica(request);
            return ResponseEntity.ok(rutina);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // Crear Manual
    @PostMapping("/manual")
    public ResponseEntity<?> crearManual(@RequestBody RutinaRequest request) {
        try {
            Rutina rutina = gestorRutina.crearRutinaManual(request);
            return ResponseEntity.ok(rutina);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // Ver rutinas del cliente
    @GetMapping("/cliente/{idCliente}")
    public ResponseEntity<List<Rutina>> listarRutinas(@PathVariable UUID idCliente) {
        return ResponseEntity.ok(gestorRutina.obtenerRutinasDeCliente(idCliente));
    }
}