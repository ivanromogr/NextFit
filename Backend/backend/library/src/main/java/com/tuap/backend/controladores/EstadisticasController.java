package com.tuap.backend.controladores;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.gestores.GestorEstadisticas;

@RestController
@RequestMapping("/api/stats")
public class EstadisticasController {

    @Autowired private GestorEstadisticas gestorEstadisticas;

    // 1. Estadísticas Globales (Kilos totales, entrenos, etc.)
    @GetMapping("/global/{clienteId}")
    public ResponseEntity<?> getGlobalStats(
            @PathVariable UUID clienteId,
            @RequestParam(required = false) UUID entrenadorId) { 
        
        // Pasamos ambos IDs al gestor para que filtre los datos
        return ResponseEntity.ok(gestorEstadisticas.obtenerStatsGlobales(clienteId, entrenadorId));
    }

    // 2. Progreso de un ejercicio (Gráfica de 1RM)
    @GetMapping("/ejercicio/{clienteId}/{ejercicioId}")
    public ResponseEntity<?> getExerciseStats(
            @PathVariable UUID clienteId, 
            @PathVariable UUID ejercicioId,
            @RequestParam(required = false) UUID entrenadorId) { 
        
        var stats = gestorEstadisticas.obtenerProgresoEjercicio(clienteId, ejercicioId, entrenadorId);
        
        if (stats == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(stats);
    }

    // 3. Récords Personales (PRs - Trofeos)
    @GetMapping("/prs/{clienteId}")
    public ResponseEntity<?> getPersonalRecords(
            @PathVariable UUID clienteId,
            @RequestParam(required = false) UUID entrenadorId) { 
        
        return ResponseEntity.ok(gestorEstadisticas.obtenerPersonalRecords(clienteId, entrenadorId));
    }
}