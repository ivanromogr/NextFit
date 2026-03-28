package com.tuap.backend.controladores;

import java.util.List;
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

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteDAO clienteDAO;

    public ClienteController(ClienteDAO clienteDAO) {
        this.clienteDAO = clienteDAO;
    }

    @GetMapping
    public List<Cliente> listar() {
        return clienteDAO.findAll();
    }

    @GetMapping("/{id}")
    public Cliente obtener(@PathVariable UUID id) {
        return clienteDAO.findById(id).orElse(null);
    }

    @GetMapping("/buscar")
    public ResponseEntity<Cliente> buscarPorEmail(@RequestParam String email) {
        Optional<Cliente> cliente = clienteDAO.findByEmail(email);
        
        if (cliente.isPresent()) {
            return ResponseEntity.ok(cliente.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/onboarding")
    public ResponseEntity<String> completarOnboarding(@RequestBody OnboardingRequest request) {
        
        // 1. Validar que venga el ID
        if (request.getIdCliente() == null) {
            return ResponseEntity.badRequest().body("Error: No se identificó al cliente (Falta ID).");
        }

        // 2. Buscar al cliente específico por su ID
        Cliente cliente = clienteDAO.findById(request.getIdCliente()).orElse(null);

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
    
    public ResponseEntity<String> actualizarPerfil(@PathVariable UUID id, @RequestBody com.tuap.backend.dto.UpdateClienteRequest req) {
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
        if (req.getContrasena() != null && !req.getContrasena().isEmpty()) cliente.setContrasena(req.getContrasena());

        clienteDAO.save(cliente);
        return ResponseEntity.ok("Perfil actualizado");
    }
}