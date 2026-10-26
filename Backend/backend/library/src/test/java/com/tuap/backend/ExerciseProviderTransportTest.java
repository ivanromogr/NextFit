package com.tuap.backend;

import com.sun.net.httpserver.HttpServer;
import com.tuap.backend.util.ExerciseProviderHttp;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClientException;

import java.net.InetSocketAddress;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class ExerciseProviderTransportTest {
    private static final String KEY = "fictional-transport-key";
    private static HttpHeaders headers() {
        HttpHeaders headers = new HttpHeaders(); headers.set("X-RapidAPI-Key", KEY); return headers;
    }
    private static String url(HttpServer server, String path) {
        return "http://127.0.0.1:" + server.getAddress().getPort() + path;
    }

    @Test void redirectsDoNotForwardTheProviderCredential() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        AtomicInteger destinationCalls = new AtomicInteger();
        server.createContext("/origin", exchange -> {
            exchange.getResponseHeaders().set("Location", url(server, "/destination"));
            exchange.sendResponseHeaders(302, -1); exchange.close();
        });
        server.createContext("/destination", exchange -> {
            destinationCalls.incrementAndGet(); exchange.sendResponseHeaders(200, -1); exchange.close();
        });
        server.start();
        try {
            assertThrows(RestClientException.class, () -> ExerciseProviderHttp.image(ExerciseProviderHttp.client(), url(server, "/origin"), headers()));
            assertEquals(0, destinationCalls.get());
        } finally { server.stop(0); }
    }

    @Test void imageBytesAndActualMimeArePreserved() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        byte[] image = { (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10 };
        server.createContext("/image", exchange -> {
            assertEquals(KEY, exchange.getRequestHeaders().getFirst("X-RapidAPI-Key"));
            exchange.getResponseHeaders().set("Content-Type", "image/png");
            exchange.sendResponseHeaders(200, image.length);
            try (var body = exchange.getResponseBody()) { body.write(image); }
        });
        server.start();
        try {
            var response = ExerciseProviderHttp.image(ExerciseProviderHttp.client(), url(server, "/image"), headers());
            assertEquals("image/png", response.getHeaders().getContentType().toString());
            assertArrayEquals(image, response.getBody());
        } finally { server.stop(0); }
    }

    @Test void htmlErrorBodiesAreNotPassedToTheClient() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/image", exchange -> {
            byte[] body = ("<html>provider echoed " + KEY + "</html>").getBytes();
            exchange.getResponseHeaders().set("Content-Type", "text/html");
            exchange.sendResponseHeaders(200, body.length);
            try (var stream = exchange.getResponseBody()) { stream.write(body); }
        });
        server.start();
        try {
            var error = assertThrows(RestClientException.class, () -> ExerciseProviderHttp.image(ExerciseProviderHttp.client(), url(server, "/image"), headers()));
            assertFalse(error.toString().contains(KEY));
        } finally { server.stop(0); }
    }

    @Test void oversizedImagesAreRejected() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/image", exchange -> {
            byte[] body = new byte[5 * 1024 * 1024 + 1];
            exchange.getResponseHeaders().set("Content-Type", "image/gif");
            exchange.sendResponseHeaders(200, body.length);
            try (var stream = exchange.getResponseBody()) { stream.write(body); }
        });
        server.start();
        try {
            assertThrows(RestClientException.class, () -> ExerciseProviderHttp.image(ExerciseProviderHttp.client(), url(server, "/image"), headers()));
        } finally { server.stop(0); }
    }
}
