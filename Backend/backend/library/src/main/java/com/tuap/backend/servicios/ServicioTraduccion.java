package com.tuap.backend.servicios;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ServicioTraduccion {

    @Value("${google.translate.api.key:}")
    private String googleApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String traducirTexto(String texto, String source, String target) {
        if (texto == null || texto.isBlank()) {
            return texto;
        }

        // Si no hay API key, no intenta traducir y devuelve el original
        if (googleApiKey == null || googleApiKey.isBlank()) {
            return texto;
        }

        try {
            String url = "https://translation.googleapis.com/language/translate/v2"
                    + "?key=" + URLEncoder.encode(googleApiKey, StandardCharsets.UTF_8)
                    + "&q=" + URLEncoder.encode(texto, StandardCharsets.UTF_8)
                    + "&source=" + URLEncoder.encode(source, StandardCharsets.UTF_8)
                    + "&target=" + URLEncoder.encode(target, StandardCharsets.UTF_8)
                    + "&format=text";

            Map<String, Object> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            ).getBody();

            if (response == null || !response.containsKey("data")) {
                return texto;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) response.get("data");

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> translations = (List<Map<String, Object>>) data.get("translations");

            if (translations == null || translations.isEmpty()) {
                return texto;
            }

            Object translatedText = translations.get(0).get("translatedText");
            return translatedText != null ? translatedText.toString() : texto;

        } catch (Exception e) {
            System.out.println("Error traduciendo texto: " + texto + " -> " + e.getMessage());
            return texto;
        }
    }
}