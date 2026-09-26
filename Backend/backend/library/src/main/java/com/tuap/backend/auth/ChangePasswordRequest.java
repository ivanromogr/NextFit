package com.tuap.backend.auth;
public record ChangePasswordRequest(String currentPassword, String newPassword) { }
