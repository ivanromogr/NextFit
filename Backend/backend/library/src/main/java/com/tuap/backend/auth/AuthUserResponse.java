package com.tuap.backend.auth;

import java.util.UUID;

/** Safe identity returned by authentication endpoints. */
public record AuthUserResponse(UUID id, String email, Role role) {
    public static AuthUserResponse from(AuthenticatedUser user) {
        return new AuthUserResponse(user.userId(), user.email(), user.role());
    }
}
