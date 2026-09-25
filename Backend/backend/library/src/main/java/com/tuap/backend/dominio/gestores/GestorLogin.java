package com.tuap.backend.dominio.gestores;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Usuario;
import com.tuap.backend.dto.EntrenadorOnboardingRequest;
import com.tuap.backend.dto.OnboardingRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

@RestController
public class GestorLogin {

    private static final String RELLENA_CAMPOS = "Rellena todos los campos";
    private static final String USUARIO_EXISTE_STR = "El nombre de usuario ya existe";
    private static final String ROLE_CLIENTE = "ROLE_CLIENTE";
    private static final String ROLE_ENTRENADOR = "ROLE_ENTRENADOR";

    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;
    private final PasswordEncoder passwordEncoder;

    public GestorLogin(ClienteDAO clienteDAO, 
                       EntrenadorDAO entrenadorDAO, 
                       PasswordEncoder passwordEncoder) {
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
        this.passwordEncoder = passwordEncoder;
    }

    
    public static class RegistroRequest {
        private String nombre;
        private String apellido;
        private String email;
        private String contrasena;
        private String rol; 

        public String getNombre() { return nombre; }
        public void setNombre(String nombre) { this.nombre = nombre; }

        public String getApellido() { return apellido; }
        public void setApellido(String apellido) { this.apellido = apellido; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getContrasena() { return contrasena; }
        public void setContrasena(String contrasena) { this.contrasena = contrasena; }

        public String getRol() { return rol; }
        public void setRol(String rol) { this.rol = rol; }
    }

    @PostMapping("/api/cliente/onboarding")
    public ResponseEntity<Object> completarOnboardingCliente(@RequestBody OnboardingRequest req) {

        if (req == null || req.getIdCliente() == null) {
            return ResponseEntity.badRequest().body("Error: No se recibió el ID del cliente.");
        }

        Optional<Cliente> clienteOpt = clienteDAO.findById(req.getIdCliente());
        if (clienteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cliente no encontrado con ID: " + req.getIdCliente());
        }

        Cliente cliente = clienteOpt.get();

        if (req.getPesoKg() != null)       cliente.setPeso(req.getPesoKg());
        if (req.getAlturaCm() != null)     cliente.setAltura(req.getAlturaCm().intValue());
        if (req.getGenero() != null)       cliente.setGenero(req.getGenero());
        if (req.getObjetivo() != null)     cliente.setObjetivo(req.getObjetivo());
        
        if (req.getFechaNacimiento() != null && !req.getFechaNacimiento().isBlank()) {
            try {
                LocalDate fechaNac = LocalDate.parse(req.getFechaNacimiento());
                int edadCalculada = Period.between(fechaNac, LocalDate.now()).getYears();
                cliente.setEdad(edadCalculada);
            } catch (Exception e) {
                // Log silent
            }
        }

        clienteDAO.save(cliente);

        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", "Onboarding completado exitosamente");
        body.put("idCliente", cliente.getId());

        return ResponseEntity.ok(body);
    }

