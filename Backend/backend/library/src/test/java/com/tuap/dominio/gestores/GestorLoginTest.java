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

    private UUID clienteId;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setEmail("test@test.com");
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

        // Simulamos el encriptador de contrasenas
        when(passwordEncoder.encode("123456")).thenReturn("contrasena_encriptada_123");
        
        // Simulamos que el entrenador NO existe con ese email
        when(entrenadorDAO.findByEmail(anyString())).thenReturn(Optional.empty());

        // 🔥 TRUCO MÁGICO: La primera vez devuelve vacío (para pasar el filtro de duplicados).
        // La segunda vez devuelve el cliente (para recuperar el ID al final).
        when(clienteDAO.findByEmail(anyString()))
            .thenReturn(Optional.empty()) 
            .thenReturn(Optional.of(clienteMock)); 

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = gestorLogin.registroApi(req);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        
        // Verificamos que se ordenó guardar el cliente 1 vez
        verify(clienteDAO, times(1)).save(any(Cliente.class));
        
        // Verificamos que la respuesta contiene el ID correcto
        Map<String, Object> body = (Map<String, Object>) respuesta.getBody();
        assertNotNull(body);
        assertEquals(clienteId, body.get("clienteId"));
        assertEquals("cliente", body.get("rol"));
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

    @Test
    void completarOnboardingCliente_DatosValidos_ActualizaYGuarda() {
        // --- PREPARACIÓN ---
        OnboardingRequest req = new OnboardingRequest();
        req.setIdCliente(clienteId);
        req.setPesoKg(75.5);
        req.setFechaNacimiento("1995-05-20"); // Comprobaremos si sabe calcular la edad

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));

        // --- ACCIÓN ---
        ResponseEntity<?> respuesta = gestorLogin.completarOnboardingCliente(req);

        // --- COMPROBACIÓN ---
        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        
        // Comprobamos que el Gestor modificó los datos físicos del cliente
        assertEquals(75.5, clienteMock.getPeso());
        assertTrue(clienteMock.getEdad() > 20); // Verificamos que calculó una edad lógica
        
        verify(clienteDAO, times(1)).save(clienteMock);
    }
}
