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
        
        // 1. Calcular rango de esta semana (Lunes a Domingo)
        LocalDate inicioSemana = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate finSemana = hoy.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 2. Obtener todos los eventos de la semana
        List<EventoCalendario> eventosSemana = eventoDAO.findByClienteIdAndFechaBetween(clienteId, inicioSemana, finSemana);

        // 3. Calcular Estadísticas
        long entrenosHechos = eventosSemana.stream().filter(EventoCalendario::isCompletado).count();
        long entrenosTotal = eventosSemana.size(); 
        
        // Sumar volumen de la semana (evitando nulos)
        double volumenSemana = eventosSemana.stream()
                .filter(e -> e.getVolumenTotal() != null)
                .mapToDouble(EventoCalendario::getVolumenTotal)
                .sum();

        // 4. Buscar si hay algo programado para HOY
        EventoCalendario eventoHoy = eventosSemana.stream()
                .filter(e -> e.getFecha().isEqual(hoy))
                .findFirst()
                .orElse(null);

        // 5. Construir Respuesta JSON
        Map<String, Object> response = new HashMap<>();
        response.put("entrenosHechos", entrenosHechos);
        // Si no hay nada programado, ponemos objetivo base de 4 para que la barra no se rompa
        response.put("entrenosObjetivo", entrenosTotal > 0 ? entrenosTotal : 4); 
        response.put("volumenSemana", volumenSemana);
        
        // Enviamos datos del evento de hoy para la tarjeta gigante
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