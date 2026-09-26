package com.tuap.backend.auth;

import java.util.Locale;

/** Canonical application roles used by the authentication boundary. */
public enum Role {
    CLIENTE,
    ENTRENADOR;

    public String toAuthority() {
        return "ROLE_" + name();
    }

    public static Role fromStoredValue(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("El rol no puede estar vacío");
        }

        return switch (value.trim().toUpperCase(Locale.ROOT)) {
            case "CLIENTE", "ROLE_CLIENTE" -> CLIENTE;
            case "ENTRENADOR", "ROLE_ENTRENADOR" -> ENTRENADOR;
            default -> throw new IllegalArgumentException("Rol no soportado");
        };
    }
}
