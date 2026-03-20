package com.tuap.backend.controladores;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.persistencia.EventoCalendarioDAO;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired private EventoCalendarioDAO eventoDAO;

    @GetMapping("/resumen/{clienteId}")
    public ResponseEntity<Map<String, Object>> getResumen(@PathVariable UUID clienteId) {
        LocalDate hoy = LocalDate.now();
        
        // 1. Calcular rango de esta semana 
        LocalDate inicioSemana = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate finSemana = hoy.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 2. Obtener todos los eventos de la semana
        List<EventoCalendario> eventosSemana = eventoDAO.findByClienteIdAndFechaBetween(clienteId, inicioSemana, finSemana);

        // 3. Calcular Estadísticas
        long entrenosHechos = eventosSemana.stream().filter(EventoCalendario::isCompletado).count();
        long entrenosTotal = eventosSemana.size(); 
        
        // Sumar volumen de la semana 
        double volumenSemana = eventosSemana.stream()
                .filter(e -> e.getVolumenTotal() != null)
                .mapToDouble(EventoCalendario::getVolumenTotal)
                .sum();

        // 4. Buscar si hay algo programado para HOY
        EventoCalendario eventoHoy = eventosSemana.stream()
                .filter(e -> e.getFecha().isEqual(hoy))
                .findFirst()
                .orElse(null);

        // 5. Calcular racha actual (contar hacia atrás desde hoy hasta el primer día que no se completó)
        List<EventoCalendario> eventosHistorial = eventoDAO.findByClienteIdAndFechaLessThanEqualOrderByFechaDesc(clienteId, hoy);
        int racha = 0;

        for (EventoCalendario evento : eventosHistorial) {
            if (evento.isCompletado()) {
                racha++; // Si lo hizo, suma 1
            } else {
                if (evento.getFecha().isBefore(hoy)) {
                    // Si el entreno es de AYER o antes y no se hizo, se rompe la racha
                    break;
                }
                // Si es de HOY y no está completado, no pasa nada, la racha sigue viva
            }
        }

       

        Map<String, Object> response = new HashMap<>();
        response.put("entrenosHechos", entrenosHechos);
        response.put("entrenosObjetivo", entrenosTotal > 0 ? entrenosTotal : 4); 
        response.put("volumenSemana", volumenSemana);
        
       
        response.put("rachaActual", racha);
        
        // Enviamos datos del evento de hoy
        if (eventoHoy != null) {
            Map<String, Object> hoyMap = new HashMap<>();
            hoyMap.put("id", eventoHoy.getId());
            hoyMap.put("rutinaId", eventoHoy.getRutina().getId());
            hoyMap.put("rutinaNombre", eventoHoy.getRutina().getNombre());
            hoyMap.put("completado", eventoHoy.isCompletado());
            response.put("eventoHoy", hoyMap);
        } else {
            response.put("eventoHoy", null);
        }

        return ResponseEntity.ok(response);
    }
}