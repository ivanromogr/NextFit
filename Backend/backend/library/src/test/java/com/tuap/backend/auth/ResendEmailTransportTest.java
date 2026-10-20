package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import com.tuap.backend.config.EmailProperties;
import java.net.InetSocketAddress;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

class ResendEmailTransportTest {
    private HttpServer server;
    private EmailProperties properties;
    @BeforeEach void setup() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        properties = new EmailProperties();
        properties.setFrom("NextFit <fixture@example.invalid>");
        properties.setResendApiKey("fixture-provider-key");
    }
    @AfterEach void stop() { server.stop(0); }
    private ResendEmailService service(Duration timeout) {
        server.start();
        return new ResendEmailService(RestClient.builder()
            .baseUrl("http://127.0.0.1:" + server.getAddress().getPort())
            .requestFactory(ResendEmailService.transport(timeout)).build(), properties);
    }
    @Test void sendsActualHttpJsonAndAcceptsProviderAcknowledgement() {
        var captured = new AtomicReference<Map<?, ?>>();
        var authorization = new AtomicReference<String>();
        server.createContext("/emails", exchange -> {
            assertEquals("POST", exchange.getRequestMethod());
            assertTrue(exchange.getRequestHeaders().getFirst("Content-Type").startsWith("application/json"));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            captured.set(new ObjectMapper().readValue(exchange.getRequestBody(), Map.class));
            exchange.sendResponseHeaders(202, -1); exchange.close();
        });
        service(Duration.ofSeconds(3)).send("target@example.invalid", "Fixture subject", "<p>fixture-token</p>");
        assertEquals("Bearer fixture-provider-key", authorization.get());
        assertEquals("NextFit <fixture@example.invalid>", captured.get().get("from"));
        assertEquals(java.util.List.of("target@example.invalid"), captured.get().get("to"));
        assertEquals("Fixture subject", captured.get().get("subject"));
        assertEquals("<p>fixture-token</p>", captured.get().get("html"));
    }
    private void rejectsProviderFailure(int status) {
        var requests = new AtomicInteger();
        server.createContext("/emails", exchange -> {
            requests.incrementAndGet(); exchange.getRequestBody().readAllBytes();
            byte[] body = "fixture-provider-key fixture-token private provider response".getBytes();
            exchange.sendResponseHeaders(status, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        var error = assertThrows(EmailDeliveryException.class, () ->
            service(Duration.ofSeconds(3)).send("target@example.invalid", "Fixture", "fixture-token"));
        assertEquals("Email delivery failed", error.getMessage());
        assertNull(error.getCause());
        assertEquals(1, requests.get(), "Provider failures must not automatically duplicate delivery");
    }
    @Test void rateLimitFailureIsSanitizedAndNotRetried() { rejectsProviderFailure(429); }
    @Test void providerOutageIsSanitizedAndNotRetried() { rejectsProviderFailure(503); }
    @Test void redirectIsNeitherFollowedNorReportedAsDelivery() {
        var redirected = new AtomicInteger();
        server.createContext("/emails", exchange -> {
            exchange.getRequestBody().readAllBytes();
            exchange.getResponseHeaders().set("Location", "/other");
            exchange.sendResponseHeaders(302, -1); exchange.close();
        });
        server.createContext("/other", exchange -> {
            redirected.incrementAndGet(); exchange.sendResponseHeaders(200, -1); exchange.close();
        });
        var sender = service(Duration.ofSeconds(3));
        assertThrows(EmailDeliveryException.class, () -> sender.send("target@example.invalid", "Fixture", "fixture-token"));
        assertEquals(0, redirected.get());
    }
    @Test void stalledProviderHasABoundedReadTimeout() {
        var release = new CountDownLatch(1);
        server.createContext("/emails", exchange -> {
            try { release.await(5, TimeUnit.SECONDS); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); }
            finally { exchange.close(); }
        });
        var sender = service(Duration.ofMillis(150));
        long start = System.nanoTime();
        try {
            assertThrows(EmailDeliveryException.class, () -> sender.send("target@example.invalid", "Fixture", "fixture-token"));
            assertTrue(Duration.ofNanos(System.nanoTime() - start).compareTo(Duration.ofSeconds(5)) < 0);
        } finally { release.countDown(); }
    }
}
