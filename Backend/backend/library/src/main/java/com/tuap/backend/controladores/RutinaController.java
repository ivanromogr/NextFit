package com.tuap.backend.controladores;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.DetalleRutina;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.OwnershipService;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.gestores.GestorRutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@RestController
@RequestMapping("/api/rutinas")
public class RutinaController {

    private final GestorRutina gestorRutina;
    private final RutinaDAO rutinaDAO;
    private final ClienteDAO clienteDAO;
    private final OwnershipService ownershipService;

    public RutinaController(GestorRutina gestorRutina, RutinaDAO rutinaDAO, ClienteDAO clienteDAO, OwnershipService ownershipService) {
        this.gestorRutina = gestorRutina;
        this.rutinaDAO = rutinaDAO;
        this.clienteDAO = clienteDAO;
        this.ownershipService = ownershipService;
    }

    @PostMapping("/manual")
    public ResponseEntity<Object> crearRutinaManual(@RequestBody RutinaRequest request, @AuthenticationPrincipal AuthenticatedUser principal) {
        autorizarCreacionManual(request, principal);
        try {
            Rutina nueva = gestorRutina.crearRutinaManual(request);
            return ResponseEntity.ok(nueva);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/auto")
    public ResponseEntity<Object> generarRutinaAutomatica(@RequestBody GenerarRutinaRequest request, @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireSelf(request.getIdCliente(), principal, Role.CLIENTE);
        try {
            List<Rutina> nueva = gestorRutina.generarRutinaAutomatica(request);
            return ResponseEntity.ok(nueva);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error generando plan: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizarRutina(@PathVariable UUID id, @RequestBody java.util.Map<String, Object> rutinaDatosDTO, @AuthenticationPrincipal AuthenticatedUser principal) {
        try {
            Rutina existente = rutinaDAO.findById(id).orElseThrow();
            ownershipService.requireRoutineAccess(existente, principal);
            RutinaRequest request = normalizarRutinaRequest(rutinaDatosDTO);
            validarPropietariosInmutables(request, existente, principal);
            Rutina actualizada = gestorRutina.actualizarRutina(id, request);
            return ResponseEntity.ok(mapRutinaResumen(actualizada));
        } catch (org.springframework.security.access.AccessDeniedException e) {
            throw e;
        } catch (RuntimeException e) {
            
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al actualizar: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> eliminarRutina(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireRoutineAccess(rutinaDAO.findById(id).orElseThrow(), principal);
        try {
            gestorRutina.eliminarRutina(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error al eliminar: " + e.getMessage());
        }
    }

    @GetMapping("/cliente/{idCliente}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> obtenerRutinas(@PathVariable UUID idCliente, @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireClientAccess(idCliente, principal);
        List<Rutina> rutinas = gestorRutina.obtenerRutinasDeCliente(idCliente);
        return ResponseEntity.ok(rutinas.stream().map(this::mapRutinaResumen).toList());
    }

    @GetMapping("/cliente/{idCliente}/entrenador")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> obtenerRutinasEntrenador(
            @PathVariable UUID idCliente,
            @RequestParam(required = false) String entrenadorId,
            @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireClientAccess(idCliente, principal);
        if (entrenadorId != null && (principal.role() != Role.ENTRENADOR || !principal.userId().toString().equals(entrenadorId))) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
        
        try {
            List<Rutina> rutinas = gestorRutina.obtenerRutinasDeEntrenadorParaCliente(idCliente);

            if (entrenadorId != null) {
                rutinas = rutinas.stream()
                        .filter(r -> r.getEntrenadorId() != null && r.getEntrenadorId().toString().equals(entrenadorId))
                        .toList();
            }

            return ResponseEntity.ok(rutinas.stream().map(this::mapRutinaResumen).toList());
        } catch (Exception e) {
    
            return ResponseEntity.internalServerError().build();
        }
    }

    @SuppressWarnings("unchecked")
    private RutinaRequest normalizarRutinaRequest(Map<String, Object> data) {
        RutinaRequest request = new RutinaRequest();
        request.setNombre((String) data.get("nombre"));
        request.setDescripcion((String) data.get("descripcion"));
        request.setObjetivo((String) data.get("objetivo"));
        request.setNivel((String) data.get("nivel"));
        request.setCreador((String) data.get("creador"));
        request.setEsPlantilla((Boolean) data.get("esPlantilla"));

        Object entrenadorId = data.get("entrenadorId");
        if (entrenadorId != null && !entrenadorId.toString().isBlank()) {
            request.setEntrenadorId(UUID.fromString(entrenadorId.toString()));
        }

        Object idCliente = data.get("idCliente");
        if (idCliente != null && !idCliente.toString().isBlank()) {
            request.setIdCliente(UUID.fromString(idCliente.toString()));
        }

        Object ejerciciosRaw = data.get("ejercicios");
        if (ejerciciosRaw instanceof List<?> ejercicios) {
            List<RutinaRequest.EjercicioDetalleDTO> detalles = new ArrayList<>();
            for (Object item : ejercicios) {
                if (!(item instanceof Map<?, ?> map)) continue;
                RutinaRequest.EjercicioDetalleDTO detalle = new RutinaRequest.EjercicioDetalleDTO();

                Object idEjercicio = map.get("idEjercicio");
                if (idEjercicio == null && map.get("ejercicio") instanceof Map<?, ?> ejercicioMap) {
                    idEjercicio = ejercicioMap.get("id");
                }
                if (idEjercicio == null || idEjercicio.toString().isBlank()) continue;

                detalle.setIdEjercicio(UUID.fromString(idEjercicio.toString()));
                detalle.setSeries(toInt(map.get("series"), 1));
                detalle.setRepeticiones(toInt(map.get("repeticiones"), 0));
                detalle.setPeso(toFloat(map.get("peso"), 0.0f));
                detalle.setRpe(toInt(map.get("rpe"), 0));
                detalle.setNotas((String) map.get("notas"));
                detalle.setDias(toInt(map.get("dias"), 1));
                detalles.add(detalle);
            }
            request.setEjercicios(detalles);
        }

        return request;
    }

    private int toInt(Object value, int fallback) {
        if (value == null) return fallback;
        if (value instanceof Number number) return number.intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    private Float toFloat(Object value, Float fallback) {
        if (value == null) return fallback;
        if (value instanceof Number number) return number.floatValue();
        try {
            return Float.parseFloat(value.toString());
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    // --- 1. OBTENER PLANTILLAS DEL ENTRENADOR ---
    @GetMapping("/plantillas/{entrenadorId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> obtenerPlantillas(@PathVariable UUID entrenadorId, @AuthenticationPrincipal AuthenticatedUser principal) {
        ownershipService.requireSelf(entrenadorId, principal, Role.ENTRENADOR);
        try {
            List<Rutina> plantillas = rutinaDAO.findPlantillasDisponiblesParaEntrenador(entrenadorId);
            return ResponseEntity.ok(plantillas.stream().map(this::mapRutinaResumen).toList());
        } catch (org.springframework.security.access.AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
           
            return ResponseEntity.internalServerError().build();
        }
    }

    private Map<String, Object> mapRutinaResumen(Rutina rutina) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", rutina.getId());
        map.put("nombre", rutina.getNombre());
        map.put("objetivo", rutina.getObjetivo());
        map.put("descripcion", rutina.getDescripcion());
        map.put("nivel", rutina.getNivel());
        map.put("creador", rutina.getCreador());
        map.put("esPlantilla", rutina.isEsPlantilla());
        map.put("entrenadorId", rutina.getEntrenadorId());

        if (rutina.getCliente() != null) {
            Map<String, Object> cliente = new HashMap<>();
            cliente.put("id", rutina.getCliente().getId());
            cliente.put("nombre", rutina.getCliente().getNombre());
            cliente.put("apellido", rutina.getCliente().getApellido());
            map.put("cliente", cliente);
        }

        List<Map<String, Object>> detalles = rutina.getDetalles() == null
                ? List.of()
                : rutina.getDetalles().stream().map(this::mapDetalleRutina).toList();
        map.put("detalles", detalles);

        return map;
    }

    private Map<String, Object> mapDetalleRutina(DetalleRutina detalle) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", detalle.getId());
        map.put("series", detalle.getSeries());
        map.put("repeticiones", detalle.getRepeticiones());
        map.put("notas", detalle.getNotas());
        map.put("peso", detalle.getPeso());
        map.put("rpe", detalle.getRpe());
        map.put("dias", detalle.getDias());

        if (detalle.getEjercicio() != null) {
            Map<String, Object> ejercicio = new HashMap<>();
            ejercicio.put("id", detalle.getEjercicio().getId());
            ejercicio.put("apiId", detalle.getEjercicio().getApiId());
            ejercicio.put("nombre", detalle.getEjercicio().getNombre());
            ejercicio.put("nombreTraducido", detalle.getEjercicio().getNombreTraducido());
            ejercicio.put("grupoMuscular", detalle.getEjercicio().getGrupoMuscular());
            ejercicio.put("equipamiento", detalle.getEjercicio().getEquipamiento());
            ejercicio.put("parteCuerpo", detalle.getEjercicio().getParteCuerpo());
            ejercicio.put("imagenUrl", detalle.getEjercicio().getImagenUrl());
            ejercicio.put("imagenPaso1", detalle.getEjercicio().getImagenPaso1());
            ejercicio.put("imagenPaso2", detalle.getEjercicio().getImagenPaso2());
            ejercicio.put("imagenPaso3", detalle.getEjercicio().getImagenPaso3());
            ejercicio.put("videoUrl", detalle.getEjercicio().getVideoUrl());
            ejercicio.put("dificultad", detalle.getEjercicio().getDificultad());
            ejercicio.put("instrucciones", detalle.getEjercicio().getInstrucciones());
            map.put("ejercicio", ejercicio);
        }

        return map;
    }

    // --- 2. CLONAR PLANTILLA A UN CLIENTE ---
    @PostMapping("/clonar/{plantillaId}/cliente/{clienteId}")
    public ResponseEntity<Object> clonarPlantilla(@PathVariable UUID plantillaId, @PathVariable UUID clienteId, @AuthenticationPrincipal AuthenticatedUser principal) {
        try {
            Rutina plantilla = rutinaDAO.findById(plantillaId)
                .orElseThrow(() -> new RuntimeException("Plantilla no encontrada"));
            ownershipService.requireRoutineAccess(plantilla, principal);
            if (!plantilla.isEsPlantilla()) throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
            ownershipService.requireTrainerAssignedClient(clienteId, principal);
            
            Cliente cliente = clienteDAO.findById(clienteId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

            Rutina clon = new Rutina();
            clon.setNombre(plantilla.getNombre());
            clon.setObjetivo(plantilla.getObjetivo());
            clon.setDescripcion(plantilla.getDescripcion());
            clon.setNivel(plantilla.getNivel());
            clon.setCreador("ENTRENADOR"); 
            clon.setEsPlantilla(false); 
            clon.setCliente(cliente);  
            clon.setEntrenadorId(plantilla.getEntrenadorId()); 

            List<DetalleRutina> detallesClonados = new ArrayList<>();
            if (plantilla.getDetalles() != null) {
                for (DetalleRutina original : plantilla.getDetalles()) {
                    DetalleRutina nuevoDetalle = new DetalleRutina();
                    nuevoDetalle.setRutina(clon); 
                    nuevoDetalle.setEjercicio(original.getEjercicio());
                    nuevoDetalle.setSeries(original.getSeries());
                    nuevoDetalle.setRepeticiones(original.getRepeticiones());
                    nuevoDetalle.setNotas(original.getNotas());
                    nuevoDetalle.setPeso(original.getPeso());
                    nuevoDetalle.setRpe(original.getRpe());
                    nuevoDetalle.setDias(original.getDias());
                    detallesClonados.add(nuevoDetalle);
                }
            }
            clon.setDetalles(detallesClonados);

            Rutina rutinaGuardada = rutinaDAO.save(clon);
            return ResponseEntity.ok(rutinaGuardada);

        } catch (org.springframework.security.access.AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error al clonar plantilla: " + e.getMessage());
        }
    }

    private void autorizarCreacionManual(RutinaRequest request, AuthenticatedUser principal) {
        if (principal == null) throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        if (principal.role() == Role.CLIENTE) {
            ownershipService.requireSelf(request.getIdCliente(), principal, Role.CLIENTE);
            if (request.getEntrenadorId() != null || (request.getCreador() != null && !"CLIENTE".equalsIgnoreCase(request.getCreador()))) {
                throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
            }
            request.setIdCliente(principal.userId());
            request.setCreador("CLIENTE");
            return;
        }
        if (principal.role() == Role.ENTRENADOR) {
            if (request.getEntrenadorId() != null && !principal.userId().equals(request.getEntrenadorId())) {
                throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
            }
            if (Boolean.TRUE.equals(request.getEsPlantilla())) {
                request.setIdCliente(null);
            } else {
                ownershipService.requireTrainerAssignedClient(request.getIdCliente(), principal);
            }
            request.setEntrenadorId(principal.userId());
            request.setCreador("ENTRENADOR");
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
    }

    private void validarPropietariosInmutables(RutinaRequest request, Rutina existente, AuthenticatedUser principal) {
        if (request.getIdCliente() != null && (existente.getCliente() == null || !request.getIdCliente().equals(existente.getCliente().getId()))) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
        if (request.getEntrenadorId() != null && !request.getEntrenadorId().equals(existente.getEntrenadorId())) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
        if (request.getCreador() != null && !request.getCreador().equalsIgnoreCase(existente.getCreador())) {
            throw new org.springframework.security.access.AccessDeniedException("No tienes permisos para realizar esta acción");
        }
    }

    @Deprecated public ResponseEntity<Object> crearRutinaManual(RutinaRequest request) {
        UUID id = request.getIdCliente() == null ? UUID.randomUUID() : request.getIdCliente();
        return crearRutinaManual(request, new AuthenticatedUser(id, "test@local", Role.CLIENTE));
    }
    @Deprecated public ResponseEntity<Object> generarRutinaAutomatica(GenerarRutinaRequest request) {
        UUID id = request.getIdCliente() == null ? UUID.randomUUID() : request.getIdCliente();
        return generarRutinaAutomatica(request, new AuthenticatedUser(id, "test@local", Role.CLIENTE));
    }
    @Deprecated public ResponseEntity<List<Map<String, Object>>> obtenerRutinas(UUID clienteId) { return obtenerRutinas(clienteId, new AuthenticatedUser(clienteId, "test@local", Role.CLIENTE)); }
    @Deprecated public ResponseEntity<List<Map<String, Object>>> obtenerRutinasEntrenador(UUID clienteId, String entrenadorId) {
        UUID id = entrenadorId == null ? UUID.randomUUID() : UUID.fromString(entrenadorId);
        return obtenerRutinasEntrenador(clienteId, entrenadorId, new AuthenticatedUser(id, "test@local", Role.ENTRENADOR));
    }
    @Deprecated public ResponseEntity<Object> clonarPlantilla(UUID plantillaId, UUID clienteId) {
        return clonarPlantilla(plantillaId, clienteId, new AuthenticatedUser(UUID.randomUUID(), "test@local", Role.ENTRENADOR));
    }
}
