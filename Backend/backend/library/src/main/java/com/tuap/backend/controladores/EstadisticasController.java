package com.tuap.backend.controladores;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.gestores.GestorEstadisticas;

@RestController
@RequestMapping("/api/stats")
public class EstadisticasController {

    @Autowired private GestorEstadisticas gestorEstadisticas;

    @GetMapping("/global/{clienteId}")
    public ResponseEntity<?> getGlobalStats(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(gestorEstadisticas.obtenerStatsGlobales(clienteId));
    }

    @GetMapping("/ejercicio/{clienteId}/{ejercicioId}")
    public ResponseEntity<?> getExerciseStats(@PathVariable UUID clienteId, @PathVariable UUID ejercicioId) {
        var stats = gestorEstadisticas.obtenerProgresoEjercicio(clienteId, ejercicioId);
        if (stats == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(stats);
    }


    @GetMapping("/prs/{clienteId}")
    public ResponseEntity<?> getPersonalRecords(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(gestorEstadisticas.obtenerPersonalRecords(clienteId));
    }
}