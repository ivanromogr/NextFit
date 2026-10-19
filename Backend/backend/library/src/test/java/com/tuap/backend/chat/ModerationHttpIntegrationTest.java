package com.tuap.backend.chat;

import java.util.*;
import java.util.concurrent.*;
import com.tuap.backend.auth.*;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = "app.cleanup.enabled=false")
class ModerationHttpIntegrationTest {
    @Autowired TestRestTemplate http;
    @Autowired JwtService jwt;
    @Autowired ClienteDAO clients;
    @Autowired MensajeDAO messages;
    @Autowired ChatReportRepository reports;
    @Autowired ModerationOperatorRepository operators;
    @Autowired ModerationAuditRepository audit;
    @Autowired ChatSafetyService safety;
    @Autowired com.tuap.backend.servicios.FileStorageService storage;
    @Autowired UploadedFileDAO uploads;

    private Cliente client(String name) {
        return clients.saveAndFlush(new Cliente(name, "Test", UUID.randomUUID()+"@test.local", null, "CLIENTE", 0, 0, 0, "", "", ""));
    }
    private String token(Cliente client) {
        return jwt.generateAccessToken(new AuthenticatedUser(client.getId(), client.getEmail(), Role.CLIENTE));
    }
    private ResponseEntity<Map> request(HttpMethod method, String path, String token, Object body) {
        HttpHeaders headers = new HttpHeaders(); headers.setBearerAuth(token); headers.setContentType(MediaType.APPLICATION_JSON);
        return http.exchange(path, method, new HttpEntity<>(body, headers), Map.class);
    }
    @Test void authorizationAuditedDecisionsAndConcurrentReviewsUseRealHttp() throws Exception {
        Cliente normal = client("Reporter"), target = client("Reported"), first = client("Operator one"), second = client("Operator two");
        String normalToken = token(normal), firstToken = token(first), secondToken = token(second);
        Mensaje message = messages.saveAndFlush(new Mensaje(target.getId(), normal.getId(), "Reported message"));
        reports.saveAndFlush(new ChatReport(normal.getId(), message.getId(), target.getId(), ChatReport.Reason.SPAM));
        String path = "/api/moderation/reports/"+normal.getId()+"/"+message.getId();
        assertEquals(401, http.getForEntity("/api/moderation/access", String.class).getStatusCode().value());
        assertEquals(false, request(HttpMethod.GET, "/api/moderation/access", normalToken, null).getBody().get("allowed"));
        assertEquals(403, request(HttpMethod.GET, path, normalToken, null).getStatusCode().value());
        assertEquals(403, request(HttpMethod.POST, path+"/decisions", normalToken, Map.of("action", "DISMISS", "note", "Not authorized", "expectedVersion", 0)).getStatusCode().value());
        operators.saveAndFlush(new ModerationOperator(first.getId(), Role.CLIENTE));
        operators.saveAndFlush(new ModerationOperator(second.getId(), Role.CLIENTE));
        var queue = request(HttpMethod.GET, "/api/moderation/reports?size=20", firstToken, null);
        assertEquals(200, queue.getStatusCode().value()); assertEquals("no-store", queue.getHeaders().getCacheControl());
        assertEquals(400, request(HttpMethod.GET, "/api/moderation/reports?size=500", firstToken, null).getStatusCode().value());
        assertEquals(400, request(HttpMethod.GET, "/api/moderation/reports?status=INVALID", firstToken, null).getStatusCode().value());
        assertEquals(400, request(HttpMethod.POST, path+"/decisions", firstToken, Map.of("action", "INVALID", "note", "Bad action", "expectedVersion", 0)).getStatusCode().value());
        assertEquals(400, request(HttpMethod.POST, path+"/decisions", firstToken, Map.of("action", "CONFIRM", "note", " ", "expectedVersion", 0)).getStatusCode().value());
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            CountDownLatch ready = new CountDownLatch(2), go = new CountDownLatch(1);
            Callable<Integer> decideFirst = () -> { ready.countDown(); go.await(5, TimeUnit.SECONDS); return request(HttpMethod.POST, path+"/decisions", firstToken, Map.of("action", "CONFIRM", "note", "First reviewer decision", "expectedVersion", 0)).getStatusCode().value(); };
            Callable<Integer> decideSecond = () -> { ready.countDown(); go.await(5, TimeUnit.SECONDS); return request(HttpMethod.POST, path+"/decisions", secondToken, Map.of("action", "DISMISS", "note", "Second reviewer decision", "expectedVersion", 0)).getStatusCode().value(); };
            Future<Integer> a = pool.submit(decideFirst), b = pool.submit(decideSecond);
            assertTrue(ready.await(5, TimeUnit.SECONDS)); go.countDown();
            List<Integer> results = new ArrayList<>(List.of(a.get(10, TimeUnit.SECONDS), b.get(10, TimeUnit.SECONDS))); Collections.sort(results);
            assertEquals(List.of(200, 409), results);
        } finally { pool.shutdownNow(); }
        assertEquals(1, audit.findByReporterIdAndMessageIdOrderByCreatedAtAscIdAsc(normal.getId(), message.getId()).size());
        Mensaje next = messages.saveAndFlush(new Mensaje(target.getId(), normal.getId(), "Second reported message"));
        reports.saveAndFlush(new ChatReport(normal.getId(), next.getId(), target.getId(), ChatReport.Reason.HARASSMENT));
        String nextPath = "/api/moderation/reports/"+normal.getId()+"/"+next.getId();
        var restricted = request(HttpMethod.POST, nextPath+"/decisions", firstToken, Map.of("action", "RESTRICT_CHAT", "note", "Harassment evidence reviewed", "expectedVersion", 0, "operatorId", normal.getId()));
        assertEquals(200, restricted.getStatusCode().value());
        assertEquals(true, restricted.getBody().get("restricted"));
        assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> safety.requireCanSend(target.getId(), normal.getId()));
        var decisionAudit = audit.findByReporterIdAndMessageIdOrderByCreatedAtAscIdAsc(normal.getId(), next.getId());
        assertEquals(first.getId(), decisionAudit.getFirst().getOperatorId());
        var lifted = request(HttpMethod.POST, nextPath+"/decisions", firstToken, Map.of("action", "LIFT_RESTRICTION", "note", "Restriction reviewed and lifted", "expectedVersion", restricted.getBody().get("version")));
        assertEquals(200, lifted.getStatusCode().value()); assertEquals(false, lifted.getBody().get("restricted"));
        assertDoesNotThrow(() -> safety.requireCanSend(target.getId(), normal.getId()));
        operators.deleteById(new ModerationOperator.Key(first.getId(), Role.CLIENTE)); operators.flush();
        assertEquals(403, request(HttpMethod.GET, nextPath, firstToken, null).getStatusCode().value());
        assertEquals(false, request(HttpMethod.GET, "/api/moderation/access", firstToken, null).getBody().get("allowed"));
    }
    @Test void reportedAttachmentIsAvailableOnlyThroughAnAuthorizedScopedRoute() throws Exception {
        Cliente normal = client("Normal"), operator = client("Operator"), target = client("Sender");
        operators.saveAndFlush(new ModerationOperator(operator.getId(), Role.CLIENTE));
        byte[] png = Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jLzQAAAAASUVORK5CYII=");
        var stored = storage.store(new org.springframework.mock.web.MockMultipartFile("file", "image.png", "image/png", png), UploadPurpose.CHAT_ATTACHMENT);
        try {
            var file = uploads.saveAndFlush(new UploadedFile(target.getId(), Role.CLIENTE, UploadPurpose.CHAT_ATTACHMENT, UploadVisibility.PRIVATE,
                    stored.storageKey(), "image.png", "image/png", png.length));
            var message = new Mensaje(target.getId(), normal.getId(), "Image report"); message.setAttachmentId(file.getId());
            message = messages.saveAndFlush(message);
            reports.saveAndFlush(new ChatReport(normal.getId(), message.getId(), target.getId(), ChatReport.Reason.INAPPROPRIATE));
            String path = "/api/moderation/reports/"+normal.getId()+"/"+message.getId()+"/attachment";
            assertEquals(403, request(HttpMethod.GET, path, token(normal), null).getStatusCode().value());
            HttpHeaders headers = new HttpHeaders(); headers.setBearerAuth(token(operator));
            var image = http.exchange(path, HttpMethod.GET, new HttpEntity<>(headers), byte[].class);
            assertEquals(200, image.getStatusCode().value()); assertArrayEquals(png, image.getBody());
            assertEquals(MediaType.IMAGE_PNG, image.getHeaders().getContentType()); assertEquals("no-store", image.getHeaders().getCacheControl());
            // The entitlement does not give general access to arbitrary private uploads.
            assertEquals(403, request(HttpMethod.GET, "/api/upload/files/"+file.getId(), token(operator), null).getStatusCode().value());
            assertEquals(404, request(HttpMethod.GET, "/api/moderation/reports/"+normal.getId()+"/"+UUID.randomUUID()+"/attachment", token(operator), null).getStatusCode().value());
        } finally { storage.delete(stored.storageKey()); }
    }

}
