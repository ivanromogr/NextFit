package com.tuap.backend.controladores;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@RestController
@RequestMapping("/api/calendario")
public class CalendarioController {

    private static final String ENTRENADOR_ID_PARAM = "entrenadorId";

    private final EventoCalendarioDAO eventoDAO;
    private final ClienteDAO clienteDAO;
    private final RutinaDAO rutinaDAO;

    // 🧹 SOLUCIÓN SONARQUBE: Constructor Injection en lugar de Field Injection
    public CalendarioController(EventoCalendarioDAO eventoDAO, ClienteDAO clienteDAO, RutinaDAO rutinaDAO) {
        this.eventoDAO = eventoDAO;
        this.clienteDAO = clienteDAO;
        this.rutinaDAO = rutinaDAO;
    }

    @GetMapping("/{clienteId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getEventos(
            @PathVariable UUID clienteId,
            @RequestParam String inicio, 
            @RequestParam String fin,
            @RequestParam(required = false) String entrenadorId) {
        
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
    public ResponseEntity<String> crearEvento(@PathVariable UUID clienteId, @RequestBody Map<String, String> payload) {
        UUID rutinaId = UUID.fromString(payload.get("rutinaId"));
        LocalDate fecha = LocalDate.parse(payload.get("fecha"));
        Cliente cliente = clienteDAO.findById(clienteId).orElse(null);
        Rutina rutina = rutinaDAO.findById(rutinaId).orElse(null);

        if (cliente == null || rutina == null) return ResponseEntity.badRequest().body("Error datos");

        if (payload.containsKey(ENTRENADOR_ID_PARAM) && payload.get(ENTRENADOR_ID_PARAM) != null) {
            UUID entrenadorId = UUID.fromString(payload.get(ENTRENADOR_ID_PARAM));
            if (rutina.getEntrenadorId() == null || !rutina.getEntrenadorId().equals(entrenadorId)) {
                return ResponseEntity.status(403).body("El entrenador solo puede programar rutinas creadas por él");
            }
        }

        EventoCalendario evento = new EventoCalendario(fecha, rutina, cliente);
        
        if (payload.containsKey(ENTRENADOR_ID_PARAM) && payload.get(ENTRENADOR_ID_PARAM) != null) {
            evento.setEntrenadorId(UUID.fromString(payload.get(ENTRENADOR_ID_PARAM)));
        }

        eventoDAO.save(evento);
        return ResponseEntity.ok("Evento programado");
    }

    @DeleteMapping("/{eventoId}")
    public ResponseEntity<String> eliminarEvento(@PathVariable UUID eventoId) {
        eventoDAO.deleteById(eventoId);
        return ResponseEntity.ok("Evento eliminado");
    }

    @PutMapping("/{eventoId}/toggle")
    public ResponseEntity<Object> toggleCompletado(@PathVariable UUID eventoId) {
        EventoCalendario evento = eventoDAO.findById(eventoId).orElse(null);
        if (evento == null) return ResponseEntity.notFound().build();

        evento.setCompletado(!evento.isCompletado());
        eventoDAO.save(evento);

        return ResponseEntity.ok(Map.of("completado", evento.isCompletado()));
    }
    
    @PutMapping("/{eventoId}/mover")
    public ResponseEntity<String> moverEvento(@PathVariable UUID eventoId, @RequestBody Map<String, String> payload) {
        try {
            LocalDate nuevaFecha = LocalDate.parse(payload.get("nuevaFecha"));
            EventoCalendario evento = eventoDAO.findById(eventoId).orElse(null);
            
            if (evento == null) return ResponseEntity.notFound().build();
            
            evento.setFecha(nuevaFecha);
            eventoDAO.save(evento);
            
            return ResponseEntity.ok("Evento movido a " + nuevaFecha);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al mover evento");
        }
    }
}
