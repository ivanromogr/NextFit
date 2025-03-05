package com.tuap.backend.dominio.gestores;

import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Usuario;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.repositorios.UsuarioRepository;

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
    private UsuarioRepository usuarioRepository;

    @Autowired
    private ClienteDAO clienteDAO;

    @Autowired
    private EntrenadorDAO entrenadorDAO;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String SECRET_KEY = "mySecretKey"; // Clave secreta para firmar los tokens JWT

    /*
     * GETMAPPINGS
     */

    @GetMapping("/")
    public String homePage() {
        return "home";
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

    @PostMapping("/login")
    public String loginSubmit(@ModelAttribute Usuario usuario, Model model) {
        if (usuario == null) {
            model.addAttribute(ERROR_STR, "El usuario no existe, pruebe otra vez");
            return LOGIN_STR;
        }

        model.addAttribute(USUARIO_STR, usuario);
        Optional<Cliente> clienteOpt = clienteDAO.findByEmail(usuario.getEmail());
        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findByEmail(usuario.getEmail());

        String resultadoCliente = manejarCliente(clienteOpt, usuario, model);
        String resultadoEntrenador = manejarEntrenador(entrenadorOpt, usuario, model);

        if (resultadoCliente != null) { 
            return resultadoCliente;
        } else if (resultadoEntrenador != null) {
            return resultadoEntrenador;
        } else {
            model.addAttribute(ERROR_STR, "El usuario no existe, pruebe otra vez");
            return LOGIN_STR;
        }
    }

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

        if (rol == null || usuario.getNombre().isEmpty() || usuario.getApellido().isEmpty() || usuario.getEmail().isEmpty() || usuario.getContraseña().isEmpty()) {
            model.addAttribute(ERROR_STR, RELLENA_CAMPOS);
            return REGISTRO_STR;
        }

        boolean registroExitoso;
        switch (rol.toLowerCase()) {
            case "cliente":
                registroExitoso = procesarRegistroCliente(usuario, model, peso, altura, edad, objetivo);
                break;
            case "entrenador":
                registroExitoso = procesarRegistroEntrenador(usuario, model, especialidad);
                break;
            default:
                model.addAttribute(ERROR_STR, "Ingresa un tipo de usuario válido");
                return REGISTRO_STR;
        }

        if (registroExitoso) {
            return "redirect:/login"; // Redirige a la página de login después del registro
        } else {
            return REGISTRO_STR;
        }
    }

    private boolean procesarRegistroCliente(Usuario usuario, Model model, Double peso, Integer altura,
     Integer edad, String objetivo) {
        if (clienteDAO.findByEmail(usuario.getEmail()).isPresent()) {
            model.addAttribute(ERROR_STR, USUARIO_EXISTE_STR);
            return false;
        }
        return registrarCliente(usuario, model, peso, altura, edad, objetivo) != 0;
    }

    private boolean procesarRegistroEntrenador(Usuario usuario, Model model, String especialidad) {
        if (entrenadorDAO.findByEmail(usuario.getEmail()).isPresent()) {
            model.addAttribute(ERROR_STR, USUARIO_EXISTE_STR);
            return false;
        }
        return registrarEntrenador(usuario, model, especialidad) != 0;
    }

    private int registrarCliente(Usuario usuario, Model model, 
            Double peso, Integer altura, Integer edad, String objetivo) {
        if (usuario != null && !usuario.getNombre().isEmpty() && !usuario.getEmail().isEmpty() && !usuario.getContraseña().isEmpty()) {
            
            Cliente cliente = new Cliente(usuario.getNombre(), usuario.getApellido(), usuario.getEmail(), passwordEncoder.encode(usuario.getContraseña()),
            "cliente", peso, altura, edad, objetivo);
            clienteDAO.save(cliente);
            return 1;
        } else {
            model.addAttribute(ERROR_STR, RELLENA_CAMPOS);
            return 0;
        }
    }

    private int registrarEntrenador(Usuario usuario, Model model, String especialidad) {
        if (usuario != null && !usuario.getNombre().isEmpty() && !usuario.getEmail().isEmpty() && !usuario.getContraseña().isEmpty()) {
            Entrenador entrenador = new Entrenador(usuario.getNombre(), usuario.getApellido(), usuario.getEmail(), passwordEncoder.encode(usuario.getContraseña()),
            "entrenador", especialidad);
            entrenadorDAO.save(entrenador);
            return 1;
        } else {
            model.addAttribute(ERROR_STR, RELLENA_CAMPOS);
            return 0;
        }
    }

    private String manejarCliente(Optional<Cliente> clienteOpt, Usuario usuario, Model model) {
        if (clienteOpt.isPresent()) {
            Cliente cliente = clienteOpt.get();
            if (passwordEncoder.matches(usuario.getContraseña(), cliente.getContraseña())) {
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
                return "redirect:/menuentrenador/" + entrenador.getId();
            } else {
                model.addAttribute(ERROR_STR, CONTRASENA_STR);
                return LOGIN_STR;
            }
        }
        return null;
    }

    @GetMapping("/usuarios")
    public List<Usuario> getAllUsuarios() {
        return usuarioRepository.findAll();
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
        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(email);
        if (usuarioOpt.isPresent()) {
            Usuario usuario = usuarioOpt.get();
            usuario.setContraseña(passwordEncoder.encode(nuevaContraseña));
            usuarioRepository.save(usuario);
            return ResponseEntity.ok("Contraseña actualizada correctamente");
        }
        return ResponseEntity.status(404).body("Usuario no encontrado");
    }

    private String generateToken(Usuario usuario) {
        return Jwts.builder()
                .setSubject(usuario.getEmail())
                .claim("roles", usuario.getRol())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // 1 día
                .signWith(SignatureAlgorithm.HS512, SECRET_KEY)
                .compact();
    }
}
