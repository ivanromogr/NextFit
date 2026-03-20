package com.tuap.backend.controladores;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Mensaje;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.MensajeDAO;

@Controller
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MensajeDAO mensajeDAO;

    @Autowired
    private ClienteDAO clienteDAO;

    // Enviar mensaje
    @MessageMapping("/chat")
    public void processMessage(@Payload Mensaje mensaje) {
        mensaje.setFechaHora(LocalDateTime.now());
        mensaje.setLeido(false);
        Mensaje guardado = mensajeDAO.save(mensaje);

        messagingTemplate.convertAndSend("/topic/mensajes/" + mensaje.getRemitenteId(), guardado);
        messagingTemplate.convertAndSend("/topic/mensajes/" + mensaje.getDestinatarioId(), guardado);
    }

    //  Marcar mensajes como leídos
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
                messagingTemplate.convertAndSend("/topic/mensajes/" + remitenteId, m);
            }
        }
    }

    // Obtener historial de chat
    @GetMapping("/api/chat/historial")
    @ResponseBody
    public ResponseEntity<List<Mensaje>> getHistorial(
            @RequestParam UUID usuario1, 
            @RequestParam UUID usuario2) {
        return ResponseEntity.ok(mensajeDAO.findChatHistory(usuario1, usuario2));
    }

    /**
     
     * Obtener la lista de personas con las que el usuario ha hablado.
     */
    @GetMapping("/api/chat/contactos") 
    @ResponseBody
    public ResponseEntity<List<Cliente>> obtenerContactosDeUsuario(@RequestParam UUID usuarioId) {
        try {
            // 1. Obtenemos directamente los UUIDs 
            List<UUID> contactosIds = mensajeDAO.findContactosIds(usuarioId);
            
            if (contactosIds == null || contactosIds.isEmpty()) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            
            // 2. Buscamos los perfiles de los clientes de una sola vez
            List<Cliente> contactos = clienteDAO.findAllById(contactosIds);
            
            return ResponseEntity.ok(contactos);
        } catch (Exception e) {
            // Imprime el error exacto en la consola de tu servidor si algo falla
            e.printStackTrace(); 
            return ResponseEntity.status(500).build();
        }
    }
}