package com.tuap.backend.controladores;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.OwnershipService;
import com.tuap.backend.auth.Role;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.RutinaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@RestController
@RequestMapping("/api/calendario")
public class CalendarioController {

    private static final String ENTRENADOR_ID_PARAM = "entrenadorId";

    private final EventoCalendarioDAO eventoDAO;
    private final ClienteDAO clienteDAO;
    private final RutinaDAO rutinaDAO;
    private final SesionEntrenamientoDAO sesionDAO;
    private final OwnershipService ownershipService;

    public CalendarioController(
            EventoCalendarioDAO eventoDAO,
            ClienteDAO clienteDAO,
            RutinaDAO rutinaDAO,
            SesionEntrenamientoDAO sesionDAO,
            OwnershipService ownershipService) {
        this.eventoDAO = eventoDAO;
        this.clienteDAO = clienteDAO;
        this.rutinaDAO = rutinaDAO;
        this.sesionDAO = sesionDAO;
        this.ownershipService = ownershipService;
    }

    @GetMapping("/{clienteId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getEventos(
            @PathVariable UUID clienteId,
            @RequestParam String inicio, 
            @RequestParam String fin,
            @RequestParam(required = false) String entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireClientAccess(clienteId, principal);
        validarFiltroEntrenador(entrenadorId, principal);
        
        LocalDate fechaInicio = LocalDate.parse(inicio);
        LocalDate fechaFin = LocalDate.parse(fin);
        LocalDate hoy = LocalDate.now(); 

        List<EventoCalendario> eventos = eventoDAO.findByClienteIdAndFechaBetween(clienteId, fechaInicio, fechaFin);

        if (entrenadorId != null) {
            eventos = eventos.stream()
                    .filter(e -> {
                        boolean eventoEsMio = e.getEntrenadorId() != null && e.getEntrenadorId().toString().equals(entrenadorId);
                        Rutina rutina = e.getRutina();
                        boolean rutinaEsMia = rutina != null && rutina.getEntrenadorId() != null && rutina.getEntrenadorId().toString().equals(entrenadorId);
                        return eventoEsMio || rutinaEsMia;
                    })
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> respuesta = eventos.stream()
        .map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getId());
            map.put("fecha", e.getFecha());
            Rutina rutina = e.getRutina();
            map.put("rutinaNombre", rutina != null ? rutina.getNombre() : "Rutina no disponible");
            map.put("rutinaId", rutina != null ? rutina.getId() : null);
            map.put("completado", e.isCompletado());
            map.put("duracion", e.getDuracionSegundos());
            map.put("volumen", e.getVolumenTotal());
            
            String estado;
            if (e.isCompletado()) {
                estado = "COMPLETADO";
            } else if (e.getFecha().isBefore(hoy)) {
                estado = "SALTADO";
            } else {
                estado = "PENDIENTE";
            }
            map.put("estado", estado);

            return map;
        })
        .collect(Collectors.toList());

        return ResponseEntity.ok(respuesta);
    }

    @PostMapping("/{clienteId}")
    public ResponseEntity<String> crearEvento(@PathVariable UUID clienteId, @RequestBody Map<String, String> payload, @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireClientAccess(clienteId, principal);
        UUID rutinaId = UUID.fromString(payload.get("rutinaId"));
        LocalDate fecha = LocalDate.parse(payload.get("fecha"));
        Cliente cliente = clienteDAO.findById(clienteId).orElse(null);
        Rutina rutina = rutinaDAO.findById(rutinaId).orElse(null);

        if (cliente == null || rutina == null) return ResponseEntity.badRequest().body("Error datos");
        ownershipService.requireRoutineAccess(rutina, principal);
        if (rutina.getCliente() == null || !clienteId.equals(rutina.getCliente().getId())) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
        validarFiltroEntrenador(payload.get(ENTRENADOR_ID_PARAM), principal);

        EventoCalendario evento = new EventoCalendario(fecha, rutina, cliente);
        
        if (principal.role() == Role.ENTRENADOR) {
            evento.setEntrenadorId(principal.userId());
        }

        eventoDAO.save(evento);
        return ResponseEntity.ok("Evento programado");
    }

    @DeleteMapping("/{eventoId}")
    @Transactional
    public ResponseEntity<String> eliminarEvento(@PathVariable UUID eventoId, @AuthenticationPrincipal AuthenticatedUser principal) {
        EventoCalendario evento = eventoDAO.findById(eventoId).orElse(null);
        if (evento == null) {
            return ResponseEntity.notFound().build();
        }
        ownershipService.requireClientAccess(evento.getCliente().getId(), principal);

        SesionEntrenamiento sesion = sesionDAO.findByEventoCalendario_Id(eventoId);
        if (sesion != null) {
            sesion.setEventoCalendario(null);
            sesionDAO.save(sesion);
        }

        eventoDAO.delete(evento);
        return ResponseEntity.ok("Evento eliminado");
    }

    @PutMapping("/{eventoId}/toggle")
    public ResponseEntity<Object> toggleCompletado(@PathVariable UUID eventoId, @AuthenticationPrincipal AuthenticatedUser principal) {
        EventoCalendario evento = eventoDAO.findById(eventoId).orElse(null);
        if (evento == null) return ResponseEntity.notFound().build();
        ownershipService.requireSelf(evento.getCliente().getId(), principal, Role.CLIENTE);

        evento.setCompletado(!evento.isCompletado());
        eventoDAO.save(evento);

        return ResponseEntity.ok(Map.of("completado", evento.isCompletado()));
    }
    
    @PutMapping("/{eventoId}/mover")
    public ResponseEntity<String> moverEvento(@PathVariable UUID eventoId, @RequestBody Map<String, String> payload, @AuthenticationPrincipal AuthenticatedUser principal) {
        try {
            LocalDate nuevaFecha = LocalDate.parse(payload.get("nuevaFecha"));
            EventoCalendario evento = eventoDAO.findById(eventoId).orElse(null);
            
            if (evento == null) return ResponseEntity.notFound().build();
            ownershipService.requireClientAccess(evento.getCliente().getId(), principal);
            
            evento.setFecha(nuevaFecha);
            eventoDAO.save(evento);
            
            return ResponseEntity.ok("Evento movido a " + nuevaFecha);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al mover evento");
        }
    }

    private void validarFiltroEntrenador(String entrenadorId, AuthenticatedUser principal) {
        if (entrenadorId == null || entrenadorId.isBlank()) return;
        if (principal == null || principal.role() != Role.ENTRENADOR || !principal.userId().toString().equals(entrenadorId)) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
    }

    @Deprecated public ResponseEntity<List<Map<String, Object>>> getEventos(UUID clienteId, String inicio, String fin, String entrenadorId) {
        AuthenticatedUser principal = entrenadorId == null ? new AuthenticatedUser(clienteId, "test@local", Role.CLIENTE)
                : new AuthenticatedUser(UUID.fromString(entrenadorId), "test@local", Role.ENTRENADOR);
        return getEventos(clienteId, inicio, fin, entrenadorId, principal);
    }
    @Deprecated public ResponseEntity<String> crearEvento(UUID clienteId, Map<String, String> payload) {
        String entrenadorId = payload.get(ENTRENADOR_ID_PARAM);
        AuthenticatedUser principal = entrenadorId == null ? new AuthenticatedUser(clienteId, "test@local", Role.CLIENTE)
                : new AuthenticatedUser(UUID.fromString(entrenadorId), "test@local", Role.ENTRENADOR);
        return crearEvento(clienteId, payload, principal);
    }
    @Deprecated public ResponseEntity<String> eliminarEvento(UUID eventoId) { return eliminarEvento(eventoId, new AuthenticatedUser(UUID.randomUUID(), "test@local", Role.CLIENTE)); }
    @Deprecated public ResponseEntity<Object> toggleCompletado(UUID eventoId) { return toggleCompletado(eventoId, new AuthenticatedUser(UUID.randomUUID(), "test@local", Role.CLIENTE)); }
}
