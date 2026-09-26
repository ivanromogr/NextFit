package com.tuap.backend.auth;

/** Stable, non-sensitive API error contract. */
public record ApiErrorResponse(int status, String code, String message) {
}
