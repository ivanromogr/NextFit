package com.tuap.dominio.gestores;



import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.gestores.GestorLogin;
import com.tuap.backend.auth.JwtService;
import com.tuap.backend.dto.OnboardingRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

@ExtendWith(MockitoExtension.class)
class GestorLoginTest {

    @InjectMocks
    private GestorLogin gestorLogin;

    @Mock private ClienteDAO clienteDAO;
    @Mock private EntrenadorDAO entrenadorDAO;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtService jwtService;
    @Mock private com.tuap.backend.auth.RefreshTokenService refreshTokens;
    @Mock private com.tuap.backend.auth.RefreshTokenProperties refreshProperties;

    private UUID clienteId;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setEmail("test@test.com");
        org.mockito.Mockito.lenient().when(refreshTokens.issue(any(), any())).thenReturn(new com.tuap.backend.auth.RefreshTokenService.IssuedToken("refresh", "hash", UUID.randomUUID(), java.time.Instant.now().plusSeconds(60)));
        org.mockito.Mockito.lenient().when(refreshProperties.getCookieName()).thenReturn("nextfit_refresh");
        org.mockito.Mockito.lenient().when(refreshProperties.getCookiePath()).thenReturn("/api/auth");
        org.mockito.Mockito.lenient().when(refreshProperties.getCookieSameSite()).thenReturn("Strict");
    }

    @Test
    void registroApi_DatosValidos_RegistraClienteYDevuelve200() {
        // --- PREPARACIÓN ---
       GestorLogin.RegistroRequest req = new GestorLogin.RegistroRequest();
req.setNombre("Juan");
req.setApellido("Pérez");
req.setEmail("juan@ejemplo.com");
req.setContrasena("123456"); 
req.setRol("cliente");
req.setAcceptTerms(true); req.setAcceptPrivacy(true); req.setMarketingConsent(false);

        // Simulamos el encriptador de contrasenas
        when(passwordEncoder.encode("123456")).thenReturn("contrasena_encriptada_123");
        
        // Simulamos que el entrenador NO existe con ese email
        when(entrenadorDAO.findByEmail(anyString())).thenReturn(Optional.empty());

        // 🔥 TRUCO MÁGICO: La primera vez devuelve vacío (para pasar el filtro de duplicados).
        // La segunda vez devuelve el cliente (para recuperar el ID al final).
        when(clienteDAO.findByEmail(anyString()))
            .thenReturn(Optional.empty()) 
            .thenReturn(Optional.of(clienteMock)); 
        when(clienteDAO.save(any(Cliente.class))).thenReturn(clienteMock);

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = gestorLogin.registroApi(req);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.CREATED, respuesta.getStatusCode());
        
        // Verificamos que se ordenó guardar el cliente 1 vez
        verify(clienteDAO, times(1)).save(any(Cliente.class));
        
        assertNotNull(respuesta.getBody());
    }

    @Test
    void registroApi_EmailYaExiste_DevuelveError409() {
        // --- PREPARACIÓN ---
        GestorLogin.RegistroRequest req = new GestorLogin.RegistroRequest();
        req.setNombre("Pedro");
        req.setApellido("Pérez");
        req.setEmail("test@test.com"); // Este email ya está pillado
        req.setContrasena("123456");
        req.setRol("cliente");
        req.setAcceptTerms(true); req.setAcceptPrivacy(true); req.setMarketingConsent(false);

        // Simulamos que la BBDD encuentra a alguien con ese email
        when(clienteDAO.findByEmail("test@test.com")).thenReturn(Optional.of(clienteMock));

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = gestorLogin.registroApi(req);

        // --- COMPROBACIÓN ---
        // Verifica que devuelve conflicto (409)
        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
        assertEquals("El nombre de usuario ya existe", respuesta.getBody());
        
        // Verifica que NO se intentó guardar nada
        verify(clienteDAO, never()).save(any());
    }

    @Test
    void registroApi_EmailExistenteComoEntrenador_DevuelveError409() {
        GestorLogin.RegistroRequest req = new GestorLogin.RegistroRequest();
        req.setNombre("Pedro");
        req.setApellido("Pérez");
        req.setEmail("Entrenador@Test.Com ");
        req.setContrasena("123456");
        req.setRol("cliente");
        req.setAcceptTerms(true); req.setAcceptPrivacy(true); req.setMarketingConsent(false);
        req.setAcceptTerms(true); req.setAcceptPrivacy(true); req.setMarketingConsent(false);
        when(clienteDAO.findByEmail("entrenador@test.com")).thenReturn(Optional.empty());
        when(entrenadorDAO.findByEmail("entrenador@test.com")).thenReturn(Optional.of(new com.tuap.backend.dominio.entidades.Entrenador()));

        ResponseEntity<?> respuesta = gestorLogin.registroApi(req);

        assertEquals(HttpStatus.CONFLICT, respuesta.getStatusCode());
    }

    @Test
    void registroApi_RolAdmin_DevuelveError400() {
        GestorLogin.RegistroRequest req = new GestorLogin.RegistroRequest();
        req.setNombre("Admin");
        req.setApellido("No permitido");
        req.setEmail("admin@test.com");
        req.setContrasena("123456");
        req.setRol("ADMIN");
        req.setAcceptTerms(true); req.setAcceptPrivacy(true); req.setMarketingConsent(false);
        when(clienteDAO.findByEmail("admin@test.com")).thenReturn(Optional.empty());
        when(entrenadorDAO.findByEmail("admin@test.com")).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = gestorLogin.registroApi(req);

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("Rol inválido", respuesta.getBody());
    }

    @Test
    void registroApi_FaltaContraseña_DevuelveError400() {
        // --- PREPARACIÓN ---
        GestorLogin.RegistroRequest req = new GestorLogin.RegistroRequest();
        req.setNombre("Luis");
        req.setApellido("Gómez");
        req.setEmail("luis@test.com");
        req.setContrasena(""); // Dejado en blanco a propósito
        req.setRol("cliente");

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = gestorLogin.registroApi(req);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("Rellena todos los campos", respuesta.getBody());
    }

}
