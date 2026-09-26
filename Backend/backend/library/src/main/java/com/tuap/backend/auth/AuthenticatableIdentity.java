package com.tuap.backend.auth;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

/** Internal-only authentication material. It must never be returned by an API or JWT. */
public record AuthenticatableIdentity(UUID userId, String email, Role role, @JsonIgnore String passwordHash) {

    public AuthenticatableIdentity {
        new AuthenticatedUser(userId, email, role);
        if (passwordHash == null || passwordHash.isBlank()) {
            throw new IllegalArgumentException("El hash de contraseña es obligatorio");
        }
    }

    public AuthenticatedUser authenticatedUser() {
        return new AuthenticatedUser(userId, email, role);
    }
}
