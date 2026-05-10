package com.tuap.backend.controladores;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired private EventoCalendarioDAO eventoDAO;
    @Autowired private SesionEntrenamientoDAO sesionDAO;

    @GetMapping("/resumen/{clienteId}")
    public ResponseEntity<Map<String, Object>> getResumen(@PathVariable UUID clienteId) {
        LocalDate hoy = LocalDate.now();
        
        // 1. Calcular rango de esta semana 
        LocalDate inicioSemana = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate finSemana = hoy.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));

        // 2. Obtener eventos planificados y sesiones realmente completadas esta semana
        List<EventoCalendario> eventosSemana = eventoDAO.findByClienteIdAndFechaBetween(clienteId, inicioSemana, finSemana);
        List<SesionEntrenamiento> sesionesSemana = sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(
                clienteId,
                inicioSemana.atStartOfDay(),
                finSemana.plusDays(1).atStartOfDay()
        );

        // 3. Calcular Estadísticas
        long entrenosHechos = sesionesSemana.size();
        long entrenosTotal = eventosSemana.size(); 
        
        // Sumar volumen de la semana 
        double volumenSemana = sesionesSemana.stream()
                .mapToDouble(SesionEntrenamiento::getVolumenTotal)
                .sum();

        // 4. Buscar si hay algo programado para HOY
        EventoCalendario eventoHoy = eventosSemana.stream()
                .filter(e -> e.getFecha().isEqual(hoy))
                .findFirst()
                .orElse(null);

        // 5. Calcular racha actual usando sesiones completadas, no solo eventos programados.
        List<SesionEntrenamiento> sesionesHistorial = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId);
        Set<LocalDate> diasEntrenados = sesionesHistorial.stream()
                .map(SesionEntrenamiento::getFechaHora)
                .map(LocalDateTime::toLocalDate)
                .collect(Collectors.toSet());
        int racha = 0;
        LocalDate cursor = diasEntrenados.contains(hoy) ? hoy : hoy.minusDays(1);
        while (diasEntrenados.contains(cursor)) {
            racha++;
            cursor = cursor.minusDays(1);
        }

        // Si el usuario marcó un evento como completado manualmente, cuéntalo como hecho.
        long eventosCompletadosSinSesion = eventosSemana.stream()
                .filter(EventoCalendario::isCompletado)
                .filter(evento -> sesionesSemana.stream().noneMatch(sesion ->
                        sesion.getEventoCalendario() != null && sesion.getEventoCalendario().getId().equals(evento.getId())
                ))
                .count();
        entrenosHechos += eventosCompletadosSinSesion;
        if (racha == 0) {
            boolean eventoHoyCompletado = eventosSemana.stream()
                    .anyMatch(e -> e.getFecha().isEqual(hoy) && e.isCompletado());
            if (eventoHoyCompletado) {
                racha = 1;
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
