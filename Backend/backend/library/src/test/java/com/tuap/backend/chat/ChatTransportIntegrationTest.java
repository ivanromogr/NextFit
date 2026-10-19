package com.tuap.backend.chat;

import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.auth.*;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "app.cleanup.enabled=false")
class ChatTransportIntegrationTest {
    @LocalServerPort int port;
    @Autowired TestRestTemplate http;
    @Autowired JwtService jwt;
    @Autowired ClienteDAO clients;
    @Autowired EntrenadorDAO trainers;
    @Autowired MensajeDAO messages;
    @Autowired ChatReportRepository reports;
    @Autowired ObjectMapper json;
    @Autowired org.springframework.messaging.simp.user.SimpUserRegistry users;

    @Test void authenticatedNativeTransportAndRestEnforceBlockAndReport() throws Exception {
        String suffix = UUID.randomUUID().toString();
        Entrenador coach = trainers.saveAndFlush(new Entrenador("Coach", "Test", suffix+"@coach.test", null, "ENTRENADOR", "Fitness", 30, "", 1, "", "", "ONLINE", null));
        Cliente client = new Cliente("Client", "Test", suffix+"@client.test", null, "CLIENTE", 0, 0, 0, "", "", "");
        client.setEntrenador(coach); client = clients.saveAndFlush(client);
        UUID clientId = client.getId(), coachId = coach.getId();
        String clientToken = jwt.generateAccessToken(new AuthenticatedUser(clientId, client.getEmail(), Role.CLIENTE));
        String coachToken = jwt.generateAccessToken(new AuthenticatedUser(coachId, coach.getEmail(), Role.ENTRENADOR));
        String safetyPath = "/api/chat/safety/"+coachId;
        assertEquals(401, http.getForEntity(safetyPath, String.class).getStatusCode().value());
        assertEquals(200, request(HttpMethod.GET, safetyPath, clientToken, null).getStatusCode().value());

        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler(); scheduler.initialize();
        WebSocketStompClient socket = new WebSocketStompClient(new StandardWebSocketClient());
        socket.setMessageConverter(new org.springframework.messaging.converter.MappingJackson2MessageConverter()); socket.setTaskScheduler(scheduler);
        socket.start();
        StompSession a = null, b = null;
        try {
            a = connect(socket, clientToken); b = connect(socket, coachToken);
            BlockingQueue<JsonNode> inboxA = new LinkedBlockingQueue<>(), inboxB = new LinkedBlockingQueue<>();
            subscribe(a, inboxA, 1); subscribe(b, inboxB, 2);
            a.send("/app/chat", Map.of("destinatarioId", coachId, "contenido", "Transport test"));
            JsonNode echo = inboxA.poll(8, TimeUnit.SECONDS), delivered = inboxB.poll(8, TimeUnit.SECONDS);
            assertNotNull(echo); assertNotNull(delivered);
            UUID messageId = UUID.fromString(delivered.path("id").asText());
            assertEquals(clientId.toString(), delivered.path("remitenteId").asText());
            assertEquals("Transport test", delivered.path("contenido").asText());
            assertTrue(messages.findById(messageId).isPresent());

            assertEquals(202, request(HttpMethod.POST, "/api/chat/messages/"+messageId+"/reports", coachToken, Map.of("reason", "SPAM")).getStatusCode().value());
            assertTrue(reports.existsById(new ChatReport.Key(coachId, messageId)));
            assertEquals(403, request(HttpMethod.POST, "/api/chat/messages/"+messageId+"/reports", clientToken, Map.of("reason", "SPAM")).getStatusCode().value());
            assertEquals(400, request(HttpMethod.POST, "/api/chat/messages/"+messageId+"/reports", coachToken, Map.of("reason", "INVALID")).getStatusCode().value());
            assertEquals(200, request(HttpMethod.PUT, "/api/chat/blocks/"+coachId, clientToken, null).getStatusCode().value());
            long before = messages.count();
            a.send("/app/chat", Map.of("destinatarioId", coachId, "contenido", "Must not deliver"));
            JsonNode rejected = inboxA.poll(8, TimeUnit.SECONDS);
            assertNotNull(rejected); assertEquals("CHAT_ERROR", rejected.path("type").asText());
            assertEquals(before, messages.count());
            assertNull(inboxB.poll(250, TimeUnit.MILLISECONDS));
            assertEquals(200, request(HttpMethod.DELETE, "/api/chat/blocks/"+coachId, clientToken, null).getStatusCode().value());
            a.send("/app/chat", Map.of("destinatarioId", coachId, "contenido", "Allowed again"));
            assertEquals("Allowed again", inboxB.poll(8, TimeUnit.SECONDS).path("contenido").asText());
        } finally {
            if (a != null && a.isConnected()) a.disconnect();
            if (b != null && b.isConnected()) b.disconnect();
            socket.stop(); scheduler.shutdown();
        }
    }
    private ResponseEntity<String> request(HttpMethod method, String path, String token, Object body) {
        HttpHeaders headers = new HttpHeaders(); headers.setBearerAuth(token); headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange(path, method, new HttpEntity<>(body, headers), String.class);
    }
    private StompSession connect(WebSocketStompClient socket, String token) throws Exception {
        StompHeaders headers = new StompHeaders(); headers.set("Authorization", "Bearer "+token);
        return socket.connectAsync("ws://localhost:"+port+"/ws/websocket", new org.springframework.web.socket.WebSocketHttpHeaders(), headers, new StompSessionHandlerAdapter() {}).get(8, TimeUnit.SECONDS);
    }
    private void subscribe(StompSession session, BlockingQueue<JsonNode> inbox, int expected) throws Exception {
        session.subscribe("/user/queue/mensajes", new StompFrameHandler() {
            public Type getPayloadType(StompHeaders headers) { return Map.class; }
            public void handleFrame(StompHeaders headers, Object payload) {
                try { inbox.add(json.valueToTree(payload)); } catch (Exception e) { throw new IllegalStateException(e); }
            }
        });
        org.awaitility.Awaitility.await().atMost(8, TimeUnit.SECONDS).until(() -> users.findSubscriptions(sub -> sub.getDestination().equals("/user/queue/mensajes")).size() >= expected);
    }
}
