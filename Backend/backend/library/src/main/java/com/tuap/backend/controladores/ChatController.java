package com.tuap.backend.controladores;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RestController; // 🧹 Cambiado
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Mensaje;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.MensajeDAO;

@RestController // 🧹 SOLUCIÓN SONARQUBE: RestController en lugar de Controller + ResponseBody
public class ChatController {

    private static final String TOPIC_MENSAJES = "/topic/mensajes/";

    // 🧹 SOLUCIÓN SONARQUBE: Campos final para inyección por constructor
    private final SimpMessagingTemplate messagingTemplate;
    private final MensajeDAO mensajeDAO;
    private final ClienteDAO clienteDAO;

    // 🧹 SOLUCIÓN SONARQUBE: Inyección por constructor
    public ChatController(SimpMessagingTemplate messagingTemplate,
                          MensajeDAO mensajeDAO,
                          ClienteDAO clienteDAO) {
        this.messagingTemplate = messagingTemplate;
        this.mensajeDAO = mensajeDAO;
        this.clienteDAO = clienteDAO;
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
    public ResponseEntity<List<Cliente>> obtenerContactosDeUsuario(@RequestParam UUID usuarioId) {
        try {
            List<UUID> contactosIds = mensajeDAO.findContactosIds(usuarioId);
            
            if (contactosIds == null || contactosIds.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            
            List<Cliente> contactos = clienteDAO.findAllById(contactosIds);
            return ResponseEntity.ok(contactos);
        } catch (Exception e) {
            // Se mantiene el log del error pero se elimina la traza completa en la respuesta por seguridad
            return ResponseEntity.internalServerError().build();
        }
    }
}