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
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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

    @Autowired private ClienteDAO clienteDAO;
    @Autowired private EntrenadorDAO entrenadorDAO;
    @Autowired private SesionEntrenamientoDAO sesionDAO; 
    @Autowired private ResenaDAO resenaDAO;

    // --- 1. OBTENER CLIENTES (Con lógica de Borde Verde) ---
    @GetMapping("/{idEntrenador}/clientes")
    public ResponseEntity<?> obtenerClientes(@PathVariable UUID idEntrenador) { 
        try {
            List<Cliente> clientes = clienteDAO.findByEntrenadorId(idEntrenador);
            
            LocalDate hoy = LocalDate.now();
            LocalDate inicioSemana = hoy.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDateTime inicio = inicioSemana.atStartOfDay();
            LocalDateTime fin = LocalDateTime.now();

            List<Map<String, Object>> respuesta = new ArrayList<>();

            for (Cliente c : clientes) {
                Map<String, Object> item = new HashMap<>();
                item.put("cliente", c);

                long sesionesEstaSemana = 0;
                try {
                    sesionesEstaSemana = sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(
                        c.getId(), inicio, fin
                    ).size();
                } catch (Exception e) {
                    // Ignoramos si un cliente no tiene sesiones aún
                }

                item.put("semanaCompletada", sesionesEstaSemana >= 3);
                item.put("sesionesHechas", sesionesEstaSemana);

                respuesta.add(item);
            }
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
           
            return ResponseEntity.internalServerError().body("Error interno al obtener los atletas: " + e.getMessage());
        }
    }
    @GetMapping("/{id}/reviews")
    public ResponseEntity<?> getReviewsEntrenador(@PathVariable UUID id) {
        try {
            List<Resena> listaResenas = resenaDAO.findByEntrenadorIdOrderByFechaDesc(id);
            return ResponseEntity.ok(listaResenas);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al obtener las reseñas: " + e.getMessage());
        }
    }

    // --- 2. DASHBOARD RESUMEN ---
    @GetMapping("/{entrenadorId}/dashboard-resumen")
    public ResponseEntity<?> getDashboardResumen(@PathVariable UUID entrenadorId) {
        try {
            List<SesionEntrenamiento> ultimas = sesionDAO.findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc(entrenadorId);
            
            long entrenosHoy = 0;
            long clientesRiesgo = 0;
            long totalClientes = 0;
            
            try {
                entrenosHoy = sesionDAO.countEntrenosHoy(entrenadorId);
                clientesRiesgo = sesionDAO.countClientesInactivos(entrenadorId, LocalDateTime.now().minusDays(7));
                totalClientes = clienteDAO.countByEntrenador_Id(entrenadorId);
            } catch (Exception e) {
                System.out.println("Aviso métricas: " + e.getMessage());
            }

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
            }).collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            Map<String, Object> stats = new HashMap<>();
            stats.put("hoy", entrenosHoy);
            stats.put("riesgo", clientesRiesgo);
            stats.put("totalClientes", totalClientes);
            
            response.put("stats", stats);
            response.put("feedActividad", feed);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }

    // --- 3. DATOS PERFIL PÚBLICO  ---
    @GetMapping("/{id}")
    public ResponseEntity<?> getPerfilPublico(@PathVariable UUID id) {
        try {
            Entrenador ent = entrenadorDAO.findById(id).orElse(null);
            if (ent == null) return ResponseEntity.notFound().build();

            Double media = resenaDAO.calcularMediaPorEntrenador(id);
            List<Resena> listaResenas = resenaDAO.findByEntrenadorIdOrderByFechaDesc(id);
            
            //Contamos los clientes reales de la base de datos
            long totalClientes = clienteDAO.countByEntrenador_Id(id); 

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("entrenador", ent);
            respuesta.put("valoracionMedia", media != null ? Math.round(media * 10.0) / 10.0 : 0.0);
            respuesta.put("resenas", listaResenas);
            
            // ✅ NUEVO: Lo enviamos en la respuesta
            respuesta.put("numeroClientes", totalClientes); 

            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
    
    // --- 4. PUBLICAR RESEÑA ---
    @PostMapping("/{idEntrenador}/resena")
    public ResponseEntity<?> publicarResena(@PathVariable UUID idEntrenador, @RequestBody Map<String, Object> payload) {
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

    // --- 5. ACTUALIZAR PERFIL ---
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarPerfil(@PathVariable UUID id, @RequestBody Map<String, Object> payload) {
        try {
            Entrenador entrenador = entrenadorDAO.findById(id).orElse(null);
            if (entrenador == null) return ResponseEntity.badRequest().body("Entrenador no encontrado");

            if (payload.containsKey("nombre")) entrenador.setNombre((String) payload.get("nombre"));
            if (payload.containsKey("apellido")) entrenador.setApellido((String) payload.get("apellido"));
            if (payload.containsKey("fotoPerfil")) entrenador.setFotoPerfil((String) payload.get("fotoPerfil"));
            if (payload.containsKey("especialidad")) entrenador.setEspecialidad((String) payload.get("especialidad"));
            if (payload.containsKey("descripcionPerfil")) entrenador.setDescripcionPerfil((String) payload.get("descripcionPerfil"));

            if (payload.containsKey("perfilPublico")) {
                entrenador.setPerfilPublico(Boolean.parseBoolean(payload.get("perfilPublico").toString()));
            }
            
            if (payload.containsKey("tarifaMensual") && payload.get("tarifaMensual") != null) {
                entrenador.setTarifaMensual(Double.parseDouble(payload.get("tarifaMensual").toString()));
            }

            if (payload.containsKey("aniosExperiencia") && payload.get("aniosExperiencia") != null) {
                entrenador.setAniosExperiencia(Integer.parseInt(payload.get("aniosExperiencia").toString()));
            }

            entrenadorDAO.save(entrenador);
            return ResponseEntity.ok("Perfil actualizado con éxito");
            
        } catch (Exception e) {
            e.printStackTrace(); 
            return ResponseEntity.internalServerError().body("Error interno: " + e.getMessage());
        }
    }

    // --- 6. BUSCADOR PÚBLICO ---
  
    @GetMapping("/publicos")
    public ResponseEntity<List<Entrenador>> obtenerEntrenadoresPublicos(
            @RequestParam(required = false) String modalidad,
            @RequestParam(required = false) String especialidad,
            @RequestParam(required = false) Double tarifaMax,
            @RequestParam(required = false) Integer expMin) {
        
        // 1. Obtenemos todos los entrenadores públicos de la base de datos
        List<Entrenador> publicos = entrenadorDAO.findByPerfilPublicoTrue();

        // 2. Aplicamos los filtros dinámicamente usando Streams
        List<Entrenador> filtrados = publicos.stream()
            // Filtro por Modalidad (ONLINE, PRESENCIAL, MIXTO) - Ignora mayúsculas/minúsculas
            .filter(e -> modalidad == null || modalidad.trim().isEmpty() || 
                        (e.getModalidadTrabajo() != null && e.getModalidadTrabajo().equalsIgnoreCase(modalidad)))
            
            // Filtro por Especialidad (Búsqueda parcial: ej. si buscas "Fuerza" encuentra "Entrenador de Fuerza")
            .filter(e -> especialidad == null || especialidad.trim().isEmpty() || 
                        (e.getEspecialidad() != null && e.getEspecialidad().toLowerCase().contains(especialidad.toLowerCase())))
            
            // Filtro por Tarifa Máxima (Menor o igual al precio indicado)
            .filter(e -> tarifaMax == null || 
                        (e.getTarifaMensual() != null && e.getTarifaMensual() <= tarifaMax))
            
            // Filtro por Experiencia Mínima (Mayor o igual a los años indicados)
            .filter(e -> expMin == null || 
                        (e.getAniosExperiencia() != null && e.getAniosExperiencia() >= expMin))
            
            .collect(Collectors.toList());

        // 3. Por seguridad, ocultamos las contraseñas antes de enviar al frontend
        filtrados.forEach(e -> e.setContraseña(null));
        
        return ResponseEntity.ok(filtrados);
    }
   
    // --- 7. VINCULAR CLIENTE POR EMAIL ---
    @PostMapping("/{id}/fichar")
    @Transactional 
    public ResponseEntity<?> ficharCliente(
            @PathVariable UUID id, 
            @RequestBody Map<String, String> payload) {
        
        try {
            String emailCliente = payload.get("email");
            
            if (emailCliente == null || emailCliente.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "El email es obligatorio."));
            }

            Entrenador entrenador = entrenadorDAO.findById(id)
                .orElseThrow(() -> new RuntimeException("Entrenador no encontrado."));

            Cliente cliente = clienteDAO.findByEmail(emailCliente.trim())
                .orElseThrow(() -> new RuntimeException("No se encontró ningún atleta con el correo: " + emailCliente));

            // 🛡️ REGLA DE EXCLUSIVIDAD: Comprobamos si ya tiene otro entrenador
            if (cliente.getEntrenador() != null && !cliente.getEntrenador().getId().equals(entrenador.getId())) {
                // 409 Conflict: El recurso ya está asignado a otro
                return ResponseEntity.status(409).body(Map.of(
                    "message", "Este atleta ya está entrenando con otro profesional (" + cliente.getEntrenador().getNombre() + ")."
                ));
            }

            // Si está libre (o si es el mismo entrenador que lo vuelve a añadir por error), lo vinculamos
            cliente.setEntrenador(entrenador);
            clienteDAO.save(cliente);

            return ResponseEntity.ok().body(Map.of("message", "¡" + cliente.getNombre() + " se ha unido a tu equipo!"));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error interno en el servidor."));
        }
    }

    // --- 8. DESVINCULAR CLIENTE ---
    @PostMapping("/{idEntrenador}/desvincular/{idCliente}")
    @Transactional
    public ResponseEntity<?> desvincularCliente(
            @PathVariable UUID idEntrenador,
            @PathVariable UUID idCliente) {
        
        try {
            // 1. Buscamos al cliente
            Cliente cliente = clienteDAO.findById(idCliente)
                .orElseThrow(() -> new RuntimeException("Atleta no encontrado."));

            // 2. 🛡️ SEGURIDAD: Comprobamos que el atleta realmente pertenece a este entrenador
            if (cliente.getEntrenador() == null || !cliente.getEntrenador().getId().equals(idEntrenador)) {
                return ResponseEntity.status(403).body(Map.of("message", "No puedes desvincular a un atleta que no es tuyo."));
            }

            // 3. Rompemos el vínculo (lo dejamos libre)
            cliente.setEntrenador(null);
            
            // 4. Guardamos el cambio
            clienteDAO.save(cliente);

            return ResponseEntity.ok().body(Map.of("message", "Atleta desvinculado correctamente. Ya no forma parte de tu equipo."));
            
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error interno en el servidor."));
        }
    }
}