package com.tuap.backend.dominio.gestores;

import java.time.LocalDate;
import java.time.Period;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Usuario;
import com.tuap.backend.dto.EntrenadorOnboardingRequest;
import com.tuap.backend.dto.OnboardingRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.JwtService;
import com.tuap.backend.auth.LoginResponse;
import com.tuap.backend.auth.Role;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.RequestHeader;
import com.tuap.backend.auth.ClientType;
import com.tuap.backend.auth.RefreshTokenService;
import com.tuap.backend.auth.RefreshTokenProperties;
import com.tuap.backend.auth.ConsentService;
import com.tuap.backend.auth.ConsentRequiredException;
import org.springframework.transaction.annotation.Transactional;

@RestController
public class GestorLogin {

    private static final String RELLENA_CAMPOS = "Rellena todos los campos";
    private static final String USUARIO_EXISTE_STR = "El nombre de usuario ya existe";
    private static final String ROLE_CLIENTE = "ROLE_CLIENTE";
    private static final String ROLE_ENTRENADOR = "ROLE_ENTRENADOR";

    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokens;
    private final RefreshTokenProperties refreshProperties;
    @org.springframework.beans.factory.annotation.Autowired private ConsentService consentService;

    public GestorLogin(ClienteDAO clienteDAO, 
                       EntrenadorDAO entrenadorDAO, 
                       PasswordEncoder passwordEncoder, JwtService jwtService, RefreshTokenService refreshTokens, RefreshTokenProperties refreshProperties) {
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokens = refreshTokens;
        this.refreshProperties = refreshProperties;
    }

    
    public static class RegistroRequest {
        private String nombre;
        private String apellido;
        private String email;
        private String contrasena;
        private String rol; 
        private boolean acceptTerms;
        private boolean acceptPrivacy;
        private boolean marketingConsent;

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
        public boolean isAcceptTerms(){return acceptTerms;} public void setAcceptTerms(boolean value){acceptTerms=value;}
        public boolean isAcceptPrivacy(){return acceptPrivacy;} public void setAcceptPrivacy(boolean value){acceptPrivacy=value;}
        public boolean isMarketingConsent(){return marketingConsent;} public void setMarketingConsent(boolean value){marketingConsent=value;}
    }

    @PostMapping("/api/register")
    @Transactional public ResponseEntity<Object> registroApi(@RequestBody RegistroRequest req, @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader) {

        if (req == null ||
                req.getNombre() == null || req.getNombre().isBlank() ||
                req.getApellido() == null || req.getApellido().isBlank() ||
                req.getEmail() == null || req.getEmail().isBlank() ||
                req.getContrasena() == null || req.getContrasena().isBlank() ||
                req.getRol() == null || req.getRol().isBlank()) {

            return ResponseEntity.badRequest().body(RELLENA_CAMPOS);
        }

        if (!req.isAcceptTerms()) return ResponseEntity.badRequest().body(Map.of("code", "TERMS_NOT_ACCEPTED"));
        if (!req.isAcceptPrivacy()) return ResponseEntity.badRequest().body(Map.of("code", "PRIVACY_NOT_ACCEPTED"));
        Usuario usuario = new Usuario();
        usuario.setNombre(req.getNombre());
        usuario.setApellido(req.getApellido());
        usuario.setEmail(req.getEmail().trim().toLowerCase(Locale.ROOT));
        usuario.setContrasena(req.getContrasena()); 
        usuario.setRol(req.getRol());

        String rolNormalizado = req.getRol().trim().toLowerCase(Locale.ROOT);

        if (emailExisteEnSistema(usuario.getEmail())) {
            return ResponseEntity.status(409).body(USUARIO_EXISTE_STR);
        }

        AuthenticatedUser authenticatedUser;

        switch (rolNormalizado) {
            case "cliente" -> {
                Cliente cliente = registrarCliente(usuario);
                authenticatedUser = new AuthenticatedUser(cliente.getId(), cliente.getEmail(), Role.CLIENTE);
            }
            case "entrenador" -> {
                Entrenador entrenador = registrarEntrenador(usuario);
                authenticatedUser = new AuthenticatedUser(entrenador.getId(), entrenador.getEmail(), Role.ENTRENADOR);
            }
            default -> {
                return ResponseEntity.badRequest().body("Rol inválido");
            }
        }
        if (consentService != null) consentService.recordRegistration(authenticatedUser, true, true, req.isMarketingConsent());

        ClientType type = ClientType.fromHeader(clientTypeHeader);
        RefreshTokenService.IssuedToken refresh = refreshTokens.issue(authenticatedUser, type);
        LoginResponse response = type == ClientType.MOBILE ? LoginResponse.mobile(authenticatedUser, jwtService.generateAccessToken(authenticatedUser), jwtService.getAccessTokenTtlSeconds(), refresh.rawToken())
                : LoginResponse.from(authenticatedUser, jwtService.generateAccessToken(authenticatedUser), jwtService.getAccessTokenTtlSeconds());
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(HttpStatus.CREATED);
        if (type == ClientType.WEB) builder.header(org.springframework.http.HttpHeaders.SET_COOKIE,
                org.springframework.http.ResponseCookie.from(refreshProperties.getCookieName(), refresh.rawToken()).httpOnly(true).secure(refreshProperties.isCookieSecure()).sameSite(refreshProperties.getCookieSameSite()).path(refreshProperties.getCookiePath()).maxAge(java.time.Duration.ofDays(refreshProperties.getTtlDays())).build().toString());
        return builder.body(response);
    }

