package com.tuap.backend.auth;
public record AppleAuthRequest(String identityToken, String nonce) {}
