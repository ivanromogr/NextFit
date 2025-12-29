package com.tuap.backend.controladores;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

@RestController
@RequestMapping("/api/entrenador")
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
public class EntrenadorController {

    @Autowired
    private ClienteDAO clienteDAO;

    @Autowired
    private EntrenadorDAO entrenadorDAO;

    // 1. Obtener clientes de un entrenador
    @GetMapping("/{idEntrenador}/clientes")
    public ResponseEntity<List<Cliente>> obtenerClientes(@PathVariable UUID idEntrenador) {
        try {
            // Nota: Aquí estamos devolviendo todos para que veas datos.
            // Lo ideal es filtrar: clienteDAO.findByEntrenadorId(idEntrenador);
            List<Cliente> clientes = clienteDAO.findByEntrenadorId(idEntrenador);
            return ResponseEntity.ok(clientes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // 2. Fichar Cliente (Vincular por email)
    @PostMapping("/{idEntrenador}/fichar")
    public ResponseEntity<?> ficharCliente(@PathVariable UUID idEntrenador, @RequestBody Map<String, String> payload) {
        String emailCliente = payload.get("email");
        
        try {
            Entrenador entrenador = entrenadorDAO.findById(idEntrenador)
                .orElseThrow(() -> new RuntimeException("Entrenador no encontrado"));

            Cliente cliente = clienteDAO.findByEmail(emailCliente)
                .orElseThrow(() -> new RuntimeException("No existe usuario con ese email"));

            // Vinculamos
            cliente.setEntrenador(entrenador);
            clienteDAO.save(cliente);

            return ResponseEntity.ok().body("{\"message\": \"Cliente vinculado correctamente\"}");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    
}