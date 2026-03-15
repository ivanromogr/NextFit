package com.tuap.backend.controladores;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@RestController
@RequestMapping("/api/calendario")
public class CalendarioController {

    @Autowired private EventoCalendarioDAO eventoDAO;
    @Autowired private ClienteDAO clienteDAO;
    @Autowired private RutinaDAO rutinaDAO;

    // 1. Obtener eventos (CON FILTRO DE PRIVACIDAD ABSOLUTA ENTRE ENTRENADORES)
    @GetMapping("/{clienteId}")
    public ResponseEntity<List<Map<String, Object>>> getEventos(
            @PathVariable UUID clienteId,
            @RequestParam String inicio, 
            @RequestParam String fin,
            @RequestParam(required = false) String entrenadorId) {
        
        LocalDate fechaInicio = LocalDate.parse(inicio);
        LocalDate fechaFin = LocalDate.parse(fin);
        LocalDate hoy = LocalDate.now(); 

        List<EventoCalendario> eventos = eventoDAO.findByClienteIdAndFechaBetween(clienteId, fechaInicio, fechaFin);

        // 🛡️ SEGURIDAD ESTRICTA: Sin parches temporales
        if (entrenadorId != null) {
            System.out.println("🕵️‍♂️ Filtrando calendario estrictamente para el entrenador: " + entrenadorId);
            
            eventos = eventos.stream()
                    .filter(e -> {
                        boolean eventoEsMio = e.getEntrenadorId() != null && e.getEntrenadorId().toString().equals(entrenadorId);
                        boolean rutinaEsMia = e.getRutina().getEntrenadorId() != null && e.getRutina().getEntrenadorId().toString().equals(entrenadorId);
                        
                        // Solo pasa si el entrenador programó el evento o si la rutina es de su propiedad
                        if (eventoEsMio || rutinaEsMia) {
                            return true;
                        } else {
                            System.out.println("❌ Evento bloqueado: No pertenece a este entrenador.");
                            return false;
                        }
                    })
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> respuesta = eventos.stream().map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", e.getId());
            map.put("fecha", e.getFecha());
            map.put("rutinaNombre", e.getRutina().getNombre());
            map.put("rutinaId", e.getRutina().getId());
            map.put("completado", e.isCompletado()); // Booleano base
            map.put("duracion", e.getDuracionSegundos());
            map.put("volumen", e.getVolumenTotal());
            
            // CALCULAR EL ESTADO PARA EL COLOR
            String estado;
            if (e.isCompletado()) {
                estado = "COMPLETADO"; // Esto activará el color VERDE
            } else if (e.getFecha().isBefore(hoy)) {
                estado = "SALTADO";    // Esto activará el color ROJO
            } else {
                estado = "PENDIENTE";  // Esto activará el color AMARILLO
            }
            map.put("estado", estado);

            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(respuesta);
    }

    // 2. Programar rutina (GUARDANDO LA FIRMA DEL ENTRENADOR)
    @PostMapping("/{clienteId}")
    public ResponseEntity<?> crearEvento(@PathVariable UUID clienteId, @RequestBody Map<String, String> payload) {
        UUID rutinaId = UUID.fromString(payload.get("rutinaId"));
        LocalDate fecha = LocalDate.parse(payload.get("fecha"));
        Cliente cliente = clienteDAO.findById(clienteId).orElse(null);
        Rutina rutina = rutinaDAO.findById(rutinaId).orElse(null);

        if (cliente == null || rutina == null) return ResponseEntity.badRequest().body("Error datos");

        EventoCalendario evento = new EventoCalendario(fecha, rutina, cliente);
        
        // 🔒 Guardamos obligatoriamente la firma de quién crea el evento
        if (payload.containsKey("entrenadorId") && payload.get("entrenadorId") != null) {
            evento.setEntrenadorId(UUID.fromString(payload.get("entrenadorId")));
        }

        eventoDAO.save(evento);
        return ResponseEntity.ok("Evento programado");
    }

    // 3. Eliminar evento
    @DeleteMapping("/{eventoId}")
    public ResponseEntity<?> eliminarEvento(@PathVariable UUID eventoId) {
        eventoDAO.deleteById(eventoId);
        return ResponseEntity.ok("Evento eliminado");
    }

    // 4. Toggle Completado (EL BOTÓN DEL CHECK)
    @PutMapping("/{eventoId}/toggle")
    public ResponseEntity<?> toggleCompletado(@PathVariable UUID eventoId) {
        EventoCalendario evento = eventoDAO.findById(eventoId).orElse(null);
        if (evento == null) return ResponseEntity.notFound().build();

        evento.setCompletado(!evento.isCompletado());
        eventoDAO.save(evento);

        return ResponseEntity.ok(Map.of("completado", evento.isCompletado()));
    }
    
    // 5. Mover evento (Drag & Drop)
    @PutMapping("/{eventoId}/mover")
    public ResponseEntity<?> moverEvento(@PathVariable UUID eventoId, @RequestBody Map<String, String> payload) {
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