package com.tuap.dominio.gestores;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ui.Model;
import org.springframework.web.multipart.MultipartFile;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.gestores.GestorCliente;
import com.tuap.backend.persistencia.ClienteDAO;

@ExtendWith(MockitoExtension.class)
class GestorClienteTest {

    // 1. INYECTAMOS LA CLASE A TESTEAR
    @InjectMocks
    private GestorCliente gestorCliente;

    // 2. CREAMOS LOS MOCKS
    @Mock private ClienteDAO clienteDAO;
    @Mock private Model model;           // Simulamos el modelo de Spring MVC
    @Mock private MultipartFile fotoMock;// Simulamos el archivo de la foto de perfil

    // Variables globales para los tests
    private UUID clienteId;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        clienteId = UUID.randomUUID();
        
        clienteMock = new Cliente();
        clienteMock.setId(clienteId);
        clienteMock.setNombre("Juan");
        clienteMock.setApellido("Perez");
    }

    @Test
    void verPerfilCliente_ClienteExiste_DevuelveVistaPerfil() {
        // --- PREPARACIÓN ---
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));

        // --- ACCIÓN ---
        String nombreVista = gestorCliente.verPerfilCliente(clienteId, model);

        // --- COMPROBACIÓN ---
        assertEquals("perfilCliente", nombreVista); // Verifica que nos manda al HTML correcto
        verify(model).addAttribute("cliente", clienteMock); // Verifica que pasó los datos a la vista
    }

    @Test
    void verPerfilCliente_ClienteNoExiste_DevuelveVistaError() {
        // --- PREPARACIÓN ---
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.empty());

        // --- ACCIÓN ---
        String nombreVista = gestorCliente.verPerfilCliente(clienteId, model);

        // --- COMPROBACIÓN ---
        assertEquals("error", nombreVista);
        verify(model).addAttribute("error", "Cliente no encontrado");
    }

    @Test
    void actualizarPerfil_DatosNuevos_ActualizaYGuardaEnBBDD() throws IOException {
        // --- PREPARACIÓN ---
        when(clienteDAO.findById(clienteId)).thenReturn(Optional.of(clienteMock));
        // Simulamos que el usuario NO ha subido foto para no escribir en disco durante el test
        when(fotoMock.isEmpty()).thenReturn(true); 

        // --- ACCIÓN ---
        GestorCliente.PerfilParams params = new GestorCliente.PerfilParams(
            "Carlos", "Sainz", "carlos@test.com", 
            80.5, 180, 25, "Ganar masa", fotoMock
        );

        gestorCliente.actualizarPerfil(clienteId, params);

        // --- COMPROBACIÓN ---
        // Comprobamos que el Gestor modificó el objeto de verdad basándose en los params
        assertEquals("Carlos", clienteMock.getNombre());
        assertEquals("Sainz", clienteMock.getApellido());
        assertEquals("carlos@test.com", clienteMock.getEmail());
        assertEquals(80.5, clienteMock.getPeso());
        
        // Verificamos que se ordenó guardar en la BBDD exactamente 1 vez
        verify(clienteDAO, times(1)).save(clienteMock);
    }
}
