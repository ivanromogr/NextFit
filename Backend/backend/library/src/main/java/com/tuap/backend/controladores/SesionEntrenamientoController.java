package com.tuap.backend.controladores;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger; 
import org.slf4j.LoggerFactory; 
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dominio.gestores.GestorSesion;
import com.tuap.backend.dto.GuardarSesionRequest;
import com.tuap.backend.dto.UltimaSesionResponse;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO.ActividadDashboardResumen;

@RestController
@RequestMapping("/api/sesiones")
public class SesionEntrenamientoController {

    private static final String CLIENTE_ID_PARAM = "clienteId";
   
    private static final Logger log = LoggerFactory.getLogger(SesionEntrenamientoController.class);

    private final GestorSesion gestorSesion;
    private final SesionEntrenamientoDAO sesionDAO;
    private final ClienteDAO clienteDAO;

    public SesionEntrenamientoController(GestorSesion gestorSesion, 
                                          SesionEntrenamientoDAO sesionDAO, 
                                          ClienteDAO clienteDAO) {
        this.gestorSesion = gestorSesion;
        this.sesionDAO = sesionDAO;
        this.clienteDAO = clienteDAO;
    }

    @PostMapping
    public ResponseEntity<Object> guardarSesion(@RequestBody GuardarSesionRequest req) {
        try {
            SesionEntrenamiento guardada = gestorSesion.guardarSesion(req);
            Map<String, Object> response = new HashMap<>();
            response.put("id", guardada.getId());
            response.put("nombre", guardada.getNombre());
            response.put("clienteId", guardada.getCliente().getId());
            response.put("rutinaId", guardada.getRutina() != null ? guardada.getRutina().getId() : null);
            response.put("fechaHora", guardada.getFechaHora());
            response.put("duracionSegundos", guardada.getDuracionSegundos());
            response.put("volumenTotal", guardada.getVolumenTotal());
            response.put("seriesGuardadas", guardada.getSeries() != null ? guardada.getSeries().size() : 0);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error al guardar sesión", e);
            return ResponseEntity.badRequest().body("Error al guardar sesión: " + e.getMessage());
        }
    }

