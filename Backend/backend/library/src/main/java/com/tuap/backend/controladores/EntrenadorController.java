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
import org.springframework.web.bind.annotation.PutMapping;
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

    // NUEVO: Obtener datos públicos del entrenador por ID
    @GetMapping("/{id}")
    public ResponseEntity<Entrenador> getEntrenador(@PathVariable UUID id) {
        try {
            Entrenador entrenador = entrenadorDAO.findById(id).orElse(null);
            if (entrenador == null) return ResponseEntity.notFound().build();
            return ResponseEntity.ok(entrenador);
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

    // --- NUEVO: ACTUALIZAR PERFIL ENTRENADOR (PUT /api/entrenador/{id}) ---
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarPerfil(@PathVariable UUID id, @RequestBody Map<String, Object> payload) {
        Entrenador entrenador = entrenadorDAO.findById(id).orElse(null);
        if (entrenador == null) return ResponseEntity.badRequest().body("Entrenador no encontrado con id: " + id);

        if (payload.containsKey("nombre")) entrenador.setNombre((String) payload.get("nombre"));
        if (payload.containsKey("apellido")) entrenador.setApellido((String) payload.get("apellido"));
        if (payload.containsKey("email")) entrenador.setEmail((String) payload.get("email"));
        if (payload.containsKey("especialidad")) entrenador.setEspecialidad((String) payload.get("especialidad"));

        if (payload.containsKey("edad")) {
            Object val = payload.get("edad");
            if (val == null) entrenador.setEdad(null);
            else if (val instanceof Number) entrenador.setEdad(((Number) val).intValue());
            else entrenador.setEdad(Integer.parseInt(val.toString()));
        }

        if (payload.containsKey("genero")) entrenador.setGenero((String) payload.get("genero"));

        if (payload.containsKey("aniosExperiencia")) {
            Object val = payload.get("aniosExperiencia");
            if (val == null) entrenador.setAniosExperiencia(null);
            else if (val instanceof Number) entrenador.setAniosExperiencia(((Number) val).intValue());
            else entrenador.setAniosExperiencia(Integer.parseInt(val.toString()));
        }

        if (payload.containsKey("formacion")) entrenador.setFormacion((String) payload.get("formacion"));
        if (payload.containsKey("descripcionPerfil")) entrenador.setDescripcionPerfil((String) payload.get("descripcionPerfil"));
        if (payload.containsKey("modalidadTrabajo")) entrenador.setModalidadTrabajo((String) payload.get("modalidadTrabajo"));
        if (payload.containsKey("fotoPerfil")) entrenador.setFotoPerfil((String) payload.get("fotoPerfil"));

        if (payload.containsKey("contraseña")) {
            Object pwd = payload.get("contraseña");
            if (pwd != null && !pwd.toString().isEmpty()) entrenador.setContraseña(pwd.toString());
        }

        entrenadorDAO.save(entrenador);
        return ResponseEntity.ok("Perfil entrenador actualizado");
    }
    
}