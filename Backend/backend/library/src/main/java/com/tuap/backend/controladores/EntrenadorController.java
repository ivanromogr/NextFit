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

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.ResenaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@RestController
@RequestMapping("/api/entrenador")
public class EntrenadorController {

    private static final String PARAM_TARIFA = "tarifaMensual";
    private static final String PARAM_EXPERIENCIA = "aniosExperiencia";
    private static final String KEY_MESSAGE = "message";

    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;
    private final SesionEntrenamientoDAO sesionDAO; 
    private final ResenaDAO resenaDAO;

    public EntrenadorController(ClienteDAO clienteDAO, EntrenadorDAO entrenadorDAO, 
                                SesionEntrenamientoDAO sesionDAO, ResenaDAO resenaDAO) {
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
        this.sesionDAO = sesionDAO;
        this.resenaDAO = resenaDAO;
    }

    // --- 1. OBTENER CLIENTES ---
    @GetMapping("/{idEntrenador}/clientes")
    public ResponseEntity<Object> obtenerClientes(@PathVariable UUID idEntrenador) { 
        try {
            List<Cliente> clientes = clienteDAO.findByEntrenadorId(idEntrenador);
            
            LocalDate hoy = LocalDate.now();
            LocalDateTime inicio = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
            LocalDateTime fin = LocalDateTime.now();

            List<Map<String, Object>> respuesta = new ArrayList<>();

            for (Cliente c : clientes) {
                Map<String, Object> item = new HashMap<>();
                item.put("cliente", serializarClienteResumen(c));
                long sesionesEstaSemana = obtenerConteoSesionesSeguro(c.getId(), inicio, fin);
                item.put("semanaCompletada", sesionesEstaSemana >= 3);
                item.put("sesionesHechas", sesionesEstaSemana);
                respuesta.add(item);
            }
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error interno al obtener los atletas: " + e.getMessage());
        }
    }
    
    private long obtenerConteoSesionesSeguro(UUID clienteId, LocalDateTime inicio, LocalDateTime fin) {
        try {
            return sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(clienteId, inicio, fin).size();
        } catch (Exception e) { 
           
            return 0;
        }
    }

