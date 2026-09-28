package com.tuap.backend.auth;

/** Role is accepted only for a future onboarding flow and never changes a linked account. */
public record GoogleAuthRequest(String credential, Role role) { }
