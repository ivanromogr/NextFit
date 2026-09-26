package com.tuap.backend.auth;

import java.util.UUID;

/** Minimal authenticated identity; safe to use as a future JWT principal. */
public record AuthenticatedUser(UUID userId, String email, Role role) {

    public AuthenticatedUser {
        if (userId == null) {
            throw new IllegalArgumentException("El identificador de usuario es obligatorio");
        }
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("El email es obligatorio");
        }
        if (role == null) {
            throw new IllegalArgumentException("El rol es obligatorio");
        }
    }
}
