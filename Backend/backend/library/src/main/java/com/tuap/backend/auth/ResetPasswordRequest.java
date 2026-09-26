package com.tuap.backend.auth;
public record ResetPasswordRequest(String token, String newPassword) { }
