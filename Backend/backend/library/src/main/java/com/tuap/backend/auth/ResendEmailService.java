package com.tuap.backend.auth;

import com.tuap.backend.config.EmailProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@ConditionalOnProperty(prefix = "app.email", name = "enabled", havingValue = "true")
public class ResendEmailService implements EmailService {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailService.class);
    private final RestClient client;
    private final EmailProperties properties;

    @Autowired
    public ResendEmailService(RestClient.Builder builder, EmailProperties properties) {
        this(builder.baseUrl("https://api.resend.com")
            .requestFactory(transport(Duration.ofSeconds(10))).build(), properties);
    }
    ResendEmailService(RestClient client, EmailProperties properties) {
        this.client = client;
        this.properties = properties;
    }
    static JdkClientHttpRequestFactory transport(Duration readTimeout) {
        var http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER).build();
        var factory = new JdkClientHttpRequestFactory(http);
        factory.setReadTimeout(readTimeout);
        return factory;
    }
    @Override
    public void send(String to, String subject, String html) {
        if (!"resend".equalsIgnoreCase(properties.getProvider())
            || properties.getResendApiKey() == null || properties.getResendApiKey().isBlank()
            || properties.getFrom() == null || properties.getFrom().isBlank()) {
            log.warn("email provider is not configured");
            // Recovery catches this boundary exception to preserve its neutral response.
            throw new EmailDeliveryException();
        }
        try {
            var response = client.post().uri("/emails")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.getResendApiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("from", properties.getFrom(), "to", List.of(to), "subject", subject, "html", html))
                .retrieve().toBodilessEntity();
            if (!response.getStatusCode().is2xxSuccessful()) throw new EmailDeliveryException();
        } catch (EmailDeliveryException error) {
            throw error;
        } catch (RuntimeException error) {
            log.warn("email send failed");
            throw new EmailDeliveryException();
        }
    }
}
