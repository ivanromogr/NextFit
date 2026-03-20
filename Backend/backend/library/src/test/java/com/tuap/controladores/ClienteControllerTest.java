package com.tuap.controladores;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.tuap.backend.controladores.ClienteController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dto.OnboardingRequest;
import com.tuap.backend.dto.UpdateClienteRequest;
import com.tuap.backend.persistencia.ClienteDAO;

@ExtendWith(MockitoExtension.class)
class ClienteControllerTest {

    @InjectMocks
    private ClienteController clienteController;

    @Mock
    private ClienteDAO clienteDAO;

    private UUID clienteId;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setNombre("Laura");
        clienteMock.setEmail("laura@test.com");
    }

    // 🟢 TEST 1: Listar todos los clientes
    @Test
    void listar_DevuelveListaDeClientes() {
        when(clienteDAO.findAll()).thenReturn(Arrays.asList(clienteMock));

        List<Cliente> resultado = clienteController.listar();

        assertEquals(1, resultado.size());
        assertEquals("Laura", resultado.get(0).getNombre());
    }

    // 🟢 TEST 2: Buscar por Email (Existe)
    @Test
    void buscarPorEmail_ClienteExiste_Devuelve200() {
        when(clienteDAO.findByEmail("laura@test.com")).thenReturn(Optional.of(clienteMock));

        ResponseEntity<?> respuesta = clienteController.buscarPorEmail("laura@test.com");

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(clienteMock, respuesta.getBody());
    }

    // 🔴 TEST 3: Buscar por Email (No Existe)
    @Test
    void buscarPorEmail_ClienteNoExiste_Devuelve404() {
        when(clienteDAO.findByEmail("fantasma@test.com")).thenReturn(Optional.empty());

        ResponseEntity<?> respuesta = clienteController.buscarPorEmail("fantasma@test.com");

        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
    }

    // 🟢 TEST 4: Completar Onboarding
    @Test
    void completarOnboarding_DatosValidos_ActualizaYGuarda() {
        OnboardingRequest req = new OnboardingRequest();
        req.setIdCliente(clienteId);
        req.setPesoKg(65.0);
        req.setAlturaCm(170.0);
        req.setFechaNacimiento("1990-01-01");

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));

        ResponseEntity<?> respuesta = clienteController.completarOnboarding(req);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(65.0, clienteMock.getPeso());
        assertEquals(170, clienteMock.getAltura());
        assertTrue(clienteMock.getEdad() > 30); // Verifica que la edad se calculó
        verify(clienteDAO, times(1)).save(clienteMock);
    }

    // 🔴 TEST 5: Completar Onboarding sin ID
    @Test
    void completarOnboarding_SinId_Devuelve400() {
        OnboardingRequest req = new OnboardingRequest(); // Sin ID

        ResponseEntity<?> respuesta = clienteController.completarOnboarding(req);

        assertEquals(HttpStatus.BAD_REQUEST, respuesta.getStatusCode());
        assertEquals("Error: No se identificó al cliente (Falta ID).", respuesta.getBody());
    }

    // 🟢 TEST 6: Actualizar Perfil
    @Test
    void actualizarPerfil_DatosNuevos_ActualizaCampos() {
        UpdateClienteRequest req = new UpdateClienteRequest();
        req.setNombre("Laura Modificada");
        req.setObjetivo("Perder peso");

        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));

        ResponseEntity<?> respuesta = clienteController.actualizarPerfil(clienteId, req);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals("Laura Modificada", clienteMock.getNombre());
        assertEquals("Perder peso", clienteMock.getObjetivo());
        verify(clienteDAO, times(1)).save(clienteMock);
    }
}