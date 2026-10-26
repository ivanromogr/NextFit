package com.tuap.backend.util;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.util.Set;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/** Bounded transport for the optional provider; construction makes no requests. */
public final class ExerciseProviderHttp {
    private static final int MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private static final Set<String> IMAGE_TYPES = Set.of("image/gif", "image/png", "image/jpeg", "image/webp");
    private ExerciseProviderHttp() {}

    public static RestTemplate client() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override protected void prepareConnection(HttpURLConnection connection, String method) throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(10000);
        return new RestTemplate(factory);
    }

    public static ResponseEntity<byte[]> image(RestTemplate client, String url, HttpHeaders headers) {
        return client.execute(url, HttpMethod.GET, request -> request.getHeaders().putAll(headers), response -> {
            var type = response.getHeaders().getContentType();
            String mime = type == null ? "" : type.getType() + "/" + type.getSubtype();
            if (!response.getStatusCode().is2xxSuccessful() || !IMAGE_TYPES.contains(mime)) {
                throw new IOException("Invalid provider image response");
            }
            byte[] bytes = response.getBody().readNBytes(MAX_IMAGE_BYTES + 1);
            if (bytes.length == 0 || bytes.length > MAX_IMAGE_BYTES) {
                throw new IOException("Invalid provider image size");
            }
            return ResponseEntity.ok().contentType(type).body(bytes);
        });
    }
}