    @GetMapping("/cliente/{clienteId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listarSesiones(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId)
                .stream()
                .map(this::mapSesionResumen)
                .toList());
    }

    @GetMapping("/evento/{eventoId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getDetalleSesionPorEvento(@PathVariable UUID eventoId) {
        SesionEntrenamiento sesion = sesionDAO.findByEventoCalendario_Id(eventoId);
        
        if (sesion == null) {
            return ResponseEntity.notFound().build();
        }

        Map<String, Object> respuesta = new HashMap<>();
        respuesta.put("id", sesion.getId());
        respuesta.put("duracion", sesion.getDuracionSegundos());
        respuesta.put("volumenTotal", sesion.getVolumenTotal());
        respuesta.put("fecha", sesion.getFechaHora());
        respuesta.put("notas", sesion.getNotasGenerales());

        List<Map<String, Object>> ejerciciosRealizados = sesion.getSeries().stream()
            .filter(serie -> serie.getEjercicio() != null)
            .collect(java.util.stream.Collectors.groupingBy(serie -> serie.getEjercicio().getNombre()))
            .entrySet().stream()
            .map(entry -> {
                Map<String, Object> ejMap = new HashMap<>();
                ejMap.put("nombre", entry.getKey());
                
                List<Map<String, Object>> seriesInfo = entry.getValue().stream().map(s -> {
                    Map<String, Object> sMap = new HashMap<>();
                    sMap.put("kilos", s.getPeso());
                    sMap.put("repes", s.getReps());
                    sMap.put("rpe", s.getRpe());
                    return sMap;
                }).toList(); 

                ejMap.put("series", seriesInfo);
                return ejMap;
            })
            .toList(); 

        respuesta.put("ejercicios", ejerciciosRealizados);
        return ResponseEntity.ok(respuesta);
    }

    private Map<String, Object> mapSesionResumen(SesionEntrenamiento sesion) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", sesion.getId());
        map.put("nombre", sesion.getNombre());
        map.put("fechaHora", sesion.getFechaHora());
        map.put("duracionSegundos", sesion.getDuracionSegundos());
        map.put("volumenTotal", sesion.getVolumenTotal());
        map.put("notasGenerales", sesion.getNotasGenerales());
        map.put("clienteId", sesion.getCliente() != null ? sesion.getCliente().getId() : null);
        map.put("rutinaId", sesion.getRutina() != null ? sesion.getRutina().getId() : null);
        map.put("rutinaNombre", sesion.getRutina() != null ? sesion.getRutina().getNombre() : sesion.getNombre());
        map.put("eventoCalendarioId", sesion.getEventoCalendario() != null ? sesion.getEventoCalendario().getId() : null);

        List<Map<String, Object>> series = sesion.getSeries() == null
                ? List.of()
                : sesion.getSeries().stream()
                    .filter(serie -> serie.getEjercicio() != null)
                    .map(serie -> {
                        Map<String, Object> serieMap = new HashMap<>();
                        serieMap.put("id", serie.getId());
                        serieMap.put("ejercicioId", serie.getEjercicio().getId());
                        serieMap.put("ejercicioNombre", serie.getEjercicio().getNombre());
                        serieMap.put("setIndex", serie.getSetIndex());
                        serieMap.put("peso", serie.getPeso());
                        serieMap.put("reps", serie.getReps());
                        serieMap.put("rpe", serie.getRpe());
                        serieMap.put("hecho", serie.isHecho());
                        serieMap.put("volumenSerie", serie.getVolumenSerie());
                        return serieMap;
                    })
                    .toList();

        map.put("series", series);
        return map;
    }

    @GetMapping("/ultima")
    @Transactional(readOnly = true)
    public ResponseEntity<UltimaSesionResponse> obtenerUltimaSesion(
            @RequestParam(name = CLIENTE_ID_PARAM) UUID clienteId, 
            @RequestParam UUID rutinaId) {
        var sesionOpt = sesionDAO.findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(clienteId, rutinaId);
        
        if (sesionOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        
        SesionEntrenamiento sesion = sesionOpt.get();
        List<UltimaSesionResponse.SerieResponse> series = new ArrayList<>();
        if (sesion.getSeries() != null) {
            sesion.getSeries().stream()
                .filter(s -> s.getEjercicio() != null)
                .forEach(s -> 
                    series.add(new UltimaSesionResponse.SerieResponse(
                        s.getEjercicio().getId(), s.getEjercicio().getNombre(), s.getSetIndex(),
                        s.getPeso(), s.getReps(), s.getRpe(), s.isHecho()
                    ))
                );
        }
        
        UltimaSesionResponse response = new UltimaSesionResponse(
            sesion.getId(), sesion.getNombre(), sesion.getFechaHora(),
            sesion.getDuracionSegundos(), sesion.getVolumenTotal(),
            sesion.getNotasGenerales(), series
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{entrenadorId}/dashboard-resumen")
    @Transactional(readOnly = true)
    public ResponseEntity<Object> getDashboardResumen(@PathVariable UUID entrenadorId) {
        try {
            List<ActividadDashboardResumen> ultimas = sesionDAO.findResumenActividadDashboardByEntrenador(
                    entrenadorId,
                    PageRequest.of(0, 10));
            
           
            Map<String, Long> stats = calcularMetricasInteligentes(entrenadorId);

            List<Map<String, Object>> feed = ultimas.stream().map(s -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("clienteNombre", nombreCompleto(s.getClienteNombre(), s.getClienteApellido()));
                map.put(CLIENTE_ID_PARAM, s.getClienteId());
                map.put("rutina", s.getRutina() != null ? s.getRutina() : "Entreno Libre");
                map.put("fecha", s.getFecha());
                map.put("volumen", s.getVolumen() != null ? s.getVolumen() : 0);
                map.put("duracion", s.getDuracion() != null ? s.getDuracion() : 0);
                return map;
            }).toList(); 

            Map<String, Object> response = new HashMap<>();
            response.put("stats", stats);
            response.put("feedActividad", feed);
            
            long totalClientes = clienteDAO.countByEntrenador_Id(entrenadorId);
            response.put("totalClientes", totalClientes);

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error en dashboard de sesiones", e);
            return ResponseEntity.internalServerError().body("Error dashboard: " + e.getMessage());
        }
    }

    private String nombreCompleto(String nombre, String apellido) {
        String completo = ((nombre != null ? nombre : "") + " " + (apellido != null ? apellido : "")).trim();
        return completo.isEmpty() ? "Atleta" : completo;
    }

    private Map<String, Long> calcularMetricasInteligentes(UUID entrenadorId) {
        Map<String, Long> stats = new HashMap<>();
        try {
            LocalDate hoy = LocalDate.now();
            LocalDateTime inicioHoy = hoy.atStartOfDay();
            LocalDateTime finHoy = hoy.plusDays(1).atStartOfDay();
            LocalDateTime inicioSemana = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
            LocalDateTime finSemana = hoy.plusDays(1).atStartOfDay();

            stats.put("hoy", sesionDAO.countClientesEntrenadosDashboardEnRangoByEntrenador(entrenadorId, inicioHoy, finHoy));
            stats.put("riesgo", sesionDAO.countClientesInactivos(entrenadorId, LocalDateTime.now().minusDays(7)));
            stats.put("records", sesionDAO.countSesionesDashboardEnRangoByEntrenador(entrenadorId, inicioSemana, finSemana));
        } catch (Exception e) {
            log.warn("Aviso: DAO no actualizado para métricas águila: {}", e.getMessage());
            stats.put("hoy", 0L);
            stats.put("riesgo", 0L);
            stats.put("records", 0L);
        }
        return stats;
    }
}
