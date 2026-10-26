package com.tuap.backend.util;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Media serialization boundary: provider credentials must never reach clients. */
public final class ExerciseMediaUrls {
    private static final Pattern ID = Pattern.compile("[A-Za-z0-9_-]{1,80}");
    private static final Set<String> CREDENTIAL_KEYS = Set.of(
            "rapidapikey", "xrapidapikey", "apikey", "accesstoken", "token", "password", "secret");

    private ExerciseMediaUrls() {}

    public static boolean validId(String value) {
        return value != null && ID.matcher(value).matches();
    }

    public static String proxyPath(String apiId) {
        if (!validId(apiId)) throw new IllegalArgumentException("Invalid exercise identifier");
        return "/api/ejercicios/imagen/" + apiId;
    }

    public static String forClient(String apiId, String value) {
        if (value == null || value.isBlank()) return value;
        try {
            URI uri = URI.create(value.replace(" ", "%20"));
            if (uri.getRawUserInfo() != null) return null;
            Map<String, String> query = query(uri.getRawQuery());
            if ("exercisedb.p.rapidapi.com".equalsIgnoreCase(uri.getHost())
                    && "/image".equals(uri.getPath())) {
                String id = validId(apiId) ? apiId : query.get("exerciseId");
                return validId(id) ? proxyPath(id) : null;
            }
            for (String key : query.keySet()) {
                String normalized = key.toLowerCase(Locale.ROOT).replace("-", "").replace("_", "");
                if (CREDENTIAL_KEYS.contains(normalized)) return null;
            }
            return value;
        } catch (IllegalArgumentException invalidUrl) {
            return null;
        }
    }

    private static Map<String, String> query(String value) {
        Map<String, String> result = new LinkedHashMap<>();
        if (value == null) return result;
        for (String part : value.split("&")) {
            String[] pair = part.split("=", 2);
            String key = URLDecoder.decode(pair[0], StandardCharsets.UTF_8);
            String text = pair.length == 2 ? URLDecoder.decode(pair[1], StandardCharsets.UTF_8) : "";
            result.putIfAbsent(key, text);
        }
        return result;
    }
}
