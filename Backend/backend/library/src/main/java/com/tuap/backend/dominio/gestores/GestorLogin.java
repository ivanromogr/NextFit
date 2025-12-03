package com.tuap.backend.dominio.gestores;

import java.time.LocalDate;
import java.time.Period;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Usuario;
import com.tuap.backend.dto.EntrenadorOnboardingRequest;
import com.tuap.backend.dto.OnboardingRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

@Controller
public class GestorLogin {

    // Constantes
    private static final String RELLENA_CAMPOS = "Rellena todos los campos";
    private static final String USUARIO_EXISTE_STR = "El nombre de usuario ya existe";
    private static final String SECRET_KEY = "mySecretKey"; 

    @Autowired
    private ClienteDAO clienteDAO;

    @Autowired
    private EntrenadorDAO entrenadorDAO;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // DTO interno para el registro inicial (Nombre, email, pass, rol)
    public static class RegistroRequest {
        public String nombre;
        public String apellido;
        public String email;
        public String contraseña;
        public String rol; 
    }

    // --------------------------------------------------------------------------------
    // API 1: ONBOARDING CLIENTE (JSON)
    // Recibe ID + Datos Físicos -> Actualiza Cliente -> Devuelve JSON
    // --------------------------------------------------------------------------------
    @PostMapping("/api/cliente/onboarding")
    @ResponseBody
    public ResponseEntity<?> completarOnboardingCliente(@RequestBody OnboardingRequest req) {

        // 1. Validar ID
        if (req == null || req.getIdCliente() == null) {
            return ResponseEntity.badRequest().body("Error: No se recibió el ID del cliente.");
        }

        // 2. Buscar Cliente
        Optional<Cliente> clienteOpt = clienteDAO.findById(req.getIdCliente());
        if (clienteOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Cliente no encontrado con ID: " + req.getIdCliente());
        }

        Cliente cliente = clienteOpt.get();

        // 3. Actualizar datos (Si vienen en el JSON)
        if (req.getPesoKg() != null)       cliente.setPeso(req.getPesoKg());
        if (req.getAlturaCm() != null)     cliente.setAltura(req.getAlturaCm().intValue());
        if (req.getGenero() != null)       cliente.setGenero(req.getGenero());
        if (req.getObjetivo() != null)     cliente.setObjetivo(req.getObjetivo());
        
        // 4. Calcular Edad automáticamente
        if (req.getFechaNacimiento() != null && !req.getFechaNacimiento().isBlank()) {
            try {
                LocalDate fechaNac = LocalDate.parse(req.getFechaNacimiento());
                int edadCalculada = Period.between(fechaNac, LocalDate.now()).getYears();
                cliente.setEdad(edadCalculada);
            } catch (Exception e) {
                System.out.println("Error calculando edad: " + e.getMessage());
            }
        }

        // 5. Guardar
        clienteDAO.save(cliente);

        // 6. Responder
        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", "Onboarding completado exitosamente");
        body.put("idCliente", cliente.getId());

        return ResponseEntity.ok(body);
    }

    // --------------------------------------------------------------------------------
    // API 2: REGISTRO DE USUARIO (JSON)
    // Recibe Datos Básicos -> Crea Usuario -> Devuelve ID
    // --------------------------------------------------------------------------------
    @PostMapping("/api/register")
    @ResponseBody
    public ResponseEntity<?> registroApi(@RequestBody RegistroRequest req) {

        // 1. Validaciones
        if (req == null ||
                req.nombre == null || req.nombre.isBlank() ||
                req.apellido == null || req.apellido.isBlank() ||
                req.email == null || req.email.isBlank() ||
                req.contraseña == null || req.contraseña.isBlank() ||
                req.rol == null || req.rol.isBlank()) {

            return ResponseEntity.badRequest().body(RELLENA_CAMPOS);
        }

        Usuario usuario = new Usuario();
        usuario.setNombre(req.nombre);
        usuario.setApellido(req.apellido);
        usuario.setEmail(req.email);
        usuario.setContraseña(req.contraseña);
        usuario.setRol(req.rol);

        String rolNormalizado = req.rol.toLowerCase();

        // 2. Comprobar duplicados
        if (emailExisteEnSistema(usuario.getEmail())) {
            return ResponseEntity.status(409).body(USUARIO_EXISTE_STR);
        }

        int resultado = 0;
        UUID clienteId = null;
        UUID entrenadorId = null;

        // 3. Crear según rol
        switch (rolNormalizado) {
            case "cliente":
                // Llamamos a la versión limpia de registrarCliente (sin Model)
                resultado = registrarCliente(usuario, 0.0, 0, 0, "", null);
                if (resultado != 0) {
                    clienteId = clienteDAO.findByEmail(usuario.getEmail())
                            .map(Cliente::getId)
                            .orElse(null);
                }
                break;

            case "entrenador":
                resultado = registrarEntrenador(usuario, "");
                if (resultado != 0) {
                    entrenadorId = entrenadorDAO.findByEmail(usuario.getEmail())
                            .map(Entrenador::getId)
                            .orElse(null);
                }
                break;

            default:
                return ResponseEntity.badRequest().body("Rol inválido");
        }

        if (resultado == 0) {
            return ResponseEntity.internalServerError().body("No se ha podido registrar el usuario.");
        }

        // 4. Devolver JSON con los IDs para el Frontend
        Map<String, Object> body = new HashMap<>();
        body.put("rol", rolNormalizado);
        body.put("clienteId", clienteId); 
        body.put("entrenadorId", entrenadorId);
        body.put("email", usuario.getEmail());

        return ResponseEntity.ok(body);
    }
    // --------------------------------------------------------------------------------
    // API 3: ONBOARDING ENTRENADOR (JSON)
    // --------------------------------------------------------------------------------
    @PostMapping("/api/entrenador/onboarding")
    @ResponseBody
    public ResponseEntity<?> completarOnboardingEntrenador(@RequestBody EntrenadorOnboardingRequest req) {

        // 1. Validar ID
        if (req == null || req.getIdEntrenador() == null) {
            return ResponseEntity.badRequest().body("Error: No se recibió el ID del entrenador.");
        }

        // 2. Buscar Entrenador
        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findById(req.getIdEntrenador());
        if (entrenadorOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Entrenador no encontrado con ID: " + req.getIdEntrenador());
        }

        Entrenador entrenador = entrenadorOpt.get();

        // 3. Actualizar datos (Solo si no son nulos)
        if (req.getEspecialidad() != null)      entrenador.setEspecialidad(req.getEspecialidad());
        if (req.getEdad() != null)              entrenador.setEdad(req.getEdad());
        if (req.getGenero() != null)            entrenador.setGenero(req.getGenero());
        if (req.getAniosExperiencia() != null)  entrenador.setAniosExperiencia(req.getAniosExperiencia());
        if (req.getFormacion() != null)         entrenador.setFormacion(req.getFormacion());
        if (req.getDescripcionPerfil() != null) entrenador.setDescripcionPerfil(req.getDescripcionPerfil());
        if (req.getModalidadTrabajo() != null)  entrenador.setModalidadTrabajo(req.getModalidadTrabajo());
        if (req.getFotoPerfil() != null)        entrenador.setFotoPerfil(req.getFotoPerfil());

        // 4. Guardar cambios
        entrenadorDAO.save(entrenador);

        // 5. Responder
        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", "Perfil de entrenador completado exitosamente");
        body.put("idEntrenador", entrenador.getId());

        return ResponseEntity.ok(body);
    }

