package com.tuap.backend.dominio.gestores;

import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Usuario;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;

@Controller
public class GestorLogin {
    private static final String USUARIO_STR = "usuario";
    private static final String LOGIN_STR = "login";
    private static final String REGISTRO_STR = "registro";
    private static final String ERROR_STR = "error";
    private static final String CONTRASENA_STR = "Contraseña incorrecta, pruebe otra vez";
    private static final String RELLENA_CAMPOS = "Rellena todos los campos";
    private static final String USUARIO_EXISTE_STR = "El nombre de usuario ya existe";

    @Autowired
    private ClienteDAO clienteDAO;

    @Autowired
    private EntrenadorDAO entrenadorDAO;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String SECRET_KEY = "mySecretKey"; // Clave secreta para firmar los tokens JWT

    // DTO para /api/register (usado por el frontend React)
    public static class RegistroRequest {
        public String nombre;
        public String apellido;
        public String email;
        public String contraseña; // mismo nombre que en tu entidad
        public String rol; // "CLIENTE" o "ENTRENADOR"
    }

    /*
     * GETMAPPINGS
     */

    @GetMapping("/")
    public String paginaInicio() {
        return "index";
    }

    @GetMapping("/login")
    public String loginForm(Model model) {
        model.addAttribute(USUARIO_STR, new Usuario());
        return LOGIN_STR;
    }

    @GetMapping("/register")
    public String registroForm(Model model) {
        model.addAttribute(USUARIO_STR, new Usuario());
        return REGISTRO_STR;
    }

    /*
     * POSTMAPPINGS
     */

    @PostMapping("/register")
    public String registroSubmit(
            @ModelAttribute Usuario usuario,
            @RequestParam(value = "rol", required = false) String rol,
            @RequestParam(value = "peso", required = false) Double peso,
            @RequestParam(value = "altura", required = false) Integer altura,
            @RequestParam(value = "edad", required = false) Integer edad,
            @RequestParam(value = "objetivo", required = false) String objetivo,
            @RequestParam(value = "especialidad", required = false) String especialidad,
            Model model) {

        if (rol == null || usuario.getNombre().isEmpty() || usuario.getApellido().isEmpty()
                || usuario.getEmail().isEmpty() || usuario.getContraseña().isEmpty()) {
            model.addAttribute(ERROR_STR, RELLENA_CAMPOS);
            return REGISTRO_STR;
        }

        // Comprobación global de email único
        if (emailExisteEnSistema(usuario.getEmail())) {
            model.addAttribute(ERROR_STR, USUARIO_EXISTE_STR);
            return REGISTRO_STR;
        }

        boolean registroExitoso;
        switch (rol.toLowerCase()) {
            case "cliente":
                registroExitoso = registrarCliente(usuario, model, peso, altura, edad, objetivo, null) != 0;
                break;
            case "entrenador":
                registroExitoso = registrarEntrenador(usuario, model, especialidad) != 0;
                break;
            default:
                model.addAttribute(ERROR_STR, "Ingresa un tipo de usuario válido");
                return REGISTRO_STR;
        }

        if (registroExitoso) {
            return "redirect:/login";
        } else {
            return REGISTRO_STR;
        }
    }

    private boolean procesarRegistroCliente(Usuario usuario, Model model, Double peso, Integer altura,
            Integer edad, String objetivo, String fotoPerfil) {
        return registrarCliente(usuario, model, peso, altura, edad, objetivo, fotoPerfil) != 0;
    }

    private boolean emailExisteEnSistema(String email) {
        return clienteDAO.findByEmail(email).isPresent() || entrenadorDAO.findByEmail(email).isPresent();
    }

    private boolean procesarRegistroEntrenador(Usuario usuario, Model model, String especialidad) {
        return registrarEntrenador(usuario, model, especialidad) != 0;
    }

