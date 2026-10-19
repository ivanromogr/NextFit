package com.tuap.backend.auth;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.EventoCalendarioDAO;
import com.tuap.backend.persistencia.RutinaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

/** Explicit export projections: never serialize complete users or JPA relationships. */
@Service
public class TrainingDataExportService {
    private final RutinaDAO rutinas;
    private final SesionEntrenamientoDAO sesiones;
    private final EventoCalendarioDAO eventos;

    public TrainingDataExportService(RutinaDAO rutinas, SesionEntrenamientoDAO sesiones, EventoCalendarioDAO eventos) {
        this.rutinas = rutinas;
        this.sesiones = sesiones;
        this.eventos = eventos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> exportFor(AuthenticatedUser user) {
        if (user.role() == Role.CLIENTE) {
            return Map.of(
                    "routines", rutinas.findByClienteId(user.userId()).stream().map(this::routine).toList(),
                    "sessions", sesiones.findByClienteIdOrderByFechaHoraDesc(user.userId()).stream().map(this::session).toList(),
                    "calendarEvents", eventos.findByClienteIdOrderByFechaAsc(user.userId()).stream().map(this::event).toList());
        }
        // A trainer's export does not bulk-export their clients' private training histories.
        return Map.of("routines", rutinas.findByEntrenadorIdAndEsPlantillaTrue(user.userId()).stream()
                .filter(r -> r.getCliente() == null).map(this::routine).toList(),
                "sessions", List.of(), "calendarEvents", List.of());
    }

    private Map<String, Object> routine(Rutina r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", r.getId()); out.put("name", r.getNombre());
        out.put("description", r.getDescripcion()); out.put("goal", r.getObjetivo());
        out.put("level", r.getNivel()); out.put("creator", r.getCreador());
        out.put("template", r.isEsPlantilla()); out.put("trainerId", r.getEntrenadorId());
        out.put("exercises", r.getDetalles().stream().map(this::plannedExercise).toList());
        return out;
    }

    private Map<String, Object> plannedExercise(DetalleRutina d) {
        Map<String, Object> out = exercise(d.getEjercicio());
        out.put("id", d.getId()); out.put("sets", d.getSeries());
        out.put("repetitions", d.getRepeticiones()); out.put("weight", d.getPeso());
        out.put("rpe", d.getRpe()); out.put("notes", d.getNotas()); out.put("days", d.getDias());
        return out;
    }

    private Map<String, Object> session(SesionEntrenamiento s) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", s.getId()); out.put("name", s.getNombre());
        out.put("dateTime", s.getFechaHora()); out.put("durationSeconds", s.getDuracionSegundos());
        out.put("totalVolume", s.getVolumenTotal()); out.put("notes", s.getNotasGenerales());
        out.put("routineId", belongsToClient(s.getRutina(), s.getCliente().getId()) ? s.getRutina().getId() : null);
        out.put("calendarEventId", s.getEventoCalendario() != null && s.getEventoCalendario().getCliente() != null
                && s.getCliente().getId().equals(s.getEventoCalendario().getCliente().getId())
                ? s.getEventoCalendario().getId() : null);
        out.put("sets", s.getSeries().stream().map(this::completedSet).toList());
        return out;
    }

    private Map<String, Object> completedSet(SerieRealizada s) {
        Map<String, Object> out = exercise(s.getEjercicio());
        out.put("id", s.getId()); out.put("setIndex", s.getSetIndex());
        out.put("weight", s.getPeso()); out.put("repetitions", s.getReps());
        out.put("rpe", s.getRpe()); out.put("done", s.isHecho()); out.put("volume", s.getVolumenSerie());
        return out;
    }

    private Map<String, Object> event(EventoCalendario e) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", e.getId()); out.put("date", e.getFecha());
        out.put("routineId", belongsToClient(e.getRutina(), e.getCliente().getId()) ? e.getRutina().getId() : null);
        out.put("routineName", belongsToClient(e.getRutina(), e.getCliente().getId()) ? e.getRutina().getNombre() : null);
        out.put("completed", e.isCompletado()); out.put("durationSeconds", e.getDuracionSegundos());
        out.put("totalVolume", e.getVolumenTotal()); out.put("trainerId", e.getEntrenadorId());
        return out;
    }

    private boolean belongsToClient(Rutina r, UUID clientId) {
        return r != null && r.getCliente() != null && clientId.equals(r.getCliente().getId());
    }

    private Map<String, Object> exercise(Ejercicio e) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("exerciseId", e == null ? null : e.getId());
        out.put("exerciseName", e == null ? null : e.getNombre());
        out.put("translatedName", e == null ? null : e.getNombreTraducido());
        return out;
    }
}
