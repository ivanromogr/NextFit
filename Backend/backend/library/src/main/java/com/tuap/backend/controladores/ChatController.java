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

@RestController
public class ChatController {

    private static final String TOPIC_MENSAJES = "/topic/mensajes/";

    private final SimpMessagingTemplate messagingTemplate;
    private final MensajeDAO mensajeDAO;
    private final ClienteDAO clienteDAO;
    private final EntrenadorDAO entrenadorDAO;

    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MensajeDAO mensajeDAO,
                          ClienteDAO clienteDAO,
                          EntrenadorDAO entrenadorDAO) {
        this.messagingTemplate = messagingTemplate;
        this.mensajeDAO = mensajeDAO;
        this.clienteDAO = clienteDAO;
        this.entrenadorDAO = entrenadorDAO;
    }

    // Enviar mensaje (WebSocket)
    @MessageMapping("/chat")
    public void processMessage(@Payload Mensaje mensaje) {
        mensaje.setFechaHora(LocalDateTime.now());
        mensaje.setLeido(false);
        Mensaje guardado = mensajeDAO.save(mensaje);

        messagingTemplate.convertAndSend(TOPIC_MENSAJES + mensaje.getRemitenteId(), guardado);
        messagingTemplate.convertAndSend(TOPIC_MENSAJES + mensaje.getDestinatarioId(), guardado);
    }

    // Marcar mensajes como leídos (WebSocket)
    @MessageMapping("/chat/leer")
    @Transactional
    public void marcarComoLeido(@Payload Map<String, String> payload) {
        UUID remitenteId = UUID.fromString(payload.get("remitenteId"));
        UUID destinatarioId = UUID.fromString(payload.get("destinatarioId"));

        List<Mensaje> noLeidos = mensajeDAO.findByRemitenteIdAndDestinatarioIdAndLeidoFalse(remitenteId, destinatarioId);

        if (!noLeidos.isEmpty()) {
            for (Mensaje m : noLeidos) {
                m.setLeido(true);
            }
            mensajeDAO.saveAll(noLeidos);

            for (Mensaje m : noLeidos) {
                messagingTemplate.convertAndSend(TOPIC_MENSAJES + remitenteId, m);
            }
        }
    }

    // Obtener historial de chat (REST)
    @GetMapping("/api/chat/historial")
    public ResponseEntity<List<Mensaje>> getHistorial(
            @RequestParam UUID usuario1, 
            @RequestParam UUID usuario2) {
        return ResponseEntity.ok(mensajeDAO.findChatHistory(usuario1, usuario2));
    }

    /**
     * Obtener la lista de personas con las que el usuario ha hablado.
     */
    @GetMapping("/api/chat/contactos") 
    public ResponseEntity<List<Map<String, Object>>> obtenerContactosDeUsuario(@RequestParam UUID usuarioId) {
        try {
            List<UUID> contactosIds = mensajeDAO.findContactosIds(usuarioId);
            
            if (contactosIds == null || contactosIds.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<>());
            }

            List<Map<String, Object>> contactos = new ArrayList<>();
            for (UUID contactoId : contactosIds) {
                clienteDAO.findById(contactoId)
                        .map(this::serializarClienteContacto)
                        .ifPresent(contactos::add);

                if (contactos.stream().noneMatch(c -> contactoId.equals(c.get("id")))) {
                    entrenadorDAO.findById(contactoId)
                            .map(this::serializarEntrenadorContacto)
                            .ifPresent(contactos::add);
                }
            }

            return ResponseEntity.ok(contactos);
        } catch (Exception e) {
            // Se mantiene el log del error pero se elimina la traza completa en la respuesta por seguridad
            return ResponseEntity.internalServerError().build();
        }
    }

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
