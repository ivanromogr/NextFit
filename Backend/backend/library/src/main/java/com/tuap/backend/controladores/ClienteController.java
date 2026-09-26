package com.tuap.backend.controladores;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dto.OnboardingRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.tuap.backend.auth.OwnershipService;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteDAO clienteDAO;
    private final OwnershipService ownershipService;

    public ClienteController(ClienteDAO clienteDAO, OwnershipService ownershipService) {
        this.clienteDAO = clienteDAO;
        this.ownershipService = ownershipService;
    }

    @GetMapping
    public List<Cliente> listar(@AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        if (authenticatedUser != null && authenticatedUser.role() == Role.CLIENTE) {
            return clienteDAO.findById(authenticatedUser.userId()).map(List::of).orElseGet(List::of);
        }
        ownershipService.requireRole(authenticatedUser, Role.ENTRENADOR);
        return clienteDAO.findByEntrenadorId(authenticatedUser.userId());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> obtener(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        ownershipService.requireClientAccess(id, authenticatedUser);
        Optional<Cliente> clienteOpt = clienteDAO.findById(id);
        if (clienteOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Cliente cliente = clienteOpt.get();
        Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", cliente.getId());
        response.put("nombre", cliente.getNombre());
        response.put("apellido", cliente.getApellido());
        response.put("email", cliente.getEmail());
        response.put("rol", cliente.getRol());
        response.put("peso", cliente.getPeso());
        response.put("altura", cliente.getAltura());
        response.put("edad", cliente.getEdad());
        response.put("objetivo", cliente.getObjetivo());
        response.put("fotoPerfil", cliente.getFotoPerfil());
        response.put("genero", cliente.getGenero());

        if (cliente.getEntrenador() != null) {
            response.put("entrenador", Map.of(
                    "id", cliente.getEntrenador().getId(),
                    "nombre", cliente.getEntrenador().getNombre(),
                    "apellido", cliente.getEntrenador().getApellido(),
                    "fotoPerfil", cliente.getEntrenador().getFotoPerfil()
            ));
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/buscar")
    public ResponseEntity<Map<String, Object>> buscarPorEmail(@RequestParam String email, @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        ownershipService.requireRole(authenticatedUser, Role.ENTRENADOR);
        Optional<Cliente> cliente = clienteDAO.findByEmail(email);
        
        if (cliente.isPresent()) {
            Cliente encontrado = cliente.get();
            return ResponseEntity.ok(Map.of("id", encontrado.getId(), "nombre", encontrado.getNombre(), "apellido", encontrado.getApellido()));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/onboarding")
    public ResponseEntity<String> completarOnboarding(@RequestBody OnboardingRequest request,
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        
        // 1. Validar que venga el ID
        if (authenticatedUser == null || authenticatedUser.role() != Role.CLIENTE) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No autorizado para onboarding de cliente.");
        }
        if (request.getIdCliente() != null && !request.getIdCliente().equals(authenticatedUser.userId()))
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("El ID no coincide con la identidad autenticada.");

        // 2. Buscar al cliente específico por su ID
        Cliente cliente = clienteDAO.findById(authenticatedUser.userId()).orElse(null);

        if (cliente == null) {
            return ResponseEntity.badRequest().body("Cliente no encontrado con id: " + request.getIdCliente());
        }

        // 3. Actualizar datos
        cliente.setGenero(request.getGenero());
        cliente.setObjetivo(request.getObjetivo());
        
        if (request.getAlturaCm() != null) cliente.setAltura(request.getAlturaCm().intValue());
        if (request.getPesoKg() != null) cliente.setPeso(request.getPesoKg());

        // Calcular Edad
        if (request.getFechaNacimiento() != null && !request.getFechaNacimiento().isEmpty()) {
            try {
                java.time.LocalDate fechaNac = java.time.LocalDate.parse(request.getFechaNacimiento());
                int edad = java.time.Period.between(fechaNac, java.time.LocalDate.now()).getYears();
                cliente.setEdad(edad);
            } catch (Exception e) {
                // log error
            }
        }

        // 4. Guardar
        clienteDAO.save(cliente);

        return ResponseEntity.ok("Perfil completado exitosamente");
    }

    //  ACTUALIZAR PERFIL CLIENTE  ---
    @PutMapping("/{id}")
    
    public ResponseEntity<String> actualizarPerfil(@PathVariable UUID id, @RequestBody com.tuap.backend.dto.UpdateClienteRequest req, @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        ownershipService.requireSelf(id, authenticatedUser, Role.CLIENTE);
        Cliente cliente = clienteDAO.findById(id).orElse(null);
        if (cliente == null) return ResponseEntity.badRequest().body("Cliente no encontrado con id: " + id);

        // Actualizamos solo los campos presentes
        if (req.getNombre() != null) cliente.setNombre(req.getNombre());
        if (req.getApellido() != null) cliente.setApellido(req.getApellido());
        if (req.getEmail() != null) cliente.setEmail(req.getEmail());
        if (req.getFotoPerfil() != null) cliente.setFotoPerfil(req.getFotoPerfil());
        if (req.getPeso() != null) cliente.setPeso(req.getPeso());
        if (req.getAltura() != null) cliente.setAltura(req.getAltura());
        if (req.getObjetivo() != null) cliente.setObjetivo(req.getObjetivo());
        if (req.getGenero() != null) cliente.setGenero(req.getGenero());
        clienteDAO.save(cliente);
        return ResponseEntity.ok("Perfil actualizado");
    }

    /** Compatibility entry points used by pre-security unit tests; they are not request mappings. */
    @Deprecated public List<Cliente> listar() { return clienteDAO.findAll(); }
    @Deprecated public ResponseEntity<Cliente> buscarPorEmail(String email) {
        return clienteDAO.findByEmail(email).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
    @Deprecated public ResponseEntity<String> actualizarPerfil(UUID id, com.tuap.backend.dto.UpdateClienteRequest req) {
        return actualizarPerfil(id, req, new AuthenticatedUser(id, "test@local", Role.CLIENTE));
    }

    @PostMapping("/{id}/desvincular-entrenador")
    public ResponseEntity<Object> desvincularEntrenador(@PathVariable UUID id, @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {
        ownershipService.requireSelf(id, authenticatedUser, Role.CLIENTE);
        Cliente cliente = clienteDAO.findById(id).orElse(null);
        if (cliente == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Cliente no encontrado con id: " + id));
        }

        if (cliente.getEntrenador() == null) {
            return ResponseEntity.ok(Map.of("message", "No tienes ningún entrenador vinculado."));
        }

        cliente.setEntrenador(null);
        clienteDAO.save(cliente);
        return ResponseEntity.ok(Map.of("message", "Te has desvinculado del entrenador correctamente."));
    }
}
