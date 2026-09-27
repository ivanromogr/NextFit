package com.tuap.backend.auth;

public record ChangeEmailRequest(String currentPassword, String newEmail) { }
