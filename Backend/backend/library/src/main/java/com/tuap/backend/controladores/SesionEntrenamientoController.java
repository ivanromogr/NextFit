package com.tuap.backend.controladores;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger; 
import org.slf4j.LoggerFactory; 
import org.springframework.http.ResponseEntity;
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
            return ResponseEntity.ok(guardada);
        } catch (Exception e) {
            log.error("Error al guardar sesión", e);
            return ResponseEntity.badRequest().body("Error al guardar sesión: " + e.getMessage());
        }
    }

    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<List<SesionEntrenamiento>> listarSesiones(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId));
    }

    @GetMapping("/evento/{eventoId}")
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

    @GetMapping("/ultima")
    public ResponseEntity<UltimaSesionResponse> obtenerUltimaSesion(
            @RequestParam(name = CLIENTE_ID_PARAM) UUID clienteId, 
            @RequestParam UUID rutinaId) {
        var sesionOpt = sesionDAO.findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(clienteId, rutinaId);
        
        if (sesionOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        
        SesionEntrenamiento sesion = sesionOpt.get();
        List<UltimaSesionResponse.SerieResponse> series = new ArrayList<>();
        sesion.getSeries().forEach(s -> 
            series.add(new UltimaSesionResponse.SerieResponse(
                s.getEjercicio().getId(), s.getEjercicio().getNombre(), s.getSetIndex(),
                s.getPeso(), s.getReps(), s.getRpe(), s.isHecho()
            ))
        );
        
        UltimaSesionResponse response = new UltimaSesionResponse(
            sesion.getId(), sesion.getNombre(), sesion.getFechaHora(),
            sesion.getDuracionSegundos(), sesion.getVolumenTotal(),
            sesion.getNotasGenerales(), series
        );
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{entrenadorId}/dashboard-resumen")
    public ResponseEntity<Object> getDashboardResumen(@PathVariable UUID entrenadorId) {
        try {
            List<SesionEntrenamiento> ultimas = sesionDAO.findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc(entrenadorId);
            
           
            Map<String, Long> stats = calcularMetricasInteligentes(entrenadorId);

            List<Map<String, Object>> feed = ultimas.stream().map(s -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("clienteNombre", s.getCliente().getNombre() + " " + s.getCliente().getApellido());
                map.put(CLIENTE_ID_PARAM, s.getCliente().getId());
                map.put("rutina", s.getNombre() != null ? s.getNombre() : "Entreno Libre");
                map.put("fecha", s.getFechaHora());
                map.put("volumen", s.getVolumenTotal());
                map.put("duracion", s.getDuracionSegundos());
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

    // 🧹 Método extraído para limpiar la complejidad cognitiva
    private Map<String, Long> calcularMetricasInteligentes(UUID entrenadorId) {
        Map<String, Long> stats = new HashMap<>();
        try {
            stats.put("hoy", sesionDAO.countEntrenosHoy(entrenadorId));
            stats.put("riesgo", sesionDAO.countClientesInactivos(entrenadorId, LocalDateTime.now().minusDays(7)));
            stats.put("records", 3L); // Simulación mantenida
        } catch (Exception e) {
            log.warn("Aviso: DAO no actualizado para métricas águila: {}", e.getMessage());
            stats.put("hoy", 0L);
            stats.put("riesgo", 0L);
            stats.put("records", 0L);
        }
        return stats;
    }
}