    /** Direct entry point retained for unit tests; it enforces the same consent contract as HTTP. */
    public ResponseEntity<Object> registroApi(RegistroRequest req) { return registroApi(req, "WEB"); }

    @PostMapping("/api/entrenador/onboarding")
    public ResponseEntity<Object> completarOnboardingEntrenador(@RequestBody EntrenadorOnboardingRequest req,
            @AuthenticationPrincipal AuthenticatedUser authenticatedUser) {

        if (authenticatedUser == null || authenticatedUser.role() != Role.ENTRENADOR) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("No autorizado para onboarding de entrenador.");
        }
        if (req == null) return ResponseEntity.badRequest().body("Solicitud de onboarding inválida.");
        if (req != null && req.getIdEntrenador() != null && !req.getIdEntrenador().equals(authenticatedUser.userId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("El ID no coincide con la identidad autenticada.");
        }

        Optional<Entrenador> entrenadorOpt = entrenadorDAO.findById(authenticatedUser.userId());
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
        // Profile images are assigned only by /api/auth/profile-image after upload ownership validation.

        entrenadorDAO.save(entrenador);

        Map<String, Object> body = new HashMap<>();
        body.put("mensaje", "Perfil de entrenador completado exitosamente");
        body.put("idEntrenador", entrenador.getId());

        return ResponseEntity.ok(body);
    }

    private boolean emailExisteEnSistema(String email) {
        return clienteDAO.findByEmail(email).isPresent() || entrenadorDAO.findByEmail(email).isPresent();
    }

    private Cliente registrarCliente(Usuario usuario) {
        String encoded = passwordEncoder.encode(usuario.getContrasena()); 
        try {
            Cliente cliente = new Cliente(
                    usuario.getNombre(), usuario.getApellido(), usuario.getEmail(),
                    encoded, ROLE_CLIENTE, 0.0, 0,
                    0, "", "", "");

            return clienteDAO.save(cliente);
        } catch (Exception e) {
            throw new IllegalStateException("No se ha podido registrar el usuario.", e);
        }
    }

    private Entrenador registrarEntrenador(Usuario usuario) {
        String encoded = passwordEncoder.encode(usuario.getContrasena()); 
        try {
            Entrenador entrenador = new Entrenador(
                    usuario.getNombre(), usuario.getApellido(), usuario.getEmail(),
                    encoded, ROLE_ENTRENADOR, "", 0,
                    "", 0, "",
                    "", "", "");

            return entrenadorDAO.save(entrenador);
        } catch (Exception e) {
            throw new IllegalStateException("No se ha podido registrar el usuario.", e);
        }
    }

}
