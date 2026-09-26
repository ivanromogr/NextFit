package com.tuap.backend.auth;

/** JSON contract for the future token login endpoint. */
public record LoginRequest(String email, String password) {
    public boolean hasCredentials() {
        return email != null && !email.isBlank() && password != null && !password.isBlank();
    }
}
