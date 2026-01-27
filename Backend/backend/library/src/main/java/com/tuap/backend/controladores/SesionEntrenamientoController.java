package com.tuap.backend.controladores;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dominio.gestores.GestorSesion;
import com.tuap.backend.dto.GuardarSesionRequest;
import com.tuap.backend.dto.UltimaSesionResponse;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@RestController
@RequestMapping("/api/sesiones")

public class SesionEntrenamientoController {

    @Autowired private GestorSesion gestorSesion;
    @Autowired private SesionEntrenamientoDAO sesionDAO;

    // GUARDAR UNA SESIÓN COMPLETADA
    @PostMapping
    public ResponseEntity<?> guardarSesion(@RequestBody GuardarSesionRequest req) {
        try {
            SesionEntrenamiento guardada = gestorSesion.guardarSesion(req);
            return ResponseEntity.ok(guardada);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error al guardar sesión: " + e.getMessage());
        }
    }

    // LISTAR HISTORIAL DEL CLIENTE (Ordenado por fecha)
    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<?> listarSesiones(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId));
    }

    // Obtener la última sesión de una rutina
    @GetMapping("/ultima")
    public ResponseEntity<?> obtenerUltimaSesion(
            @RequestParam UUID clienteId, 
            @RequestParam UUID rutinaId) {
        
        // Buscamos la más reciente
        var sesionOpt = sesionDAO.findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(clienteId, rutinaId);
        
        if (sesionOpt.isEmpty()) {
            return ResponseEntity.noContent().build(); // 204 Si nunca la ha hecho
        }
        
        SesionEntrenamiento sesion = sesionOpt.get();
        
        // Convertir a DTO para evitar referencias circulares
        List<UltimaSesionResponse.SerieResponse> series = new ArrayList<>();
        sesion.getSeries().forEach(s -> {
            series.add(new UltimaSesionResponse.SerieResponse(
                s.getEjercicio().getId(),
                s.getEjercicio().getNombre(),
                s.getSetIndex(),
                s.getPeso(),
                s.getReps(),
                s.getRpe(),
                s.isHecho()
            ));
        });
        
        UltimaSesionResponse response = new UltimaSesionResponse(
            sesion.getId(),
            sesion.getNombre(),
            sesion.getFechaHora(),
            sesion.getDuracionSegundos(),
            sesion.getVolumenTotal(),
            sesion.getNotasGenerales(),
            series
        );
        
        return ResponseEntity.ok(response);
    }
}