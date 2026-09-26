package com.tuap.backend.controladores;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.gestores.GestorEstadisticas;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.OwnershipService;
import com.tuap.backend.auth.Role;

@RestController
@RequestMapping("/api/stats")
public class EstadisticasController {

    @Autowired private GestorEstadisticas gestorEstadisticas;
    @Autowired private OwnershipService ownershipService;

    // 1. Estadísticas Globales (Kilos totales, entrenos, etc.)
    @GetMapping("/global/{clienteId}")
    public ResponseEntity<Object> getGlobalStats(
            @PathVariable UUID clienteId,
            @RequestParam(required = false) UUID entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        validarAcceso(clienteId, entrenadorId, principal);
        
        // Pasamos ambos IDs al gestor para que filtre los datos
        return ResponseEntity.ok(gestorEstadisticas.obtenerStatsGlobales(clienteId, entrenadorId));
    }

    // 2. Progreso de un ejercicio (Gráfica de 1RM)
    @GetMapping("/ejercicio/{clienteId}/{ejercicioId}")
    public ResponseEntity<Object> getExerciseStats(
            @PathVariable UUID clienteId, 
            @PathVariable UUID ejercicioId,
            @RequestParam(required = false) UUID entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        validarAcceso(clienteId, entrenadorId, principal);
        
        var stats = gestorEstadisticas.obtenerProgresoEjercicio(clienteId, ejercicioId, entrenadorId);
        
        if (stats == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(stats);
    }

    // 3. Récords Personales (PRs - Trofeos)
    @GetMapping("/prs/{clienteId}")
    public ResponseEntity<Object> getPersonalRecords(
            @PathVariable UUID clienteId,
            @RequestParam(required = false) UUID entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        validarAcceso(clienteId, entrenadorId, principal);
        
        return ResponseEntity.ok(gestorEstadisticas.obtenerPersonalRecords(clienteId, entrenadorId));
    }

    @GetMapping("/ejercicios/{clienteId}")
    public ResponseEntity<Object> getEjerciciosConHistorial(
            @PathVariable UUID clienteId,
            @RequestParam(required = false) UUID entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        validarAcceso(clienteId, entrenadorId, principal);

        return ResponseEntity.ok(gestorEstadisticas.obtenerEjerciciosConHistorial(clienteId, entrenadorId));
    }

    @GetMapping("/progreso/{clienteId}/{ejercicioId}")
    public ResponseEntity<Object> getDatosProgreso(
            @PathVariable UUID clienteId,
            @PathVariable UUID ejercicioId,
            @RequestParam(required = false) UUID entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        validarAcceso(clienteId, entrenadorId, principal);

        return ResponseEntity.ok(gestorEstadisticas.obtenerDatosProgreso(clienteId, ejercicioId, entrenadorId));
    }

    private void validarAcceso(UUID clienteId, UUID entrenadorId, AuthenticatedUser principal) {
        ownershipService.requireClientAccess(clienteId, principal);
        if (entrenadorId != null && (principal.role() != Role.ENTRENADOR || !entrenadorId.equals(principal.userId()))) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
    }

    @Deprecated public ResponseEntity<Object> getGlobalStats(UUID clienteId, UUID entrenadorId) { return getGlobalStats(clienteId, entrenadorId, legacyPrincipal(clienteId, entrenadorId)); }
    @Deprecated public ResponseEntity<Object> getExerciseStats(UUID clienteId, UUID ejercicioId, UUID entrenadorId) { return getExerciseStats(clienteId, ejercicioId, entrenadorId, legacyPrincipal(clienteId, entrenadorId)); }
    @Deprecated public ResponseEntity<Object> getPersonalRecords(UUID clienteId, UUID entrenadorId) { return getPersonalRecords(clienteId, entrenadorId, legacyPrincipal(clienteId, entrenadorId)); }
    private AuthenticatedUser legacyPrincipal(UUID clienteId, UUID entrenadorId) {
        return entrenadorId == null ? new AuthenticatedUser(clienteId, "test@local", Role.CLIENTE)
                : new AuthenticatedUser(entrenadorId, "test@local", Role.ENTRENADOR);
    }
}
