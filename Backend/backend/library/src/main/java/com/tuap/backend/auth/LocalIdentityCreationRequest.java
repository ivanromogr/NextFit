package com.tuap.backend.auth;
public record LocalIdentityCreationRequest(String reauthToken, String password) {}
