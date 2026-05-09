package com.tuap.backend.controladores;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    @GetMapping("/")
    public Map<String, Object> root() {
        return Map.of(
                "status", "ok",
                "service", "NextFit Backend",
                "message", "API disponible",
                "health", "/actuator/health",
                "ejercicios", "/api/ejercicios",
                "timestamp", Instant.now().toString()
        );
    }

    @GetMapping("/api")
    public Map<String, Object> api() {
        return Map.of(
                "status", "ok",
                "service", "NextFit API",
                "ejercicios", "/api/ejercicios",
                "login", "/login",
                "registro", "/api/register"
        );
    }
}
