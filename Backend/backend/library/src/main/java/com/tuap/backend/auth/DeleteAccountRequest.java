package com.tuap.backend.auth;
public record DeleteAccountRequest(String currentPassword, AuthProvider provider, String credential,
        String identityToken, String nonce) {
    public DeleteAccountRequest(String currentPassword) { this(currentPassword, null, null, null, null); }
}
