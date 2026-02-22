package com.tuap.backend.controladores;

import java.time.LocalDateTime;
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

@Controller // Nota: Usamos @Controller para Websockets, pero mezclamos endpoints REST
public class ChatController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate; // Para enviar mensajes en tiempo real

    @Autowired
    private MensajeDAO mensajeDAO;

    // 👇 AÑADE LA INYECCIÓN DE TU REPOSITORIO DE CLIENTES 👇
    @Autowired
    private ClienteDAO clienteDAO;

   

    // 1. WEBSOCKET: Enviar mensaje
    // El cliente envía a: /app/chat
    @MessageMapping("/chat")
    public void processMessage(@Payload Mensaje mensaje) {
        
        // Guardar en Base de Datos
        mensaje.setFechaHora(LocalDateTime.now());
        mensaje.setLeido(false); // Por defecto entra como no leído
        Mensaje guardado = mensajeDAO.save(mensaje);

        // Enviar en Tiempo Real a los suscritos
        // Se envía a /topic/mensajes/{destinatarioId}
        messagingTemplate.convertAndSend(
            "/topic/mensajes/" + mensaje.getRemitenteId(), // Se lo devolvemos al que envía (confirmación)
            guardado
        );
        messagingTemplate.convertAndSend(
            "/topic/mensajes/" + mensaje.getDestinatarioId(), // Se lo enviamos al que recibe
            guardado
        );
    }

    // 👇 NUEVO WEBSOCKET: Marcar mensajes como leídos (Checks azules)
    @MessageMapping("/chat/leer")
    @Transactional // Importante para guardar la actualización masiva en BD
    public void marcarComoLeido(@Payload Map<String, String> payload) {
        UUID remitenteId = UUID.fromString(payload.get("remitenteId"));
        UUID destinatarioId = UUID.fromString(payload.get("destinatarioId"));

        // Buscamos los mensajes que nos han enviado y que aún están pendientes de leer
        List<Mensaje> noLeidos = mensajeDAO.findByRemitenteIdAndDestinatarioIdAndLeidoFalse(remitenteId, destinatarioId);

        if (!noLeidos.isEmpty()) {
            for (Mensaje m : noLeidos) {
                m.setLeido(true); // Cambiamos el estado a leído
            }
            
            // Guardamos la actualización en la base de datos
            mensajeDAO.saveAll(noLeidos);

            // Rebotamos los mensajes actualizados al remitente original para que su pantalla
            // detecte el "leido = true" y pinte los palitos azules
            for (Mensaje m : noLeidos) {
                messagingTemplate.convertAndSend("/topic/mensajes/" + remitenteId, m);
            }
        }
    }

    // 2. REST: Obtener historial de chat (Para cargar mensajes viejos)
    @GetMapping("/api/chat/historial")
    @ResponseBody // Necesario porque la clase es @Controller
    public ResponseEntity<List<Mensaje>> getHistorial(
            @RequestParam UUID usuario1, 
            @RequestParam UUID usuario2) {
        
        return ResponseEntity.ok(mensajeDAO.findChatHistory(usuario1, usuario2));
    }

    
    @GetMapping("/api/chat/contactos") 
    @ResponseBody
    public ResponseEntity<List<Cliente>> obtenerContactosDeUsuario(@RequestParam UUID usuarioId) {
        
        // 1. Sacamos la lista de IDs (con la consulta nueva que pusimos en MensajeDAO)
        List<UUID> contactosIds = mensajeDAO.findContactosIds(usuarioId);
        
        // 2. Buscamos a los clientes reales en la base de datos usando esos IDs
        List<Cliente> contactos = clienteDAO.findAllById(contactosIds);
        
        return ResponseEntity.ok(contactos);
    }

    
}