    // --------------------------------------------------------------------------------
    // MÉTODOS PRIVADOS DE APOYO (LIMPIOS DE VISTAS)
    // --------------------------------------------------------------------------------
    
    private boolean emailExisteEnSistema(String email) {
        return clienteDAO.findByEmail(email).isPresent() || entrenadorDAO.findByEmail(email).isPresent();
    }

    private int registrarCliente(Usuario usuario, Double peso, Integer altura, Integer edad,
            String objetivo, String fotoPerfil) {
        
        String encoded = passwordEncoder.encode(usuario.getContraseña());
        
        double pesoVal = (peso != null) ? peso : 0.0;
        int alturaVal = (altura != null) ? altura : 0;
        int edadVal = (edad != null) ? edad : 0;
        String objetivoVal = (objetivo != null) ? objetivo : "";
        String fotoPerfilVal = (fotoPerfil != null) ? fotoPerfil : "";
        String generoVal = "";

        try {
            Cliente cliente = new Cliente(
                    usuario.getNombre(), usuario.getApellido(), usuario.getEmail(),
                    encoded, "ROLE_CLIENTE", pesoVal, alturaVal,
                    edadVal, objetivoVal, fotoPerfilVal, generoVal);

            clienteDAO.save(cliente);
            return 1;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }

    private int registrarEntrenador(Usuario usuario, String especialidad) {
        String encoded = passwordEncoder.encode(usuario.getContraseña());

        String especialidadVal = (especialidad != null) ? especialidad : "";
        Integer edadVal = 0;
        String generoVal = "";
        Integer aniosExperienciaVal = 0;
        String formacionVal = "";
        String descripcionPerfilVal = "";
        String modalidadTrabajoVal = "";
        String fotoPerfilVal = "";

        try {
            Entrenador entrenador = new Entrenador(
                    usuario.getNombre(), usuario.getApellido(), usuario.getEmail(),
                    encoded, "ROLE_ENTRENADOR", especialidadVal, edadVal,
                    generoVal, aniosExperienciaVal, formacionVal,
                    descripcionPerfilVal, modalidadTrabajoVal, fotoPerfilVal);

            entrenadorDAO.save(entrenador);
            return 1;
        } catch (Exception e) {
            e.printStackTrace();
            return 0;
        }
    }


    // --------------------------------------------------------------------------------
    // OTROS ENDPOINTS API (Getters, Recover Password)
    // --------------------------------------------------------------------------------

    @GetMapping("/clientes/{id}")
    @ResponseBody
    public Cliente getClienteById(@PathVariable UUID id) { 
        return clienteDAO.findById(id).orElse(null);
    }

    @GetMapping("/entrenadores/{id}")
    @ResponseBody
    public Entrenador getEntrenadorById(@PathVariable UUID id) {
        return entrenadorDAO.findById(id).orElse(null);
    }
    
    @PostMapping("/api/recover-password")
    @ResponseBody
    public ResponseEntity<String> recoverPassword(@RequestParam String email, @RequestParam String nuevaContraseña) {
        Optional<Cliente> clienteOpt = clienteDAO.findByEmail(email);
        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findByEmail(email);

        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();
            cliente.setContraseña(passwordEncoder.encode(nuevaContraseña));
            clienteDAO.save(cliente);
            return ResponseEntity.ok("Contraseña actualizada correctamente");
        } else if (entrenadorOpt.isPresent()) {
            Entrenador entrenador = entrenadorOpt.get();
            entrenador.setContraseña(passwordEncoder.encode(nuevaContraseña));
            entrenadorDAO.save(entrenador);
            return ResponseEntity.ok("Contraseña actualizada correctamente");
        }
        return ResponseEntity.badRequest().body("Usuario no encontrado");
    }

    // Métodos para generar Token (Opcionales si usas JWT más adelante)
    private String generateToken(Cliente cliente) {
        return Jwts.builder()
                .setSubject(cliente.getEmail())
                .claim("roles", cliente.getRol())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000))
                .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
                .compact();
    }
}