    @PostMapping("/api/register")
    public ResponseEntity<Object> registroApi(@RequestBody RegistroRequest req) {

        if (req == null ||
                req.getNombre() == null || req.getNombre().isBlank() ||
                req.getApellido() == null || req.getApellido().isBlank() ||
                req.getEmail() == null || req.getEmail().isBlank() ||
                req.getContrasena() == null || req.getContrasena().isBlank() ||
                req.getRol() == null || req.getRol().isBlank()) {

            return ResponseEntity.badRequest().body(RELLENA_CAMPOS);
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(req.getNombre());
        usuario.setApellido(req.getApellido());
        usuario.setEmail(req.getEmail());
        usuario.setContrasena(req.getContrasena()); 
        usuario.setRol(req.getRol());

        String rolNormalizado = req.getRol().toLowerCase();

        if (emailExisteEnSistema(usuario.getEmail())) {
            return ResponseEntity.status(409).body(USUARIO_EXISTE_STR);
        }

        int resultado;
        UUID clienteId = null;
        UUID entrenadorId = null;

        switch (rolNormalizado) {
            case "cliente" -> {
                resultado = registrarCliente(usuario);
                if (resultado != 0) {
                    clienteId = clienteDAO.findByEmail(usuario.getEmail())
                            .map(Cliente::getId)
                            .orElse(null);
                }
            }
            case "entrenador" -> {
                resultado = registrarEntrenador(usuario);
                if (resultado != 0) {
                    entrenadorId = entrenadorDAO.findByEmail(usuario.getEmail())
                            .map(Entrenador::getId)
                            .orElse(null);
                }
            }
            default -> {
                return ResponseEntity.badRequest().body("Rol inválido");
            }
        }

        if (resultado == 0) {
            return ResponseEntity.internalServerError().body("No se ha podido registrar el usuario.");
        }

        Map<String, Object> body = new HashMap<>();
        body.put("rol", rolNormalizado);
        body.put("clienteId", clienteId); 
        body.put("entrenadorId", entrenadorId);
        body.put("email", usuario.getEmail());

        return ResponseEntity.ok(body);
    }

    @PostMapping("/api/entrenador/onboarding")
    public ResponseEntity<Object> completarOnboardingEntrenador(@RequestBody EntrenadorOnboardingRequest req) {

        if (req == null || req.getIdEntrenador() == null) {
            return ResponseEntity.badRequest().body("Error: No se recibió el ID del entrenador.");
        }

        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findById(req.getIdEntrenador());
        if (entrenadorOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Entrenador no encontrado con ID: " + req.getIdEntrenador());
        }

        Entrenador entrenador = entrenadorOpt.get();

        if (req.getEspecialidad() != null)      entrenador.setEspecialidad(req.getEspecialidad());
        if (req.getEdad() != null)              entrenador.setEdad(req.getEdad());
        if (req.getGenero() != null)            entrenador.setGenero(req.getGenero());
        if (req.getAniosExperiencia() != null)  entrenador.setAniosExperiencia(req.getAniosExperiencia());
        if (req.getFormacion() != null)         entrenador.setFormacion(req.getFormacion());
        if (req.getDescripcionPerfil() != null) entrenador.setDescripcionPerfil(req.getDescripcionPerfil());
        if (req.getModalidadTrabajo() != null)  entrenador.setModalidadTrabajo(req.getModalidadTrabajo());
        if (req.getFotoPerfil() != null)        entrenador.setFotoPerfil(req.getFotoPerfil());

        entrenadorDAO.save(entrenador);

        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", "Perfil de entrenador completado exitosamente");
        body.put("idEntrenador", entrenador.getId());

        return ResponseEntity.ok(body);
    }

    private boolean emailExisteEnSistema(String email) {
        return clienteDAO.findByEmail(email).isPresent() || entrenadorDAO.findByEmail(email).isPresent();
    }

    private int registrarCliente(Usuario usuario) {
        String encoded = passwordEncoder.encode(usuario.getContrasena()); 
        try {
            Cliente cliente = new Cliente(
                    usuario.getNombre(), usuario.getApellido(), usuario.getEmail(),
                    encoded, ROLE_CLIENTE, 0.0, 0,
                    0, "", "", "");

            clienteDAO.save(cliente);
            return 1;
        } catch (Exception e) {
            return 0;
        }
    }

    private int registrarEntrenador(Usuario usuario) {
        String encoded = passwordEncoder.encode(usuario.getContrasena()); 
        try {
            Entrenador entrenador = new Entrenador(
                    usuario.getNombre(), usuario.getApellido(), usuario.getEmail(),
                    encoded, ROLE_ENTRENADOR, "", 0,
                    "", 0, "",
                    "", "", "");

            entrenadorDAO.save(entrenador);
            return 1;
        } catch (Exception e) {
            return 0;
        }
    }

    @GetMapping("/clientes/{id}")
    public Cliente getClienteById(@PathVariable UUID id) { 
        return clienteDAO.findById(id).orElse(null);
    }

    @GetMapping("/entrenadores/{id}")
    public Entrenador getEntrenadorById(@PathVariable UUID id) {
        return entrenadorDAO.findById(id).orElse(null);
    }
    
    @PostMapping("/api/recover-password")
    public ResponseEntity<String> recoverPassword(@RequestParam String email, @RequestParam String nuevaContrasena) {
        Optional<Cliente> clienteOpt = clienteDAO.findByEmail(email);
        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findByEmail(email);

        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();
            cliente.setContrasena(passwordEncoder.encode(nuevaContrasena));
            clienteDAO.save(cliente);
            return ResponseEntity.ok("Contraseña actualizada correctamente");
        } else if (entrenadorOpt.isPresent()) {
            Entrenador entrenador = entrenadorOpt.get();
            entrenador.setContrasena(passwordEncoder.encode(nuevaContrasena));
            entrenadorDAO.save(entrenador);
            return ResponseEntity.ok("Contraseña actualizada correctamente");
        }
        return ResponseEntity.badRequest().body("Usuario no encontrado");
    }
}