    private int registrarCliente(Usuario usuario, Model model,
                             Double peso, Integer altura, Integer edad,
                             String objetivo, String fotoPerfil) {
    if (usuario != null
            && usuario.getNombre() != null && !usuario.getNombre().isEmpty()
            && usuario.getEmail() != null && !usuario.getEmail().isEmpty()
            && usuario.getContraseña() != null && !usuario.getContraseña().isEmpty()) {

        String encoded = passwordEncoder.encode(usuario.getContraseña());

        // Valores por defecto para evitar nulls problemáticos
        double pesoVal = (peso != null) ? peso : 0.0;
        int alturaVal = (altura != null) ? altura : 0;
        int edadVal = (edad != null) ? edad : 0;
        String objetivoVal = (objetivo != null) ? objetivo : "";
        String fotoPerfilVal = (fotoPerfil != null) ? fotoPerfil : "";
        String generoVal = ""; // de momento vacío hasta que el usuario complete el perfil

        try {
            Cliente cliente = new Cliente(
                    usuario.getNombre(),
                    usuario.getApellido(),
                    usuario.getEmail(),
                    encoded,
                    "ROLE_CLIENTE",
                    pesoVal,
                    alturaVal,
                    edadVal,
                    objetivoVal,
                    fotoPerfilVal,
                    generoVal
            );

            clienteDAO.save(cliente);
            return 1;
        } catch (Exception e) {
            e.printStackTrace(); // <- para ver el error exacto en la consola
            model.addAttribute(ERROR_STR, "Error al guardar el cliente en BD");
            return 0;
        }
    } else {
        model.addAttribute(ERROR_STR, RELLENA_CAMPOS);
        return 0;
    }
}

private int registrarEntrenador(Usuario usuario, Model model, String especialidad) {
    if (usuario != null
            && usuario.getNombre() != null && !usuario.getNombre().isEmpty()
            && usuario.getEmail() != null && !usuario.getEmail().isEmpty()
            && usuario.getContraseña() != null && !usuario.getContraseña().isEmpty()) {

        String encoded = passwordEncoder.encode(usuario.getContraseña());

        // Valores por defecto para los campos que aún no pedimos en el formulario
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
                    usuario.getNombre(),
                    usuario.getApellido(),
                    usuario.getEmail(),
                    encoded,
                    "ROLE_ENTRENADOR",
                    especialidadVal,
                    edadVal,
                    generoVal,
                    aniosExperienciaVal,
                    formacionVal,
                    descripcionPerfilVal,
                    modalidadTrabajoVal,
                    fotoPerfilVal
            );

            entrenadorDAO.save(entrenador);
            return 1;
        } catch (Exception e) {
            e.printStackTrace(); // <- para ver el error exacto en la consola
            model.addAttribute(ERROR_STR, "Error al guardar el entrenador en BD");
            return 0;
        }
    } else {
        model.addAttribute(ERROR_STR, RELLENA_CAMPOS);
        return 0;
    }
}


    private String manejarCliente(Optional<Cliente> clienteOpt, Usuario usuario, Model model) {
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();

            boolean matches = passwordEncoder.matches(usuario.getContraseña(), cliente.getContraseña());

            if (matches) {
                SimpleGrantedAuthority authority = new SimpleGrantedAuthority(cliente.getRol()); // → "ROLE_CLIENTE"

                UserDetails userDetails = User.withUsername(cliente.getEmail())
                        .password(cliente.getContraseña()) // obligatorio, aunque no se use
                        .authorities(authority) // usamos authority, no roles
                        .build();

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());

                SecurityContextHolder.getContext().setAuthentication(auth);

                System.out.println("Autenticado: " + auth.isAuthenticated());
                System.out.println("Roles: " + auth.getAuthorities());

                return "redirect:/menucliente/" + cliente.getId();
            } else {
                model.addAttribute(ERROR_STR, CONTRASENA_STR);
                return LOGIN_STR;
            }
        }
        return null;
    }

    private String manejarEntrenador(Optional<Entrenador> entrenadorOpt, Usuario usuario, Model model) {
        if (entrenadorOpt.isPresent()) {
            Entrenador entrenador = entrenadorOpt.get();

            if (passwordEncoder.matches(usuario.getContraseña(), entrenador.getContraseña())) {
                SimpleGrantedAuthority authority = new SimpleGrantedAuthority(entrenador.getRol()); // →
                                                                                                    // "ROLE_ENTRENADOR"

                UserDetails userDetails = User.withUsername(entrenador.getEmail())
                        .password(entrenador.getContraseña()) // obligatorio, aunque no se use
                        .authorities(authority) // usamos authority, no roles
                        .build();

                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());

                SecurityContextHolder.getContext().setAuthentication(auth);

                System.out.println("Autenticado: " + auth.isAuthenticated());
                System.out.println("Roles: " + auth.getAuthorities());

                return "redirect:/menuentrenador/" + entrenador.getId();
            } else {
                model.addAttribute(ERROR_STR, CONTRASENA_STR);
                return LOGIN_STR;
            }
        }
        return null;
    }

    @PostMapping("/api/register")
    @ResponseBody
    public ResponseEntity<?> registroApi(@RequestBody RegistroRequest req) {

        // 1) Validar campos básicos
        if (req == null ||
                req.nombre == null || req.nombre.isBlank() ||
                req.apellido == null || req.apellido.isBlank() ||
                req.email == null || req.email.isBlank() ||
                req.contraseña == null || req.contraseña.isBlank() ||
                req.rol == null || req.rol.isBlank()) {

            return ResponseEntity.badRequest().body(RELLENA_CAMPOS);
        }

        // 2) Construimos un Usuario igual que cuando venía del formulario
        Usuario usuario = new Usuario();
        usuario.setNombre(req.nombre);
        usuario.setApellido(req.apellido);
        usuario.setEmail(req.email);
        // OJO: aquí guardamos la contraseña SIN encriptar,
        // porque registrarCliente/registrarEntrenador la encriptan internamente
        usuario.setContraseña(req.contraseña);
        usuario.setRol(req.rol);

        String rolNormalizado = req.rol.toLowerCase();

        // 3) Comprobar si el email ya existe (reutilizamos tu método)
        if (emailExisteEnSistema(usuario.getEmail())) {
            // 409 Conflict -> usuario ya existe
            return ResponseEntity.status(409).body(USUARIO_EXISTE_STR);
        }

        // 4) Llamar a tu misma lógica de registrar cliente/entrenador
        ExtendedModelMap dummyModel = new ExtendedModelMap();
        int resultado = 0;

        switch (rolNormalizado) {
            case "cliente":
                // Inicialmente sin datos de perfil: peso/altura/edad/objetivo/fotoPerfil
                resultado = registrarCliente(
                        usuario,
                        dummyModel,
                        Double.valueOf(0.0), // peso
                        Integer.valueOf(0), // altura
                        Integer.valueOf(0), // edad
                        "", // objetivo
                        null // fotoPerfil
                );
                break;

            case "entrenador":
                // Inicialmente sin especialidad concreta
                resultado = registrarEntrenador(usuario, dummyModel,
                        "");
                break;

            default:
                return ResponseEntity.badRequest().body("Rol inválido");
        }

        if (resultado == 0) {
            // Algo ha fallado dentro de registrarCliente/Entrenador
            return ResponseEntity.internalServerError()
                    .body("No se ha podido registrar el usuario.");
        }

        // 5) Todo OK -> devolver ID del nuevo recurso para que el frontend lo use
        if ("cliente".equals(rolNormalizado)) {
            Optional<Cliente> cliOpt = clienteDAO.findByEmail(usuario.getEmail());
            if (cliOpt.isPresent()) {
                Cliente c = cliOpt.get();
                java.util.Map<String, java.util.UUID> body = java.util.Map.of("clienteId", c.getId());
                return ResponseEntity.ok(body);
            }
        }
        if ("entrenador".equals(rolNormalizado)) {
            Optional<Entrenador> entOpt = entrenadorDAO.findByEmail(usuario.getEmail());
            if (entOpt.isPresent()) {
                Entrenador e = entOpt.get();
                java.util.Map<String, java.util.UUID> body = java.util.Map.of("entrenadorId", e.getId());
                return ResponseEntity.ok(body);
            }
        }
        // Fallback (algo raro pasó)
        return ResponseEntity.ok().build();
    }

    @GetMapping("/post-login")
    public String redireccionPostLogin(Authentication authentication) {
        String email = authentication.getName();

        // Buscar en ClienteDAO
        Optional<Cliente> clienteOpt = clienteDAO.findByEmail(email);
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();
            return "redirect:/menucliente/" + cliente.getId();
        }

        // Buscar en EntrenadorDAO
        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findByEmail(email);
        if (entrenadorOpt.isPresent()) {
            Entrenador entrenador = entrenadorOpt.get();
            return "redirect:/menuentrenador/" + entrenador.getId();
        }

        // Si no se encuentra el usuario
        return "redirect:/login?error=true";
    }

    @GetMapping("/clientes/{id}")
    public Cliente getClienteById(@PathVariable UUID idCliente) {
        return clienteDAO.findById(idCliente).orElse(null);
    }

    @GetMapping("/entrenadores/{id}")
    public Entrenador getEntrenadorById(@PathVariable UUID idEntrenador) {
        return entrenadorDAO.findById(idEntrenador).orElse(null);
    }

    @PostMapping("/api/recover-password")
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

        // Add this return if neither cliente nor entrenador is found
        return ResponseEntity.badRequest().body("Usuario no encontrado");
    }

    private String generateToken(Cliente cliente) {
        return Jwts.builder()
                .setSubject(cliente.getEmail())
                .claim("roles", cliente.getRol())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000))
                .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
                .compact();
    }

    private String generateToken(Entrenador entrenador) {
        return Jwts.builder()
                .setSubject(entrenador.getEmail())
                .claim("roles", entrenador.getRol())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000))
                .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
                .compact();
    }

}
