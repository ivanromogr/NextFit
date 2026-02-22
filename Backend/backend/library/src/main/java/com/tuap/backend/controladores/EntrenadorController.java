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
import org.springframework.web.bind.annotation.*;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;
import com.tuap.backend.persistencia.ResenaDAO; // Asegúrate de tener este DAO creado

@RestController
@RequestMapping("/api/entrenador")
public class EntrenadorController {

    @Autowired private ClienteDAO clienteDAO;
    @Autowired private EntrenadorDAO entrenadorDAO;
    @Autowired private SesionEntrenamientoDAO sesionDAO; 
    @Autowired private ResenaDAO resenaDAO; // Inyectamos el DAO de reseñas

    // --- 1. OBTENER CLIENTES (Con lógica de Borde Verde) ---
    @GetMapping("/{idEntrenador}/clientes")
    public ResponseEntity<List<Map<String, Object>>> obtenerClientes(@PathVariable UUID idEntrenador) {
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
                } catch (Exception e) {}

                item.put("semanaCompletada", sesionesEstaSemana >= 3);
                item.put("sesionesHechas", sesionesEstaSemana);

                respuesta.add(item);
            }
            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
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

    // --- 3. DATOS PERFIL PÚBLICO (MODIFICADO PARA MEDIR VALORACIONES) ---
    @GetMapping("/{id}")
    public ResponseEntity<?> getPerfilPublico(@PathVariable UUID id) {
        try {
            Entrenador ent = entrenadorDAO.findById(id).orElse(null);
            if (ent == null) return ResponseEntity.notFound().build();

            // Calculamos la valoración media real desde la base de datos
            Double media = resenaDAO.calcularMediaPorEntrenador(id);
            // Obtenemos la lista de reseñas para mostrar en la landing
            List<Resena> listaResenas = resenaDAO.findByEntrenadorIdOrderByFechaDesc(id);

            Map<String, Object> respuesta = new HashMap<>();
            respuesta.put("entrenador", ent);
            // Si no hay media, devolvemos 0.0. Redondeamos a 1 decimal.
            respuesta.put("valoracionMedia", media != null ? Math.round(media * 10.0) / 10.0 : 0.0);
            respuesta.put("resenas", listaResenas);

            return ResponseEntity.ok(respuesta);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
        }
    }
    
    // --- 4. PUBLICAR RESEÑA (NUEVO ENDPOINT) ---
    @PostMapping("/{idEntrenador}/resena")
    public ResponseEntity<?> publicarResena(@PathVariable UUID idEntrenador, @RequestBody Map<String, Object> payload) {
        try {
            Entrenador entrenador = entrenadorDAO.findById(idEntrenador).orElseThrow();
            
            // En un sistema real, sacaríamos el clienteId del Token JWT (SecurityContext)
            // Por ahora, asumimos que el payload trae la info necesaria
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
    public ResponseEntity<List<Entrenador>> obtenerEntrenadoresPublicos() {
        List<Entrenador> publicos = entrenadorDAO.findByPerfilPublicoTrue();
        // Anonimizamos datos sensibles para el buscador
        publicos.forEach(e -> e.setContraseña(null));
        return ResponseEntity.ok(publicos);
    }
}