package com.tuap.backend.controladores;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired private GestorSesion gestorSesion;
    @Autowired private SesionEntrenamientoDAO sesionDAO;
    @Autowired private ClienteDAO clienteDAO;

    // GUARDAR UNA SESIÓN COMPLETADA
    @PostMapping
    public ResponseEntity<?> guardarSesion(@RequestBody GuardarSesionRequest req) {
        try {
            SesionEntrenamiento guardada = gestorSesion.guardarSesion(req);
            return ResponseEntity.ok(guardada);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error al guardar sesión: " + e.getMessage());
        }
    }

    // LISTAR HISTORIAL DEL CLIENTE
    @GetMapping("/cliente/{clienteId}")
    public ResponseEntity<?> listarSesiones(@PathVariable UUID clienteId) {
        return ResponseEntity.ok(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId));
    }

    // DETALLE SESIÓN POR EVENTO (CALENDARIO)
    @GetMapping("/evento/{eventoId}")
    public ResponseEntity<?> getDetalleSesionPorEvento(@PathVariable UUID eventoId) {
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
            .collect(Collectors.groupingBy(serie -> serie.getEjercicio().getNombre()))
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
                }).collect(Collectors.toList());

                ejMap.put("series", seriesInfo);
                return ejMap;
            })
            .collect(Collectors.toList());

        respuesta.put("ejercicios", ejerciciosRealizados);
        return ResponseEntity.ok(respuesta);
    }

    // OBTENER ÚLTIMA SESIÓN
    @GetMapping("/ultima")
    public ResponseEntity<?> obtenerUltimaSesion(@RequestParam UUID clienteId, @RequestParam UUID rutinaId) {
        var sesionOpt = sesionDAO.findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(clienteId, rutinaId);
        
        if (sesionOpt.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        
        SesionEntrenamiento sesion = sesionOpt.get();
        List<UltimaSesionResponse.SerieResponse> series = new ArrayList<>();
        sesion.getSeries().forEach(s -> {
            series.add(new UltimaSesionResponse.SerieResponse(
                s.getEjercicio().getId(), s.getEjercicio().getNombre(), s.getSetIndex(),
                s.getPeso(), s.getReps(), s.getRpe(), s.isHecho()
            ));
        });
        
        UltimaSesionResponse response = new UltimaSesionResponse(
            sesion.getId(), sesion.getNombre(), sesion.getFechaHora(),
            sesion.getDuracionSegundos(), sesion.getVolumenTotal(),
            sesion.getNotasGenerales(), series
        );
        
        return ResponseEntity.ok(response);
    }

    
    @GetMapping("/{entrenadorId}/dashboard-resumen")
    public ResponseEntity<?> getDashboardResumen(@PathVariable UUID entrenadorId) {
        try {
            // 1. Feed de Actividad (Últimas sesiones)
            List<SesionEntrenamiento> ultimas = sesionDAO.findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc(entrenadorId);
            
            // 2. Métricas Inteligentes (Requiere métodos en DAO)
            long entrenosHoy = 0;
            long clientesRiesgo = 0;
            
            try {
                // Intenta usar las consultas optimizadas del DAO
                entrenosHoy = sesionDAO.countEntrenosHoy(entrenadorId);
                clientesRiesgo = sesionDAO.countClientesInactivos(entrenadorId, LocalDateTime.now().minusDays(7));
            } catch (Exception e) {
                // Fallback si el DAO no está actualizado: contar mes como antes
                System.out.println("Aviso: DAO no actualizado para métricas águila.");
            }

            // Simulación de Récords 
            long nuevosRecords = 3; 

            // 3. Mapeo del Feed
            List<Map<String, Object>> feed = ultimas.stream().map(s -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("clienteNombre", s.getCliente().getNombre() + " " + s.getCliente().getApellido());
                map.put("clienteId", s.getCliente().getId());
                map.put("rutina", s.getNombre() != null ? s.getNombre() : "Entreno Libre");
                map.put("fecha", s.getFechaHora());
                map.put("volumen", s.getVolumenTotal());
                map.put("duracion", s.getDuracionSegundos());
                return map;
            }).collect(Collectors.toList());

            // 4. Construcción de Respuesta
            Map<String, Object> response = new HashMap<>();
            
            // Objeto Stats Específico para las Tarjetas
            Map<String, Object> stats = new HashMap<>();
            stats.put("hoy", entrenosHoy);        
            stats.put("riesgo", clientesRiesgo);  
            stats.put("records", nuevosRecords); 
            
            response.put("stats", stats);
            response.put("feedActividad", feed);
            
            // Datos extra por compatibilidad
            long totalClientes = clienteDAO.countByEntrenador_Id(entrenadorId);
            response.put("totalClientes", totalClientes);

            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error dashboard: " + e.getMessage());
        }
    }
}