    private Map<String, Object> serializarClienteResumen(Cliente cliente) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", cliente.getId());
        data.put("nombre", cliente.getNombre());
        data.put("apellido", cliente.getApellido());
        data.put("email", cliente.getEmail());
        data.put("objetivo", cliente.getObjetivo());
        data.put("fotoPerfil", cliente.getFotoPerfil());
        return data;
    }

    @GetMapping("/{id}/reviews")
    public ResponseEntity<Object> getReviewsEntrenador(@PathVariable UUID id) {
        try {
            List<Resena> listaResenas = resenaDAO.findByEntrenadorIdOrderByFechaDesc(id);
            return ResponseEntity.ok(listaResenas);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al obtener las reseñas: " + e.getMessage());
        }
    }

    // --- 2. DASHBOARD RESUMEN ---
    @GetMapping("/{entrenadorId}/dashboard-resumen")
    public ResponseEntity<Object> getDashboardResumen(@PathVariable UUID entrenadorId) {
        try {
            List<SesionEntrenamiento> ultimas = sesionDAO.findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc(entrenadorId);
            Map<String, Long> metricas = obtenerMetricasDashboard(entrenadorId);

            List<Map<String, Object>> feed = ultimas.stream().map(s -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", s.getId());
                map.put("clienteId", s.getCliente().getId());
                map.put("clienteNombre", s.getCliente().getNombre() + " " + s.getCliente().getApellido());
                map.put("foto", s.getCliente().getFotoPerfil());
                map.put("rutina", s.getNombre() != null ? s.getNombre() : "Libre");
                map.put("fecha", s.getFechaHora());
                map.put("volumen", s.getVolumenTotal());
                return map;
            }).toList();

            Map<String, Object> response = new HashMap<>();
            response.put("stats", metricas);
            response.put("feedActividad", feed);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    private Map<String, Long> obtenerMetricasDashboard(UUID entrenadorId) {
        Map<String, Long> stats = new HashMap<>();
        try {
            stats.put("hoy", sesionDAO.countEntrenosHoy(entrenadorId));
            stats.put("riesgo", sesionDAO.countClientesInactivos(entrenadorId, LocalDateTime.now().minusDays(7)));
            stats.put("totalClientes", clienteDAO.countByEntrenador_Id(entrenadorId));
        } catch (Exception e) {
            
            stats.put("hoy", 0L);
            stats.put("riesgo", 0L);
            stats.put("totalClientes", 0L);
        }
        return stats;
    }

    // --- 3. DATOS PERFIL PÚBLICO ---
    @GetMapping("/{id}")
    public ResponseEntity<Object> getPerfilPublico(@PathVariable UUID id) {
        try {
            Entrenador ent = entrenadorDAO.findById(id).orElse(null);
            if (ent == null) return ResponseEntity.notFound().build();

            Double media = resenaDAO.calcularMediaPorEntrenador(id);
            List<Resena> listaResenas = resenaDAO.findByEntrenadorIdOrderByFechaDesc(id);
            long totalClientes = clienteDAO.countByEntrenador_Id(id); 

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("entrenador", ent);
            respuesta.put("valoracionMedia", media != null ? Math.round(media * 10.0) / 10.0 : 0.0);
            respuesta.put("resenas", listaResenas);
            respuesta.put("numeroClientes", totalClientes); 

            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
    
    @PostMapping("/{idEntrenador}/resena")
    public ResponseEntity<String> publicarResena(@PathVariable UUID idEntrenador, @RequestBody Map<String, Object> payload) {
        try {
            Entrenador entrenador = entrenadorDAO.findById(idEntrenador).orElseThrow();
            Resena resena = new Resena();
            resena.setEntrenador(entrenador);
            resena.setEstrellas(Integer.parseInt(payload.get("estrellas").toString()));
            resena.setComentario((String) payload.get("comentario"));
            resena.setFecha(LocalDateTime.now());
            resenaDAO.save(resena);
            return ResponseEntity.ok("Reseña publicada correctamente");
        } catch (Exception e) {
         
            return ResponseEntity.badRequest().body("Error al publicar reseña");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> actualizarPerfil(@PathVariable UUID id, @RequestBody Map<String, Object> payload) {
        try {
            Entrenador entrenador = entrenadorDAO.findById(id).orElse(null);
            if (entrenador == null) return ResponseEntity.badRequest().body("Entrenador no encontrado");
            actualizarCamposPerfil(entrenador, payload);
            entrenadorDAO.save(entrenador);
            return ResponseEntity.ok("Perfil actualizado con éxito");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error interno: " + e.getMessage());
        }
    }

    private void actualizarCamposPerfil(Entrenador e, Map<String, Object> p) {
        if (p.containsKey("nombre")) e.setNombre((String) p.get("nombre"));
        if (p.containsKey("apellido")) e.setApellido((String) p.get("apellido"));
        if (p.containsKey("fotoPerfil")) e.setFotoPerfil((String) p.get("fotoPerfil"));
        if (p.containsKey("especialidad")) e.setEspecialidad((String) p.get("especialidad"));
        if (p.containsKey("descripcionPerfil")) e.setDescripcionPerfil((String) p.get("descripcionPerfil"));
        if (p.containsKey("perfilPublico")) e.setPerfilPublico(Boolean.parseBoolean(p.get("perfilPublico").toString()));
        if (p.containsKey(PARAM_TARIFA) && p.get(PARAM_TARIFA) != null) e.setTarifaMensual(Double.parseDouble(p.get(PARAM_TARIFA).toString()));
        if (p.containsKey(PARAM_EXPERIENCIA) && p.get(PARAM_EXPERIENCIA) != null) e.setAniosExperiencia(Integer.parseInt(p.get(PARAM_EXPERIENCIA).toString()));
    }

    @GetMapping("/publicos")
    public ResponseEntity<List<Entrenador>> obtenerEntrenadoresPublicos(
            @RequestParam(required = false) String modalidad,
            @RequestParam(required = false) String especialidad,
            @RequestParam(required = false) Double tarifaMax,
            @RequestParam(required = false) Integer expMin) {
        
        List<Entrenador> filtrados = entrenadorDAO.findByPerfilPublicoTrue().stream()
            .filter(e -> modalidad == null || modalidad.trim().isEmpty() || (e.getModalidadTrabajo() != null && e.getModalidadTrabajo().equalsIgnoreCase(modalidad)))
            .filter(e -> especialidad == null || especialidad.trim().isEmpty() || (e.getEspecialidad() != null && e.getEspecialidad().toLowerCase().contains(especialidad.toLowerCase())))
            .filter(e -> tarifaMax == null || (e.getTarifaMensual() != null && e.getTarifaMensual() <= tarifaMax))
            .filter(e -> expMin == null || (e.getAniosExperiencia() != null && e.getAniosExperiencia() >= expMin))
            .toList();

        filtrados.forEach(e -> e.setContrasena(null));
        return ResponseEntity.ok(filtrados);
    }
   
    @PostMapping("/{id}/fichar")
    @Transactional 
    public ResponseEntity<Object> ficharCliente(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of(KEY_MESSAGE, "El email es obligatorio."));
            }

            Entrenador entrenador = entrenadorDAO.findById(id).orElseThrow(() -> new RuntimeException("Entrenador no encontrado."));
            Cliente cliente = clienteDAO.findByEmail(email.trim()).orElseThrow(() -> new RuntimeException("No se encontró ningún atleta con el correo: " + email));

            if (cliente.getEntrenador() != null && !cliente.getEntrenador().getId().equals(entrenador.getId())) {
                return ResponseEntity.status(409).body(Map.of(
                    KEY_MESSAGE, "Este atleta ya está entrenando con otro profesional (" + cliente.getEntrenador().getNombre() + ")."
                ));
            }

            cliente.setEntrenador(entrenador);
            clienteDAO.save(cliente);
            return ResponseEntity.ok().body(Map.of(KEY_MESSAGE, "¡" + cliente.getNombre() + " se ha unido a tu equipo!"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of(KEY_MESSAGE, e.getMessage()));
        } catch (Exception e) {
            
            return ResponseEntity.status(500).body(Map.of(KEY_MESSAGE, "Error interno en el servidor."));
        }
    }

    @PostMapping("/{idEntrenador}/desvincular/{idCliente}")
    @Transactional
    public ResponseEntity<Object> desvincularCliente(@PathVariable UUID idEntrenador, @PathVariable UUID idCliente) {
        try {
            Cliente cliente = clienteDAO.findById(idCliente).orElseThrow(() -> new RuntimeException("Atleta no encontrado."));
            
            if (cliente.getEntrenador() == null || !cliente.getEntrenador().getId().equals(idEntrenador)) {
                return ResponseEntity.status(403).body(Map.of(KEY_MESSAGE, "No puedes desvincular a un atleta que no es tuyo."));
            }
            
            cliente.setEntrenador(null);
            clienteDAO.save(cliente);
            return ResponseEntity.ok().body(Map.of(KEY_MESSAGE, "Atleta desvinculado correctamente. Ya no forma parte de tu equipo."));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of(KEY_MESSAGE, e.getMessage()));
        } catch (Exception e) {
            
            return ResponseEntity.status(500).body(Map.of(KEY_MESSAGE, "Error interno en el servidor."));
        }
    }
}
