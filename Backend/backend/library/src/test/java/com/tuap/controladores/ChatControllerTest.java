package com.tuap.controladores;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.tuap.backend.controladores.ChatController;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Mensaje;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.MensajeDAO;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    @InjectMocks
    private ChatController chatController;

    @Mock private SimpMessagingTemplate messagingTemplate; 
    @Mock private MensajeDAO mensajeDAO;
    @Mock private ClienteDAO clienteDAO;
    @Mock private EntrenadorDAO entrenadorDAO;
    @Mock private com.tuap.backend.auth.OwnershipService ownershipService;
    @Mock private com.tuap.backend.servicios.ChatAttachmentAccessService chatAttachmentAccessService;

    private UUID remitenteId;
    private UUID destinatarioId;
    private Mensaje mensajeFake;

    @BeforeEach
    void setUp() {
        remitenteId = UUID.randomUUID();
        destinatarioId = UUID.randomUUID();

        mensajeFake = new Mensaje();
        mensajeFake.setRemitenteId(remitenteId);
        mensajeFake.setDestinatarioId(destinatarioId);
        mensajeFake.setContenido("¡Hola, entrenador!");
    }

    @Test
    void processMessage_AsignaFechaYGuardaYRetransmite() {
        when(mensajeDAO.save(any(Mensaje.class))).thenReturn(mensajeFake);

        chatController.processMessage(mensajeFake, principal(remitenteId, Role.CLIENTE));

        assertNotNull(mensajeFake.getFechaHora());
        assertFalse(mensajeFake.isLeido());
        verify(mensajeDAO, times(1)).save(mensajeFake);
        verify(messagingTemplate, times(1)).convertAndSendToUser(eq(remitenteId.toString()), eq("/queue/mensajes"), any(Mensaje.class));
        verify(messagingTemplate, times(1)).convertAndSendToUser(eq(destinatarioId.toString()), eq("/queue/mensajes"), any(Mensaje.class));
    }

    @Test
    void marcarComoLeido_MensajesNoLeidos_ActualizaYRetransmite() {
        List<Mensaje> noLeidos = Arrays.asList(mensajeFake);
        when(mensajeDAO.findByRemitenteIdAndDestinatarioIdAndLeidoFalse(remitenteId, destinatarioId)).thenReturn(noLeidos);

        Map<String, String> payload = Map.of(
            "remitenteId", remitenteId.toString(),
            "destinatarioId", destinatarioId.toString()
        );

        chatController.marcarComoLeido(payload, principal(destinatarioId, Role.ENTRENADOR));

        assertTrue(mensajeFake.isLeido()); // Verifica que se marcó como leído
        verify(mensajeDAO, times(1)).saveAll(noLeidos);
        verify(messagingTemplate, times(1)).convertAndSendToUser(eq(remitenteId.toString()), eq("/queue/mensajes"), eq(mensajeFake));
    }

    @Test
    void getHistorial_DevuelveListaDeMensajesYStatus200() {
        List<Mensaje> historial = Arrays.asList(mensajeFake);
        when(mensajeDAO.findChatHistory(remitenteId, destinatarioId)).thenReturn(historial);

        ResponseEntity<List<Mensaje>> respuesta = chatController.getHistorial(remitenteId, destinatarioId, null,
                new AuthenticatedUser(remitenteId, "test@local", Role.CLIENTE));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals(1, respuesta.getBody().size());
        assertEquals("¡Hola, entrenador!", respuesta.getBody().get(0).getContenido());
    }

    @Test
    void obtenerContactosDeUsuario_ContactosExisten_DevuelveListaClientes() {
        Cliente contactoFake = new Cliente();
        contactoFake.setId(UUID.randomUUID());
        contactoFake.setNombre("Paco");

        when(clienteDAO.findByEntrenadorId(remitenteId)).thenReturn(List.of(contactoFake));

        ResponseEntity<List<Map<String, Object>>> respuesta = chatController.obtenerContactosDeUsuario(remitenteId,
                new AuthenticatedUser(remitenteId, "test@local", Role.ENTRENADOR));

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertEquals("Paco", respuesta.getBody().get(0).get("nombre"));
        assertEquals("CLIENTE", respuesta.getBody().get(0).get("tipoContacto"));
    }

    @Test
    void processMessage_ValidatesAttachmentIdAndDiscardsLegacyUrl() {
        UUID attachmentId = UUID.randomUUID();
        mensajeFake.setAttachmentId(attachmentId);
        mensajeFake.setArchivoUrl("https://untrusted.example/file.jpg");
        when(mensajeDAO.save(any(Mensaje.class))).thenReturn(mensajeFake);

        chatController.processMessage(mensajeFake, principal(remitenteId, Role.CLIENTE));

        verify(chatAttachmentAccessService).validateForMessage(attachmentId,
                new AuthenticatedUser(remitenteId, "test@local", Role.CLIENTE));
        assertEquals(null, mensajeFake.getArchivoUrl());
    }
    @Test
    void processMessage_DestinatarioInactivo_NoPersisteNiEntrega() {
        doThrow(new org.springframework.security.access.AccessDeniedException("denied"))
                .when(ownershipService).requireCanChatWith(any(), eq(destinatarioId));
        assertThrows(org.springframework.security.access.AccessDeniedException.class,
                () -> chatController.processMessage(mensajeFake, principal(remitenteId, Role.CLIENTE)));
        verify(mensajeDAO, never()).save(any());
        verifyNoInteractions(messagingTemplate);
    }

    private java.security.Principal principal(UUID id, Role role) {
        return new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                new AuthenticatedUser(id, "test@local", role), null, List.of());
    }
}
