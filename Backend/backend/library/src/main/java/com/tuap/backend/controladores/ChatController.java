package com.tuap.backend.controladores;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.security.Principal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Mensaje;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.MensajeDAO;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.OwnershipService;
import com.tuap.backend.servicios.ChatAttachmentAccessService;

@RestController
public class ChatController {

    private static final String USER_QUEUE = "/queue/mensajes";

    private final SimpMessagingTemplate messagingTemplate;
    private final MensajeDAO mensajeDAO;
    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;
    private final OwnershipService ownershipService;
    private final ChatAttachmentAccessService chatAttachmentAccessService;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MensajeDAO mensajeDAO,
                          ClienteDAO clienteDAO,
                          EntrenadorDAO entrenadorDAO,
                          OwnershipService ownershipService,
                          ChatAttachmentAccessService chatAttachmentAccessService) {
        this.messagingTemplate = messagingTemplate;
        this.mensajeDAO = mensajeDAO;
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
        this.ownershipService = ownershipService;
        this.chatAttachmentAccessService = chatAttachmentAccessService;
    }

    // Enviar mensaje (WebSocket)
    @MessageMapping("/chat")
    public void processMessage(@Payload Mensaje mensaje, Principal principal) {
        AuthenticatedUser user = authenticatedUser(principal);
        if (mensaje.getRemitenteId() != null && !mensaje.getRemitenteId().equals(user.userId())) deny();
        ownershipService.requireCanChatWith(user, mensaje.getDestinatarioId());
        if (mensaje.getAttachmentId() != null) {
            chatAttachmentAccessService.validateForMessage(mensaje.getAttachmentId(), user);
        }
        // A legacy URL is never treated as an attachment authority.
        mensaje.setArchivoUrl(null);
        mensaje.setRemitenteId(user.userId());
        mensaje.setFechaHora(LocalDateTime.now());
        mensaje.setLeido(false);
        Mensaje guardado = mensajeDAO.save(mensaje);
        messagingTemplate.convertAndSendToUser(user.userId().toString(), USER_QUEUE, guardado);
        messagingTemplate.convertAndSendToUser(mensaje.getDestinatarioId().toString(), USER_QUEUE, guardado);
    }

    // Marcar mensajes como leídos (WebSocket)
    @MessageMapping("/chat/leer")
    @Transactional
    public void marcarComoLeido(@Payload Map<String, String> payload, Principal principal) {
        AuthenticatedUser user = authenticatedUser(principal);
        UUID remitenteId = UUID.fromString(payload.get("remitenteId"));
        if (payload.containsKey("destinatarioId") && !user.userId().toString().equals(payload.get("destinatarioId"))) deny();
        ownershipService.requireCanChatWith(user, remitenteId);

        List<Mensaje> noLeidos = mensajeDAO.findByRemitenteIdAndDestinatarioIdAndLeidoFalse(remitenteId, user.userId());

        if (!noLeidos.isEmpty()) {
            for (Mensaje m : noLeidos) {
                m.setLeido(true);
            }
            mensajeDAO.saveAll(noLeidos);

            for (Mensaje m : noLeidos) {
                messagingTemplate.convertAndSendToUser(remitenteId.toString(), USER_QUEUE, m);
                messagingTemplate.convertAndSendToUser(user.userId().toString(), USER_QUEUE, m);
            }
        }
    }

    // Obtener historial de chat (REST)
    @GetMapping("/api/chat/historial")
    public ResponseEntity<List<Mensaje>> getHistorial(
            @RequestParam(required = false) UUID usuario1,
            @RequestParam(required = false) UUID usuario2,
            @RequestParam(required = false) UUID otroUsuarioId,
            @AuthenticationPrincipal AuthenticatedUser user) {
        UUID other = otroUsuarioId != null ? otroUsuarioId : otherParticipant(usuario1, usuario2, user);
        try { ownershipService.requireCanChatWith(user, other); }
        catch (AccessDeniedException denied) {
            // A detached/deleted participant may retain only an already persisted history.
            if (!mensajeDAO.existsHistoryBetween(user.userId(), other)) throw denied;
        }
        return ResponseEntity.ok(mensajeDAO.findChatHistory(user.userId(), other));
    }

    /**
     * Obtener la lista de personas con las que el usuario ha hablado.
     */
    @GetMapping("/api/chat/contactos") 
    public ResponseEntity<List<Map<String, Object>>> obtenerContactosDeUsuario(
            @RequestParam(required = false) UUID usuarioId, @AuthenticationPrincipal AuthenticatedUser user) {
        try {
            List<Map<String, Object>> contactos = new ArrayList<>();
            if (usuarioId != null && !usuarioId.equals(user.userId())) deny();
            if (user.role() == com.tuap.backend.auth.Role.CLIENTE) {
                clienteDAO.findById(user.userId()).map(Cliente::getEntrenador)
                        .map(this::serializarEntrenadorContacto).ifPresent(contactos::add);
            } else if (user.role() == com.tuap.backend.auth.Role.ENTRENADOR) {
                clienteDAO.findByEntrenadorId(user.userId()).stream()
                        .map(this::serializarClienteContacto).forEach(contactos::add);
            }

            return ResponseEntity.ok(contactos);
        } catch (AccessDeniedException e) {
            throw e;
        } catch (Exception e) {
            // Se mantiene el log del error pero se elimina la traza completa en la respuesta por seguridad
            return ResponseEntity.internalServerError().build();
        }
    }

    private AuthenticatedUser authenticatedUser(Principal principal) {
        if (principal instanceof Authentication authentication && authentication.getPrincipal() instanceof AuthenticatedUser user) return user;
        throw new AccessDeniedException("No tienes permisos para realizar esta acción");
    }

    private UUID otherParticipant(UUID usuario1, UUID usuario2, AuthenticatedUser user) {
        if (usuario1 == null || usuario2 == null) deny();
        if (user.userId().equals(usuario1)) return usuario2;
        if (user.userId().equals(usuario2)) return usuario1;
        deny();
        return null;
    }

    private void deny() { throw new AccessDeniedException("No tienes permisos para realizar esta acción"); }

    private Map<String, Object> serializarClienteContacto(Cliente cliente) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", cliente.getId());
        data.put("nombre", cliente.getNombre());
        data.put("apellido", cliente.getApellido());
        data.put("email", cliente.getEmail());
        data.put("fotoPerfil", cliente.getFotoPerfil());
        data.put("rol", cliente.getRol());
        data.put("tipoContacto", "CLIENTE");
        return data;
    }

    private Map<String, Object> serializarEntrenadorContacto(Entrenador entrenador) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", entrenador.getId());
        data.put("nombre", entrenador.getNombre());
        data.put("apellido", entrenador.getApellido());
        data.put("email", entrenador.getEmail());
        data.put("fotoPerfil", entrenador.getFotoPerfil());
        data.put("rol", entrenador.getRol());
        data.put("tipoContacto", "ENTRENADOR");
        return data;
    }
}
