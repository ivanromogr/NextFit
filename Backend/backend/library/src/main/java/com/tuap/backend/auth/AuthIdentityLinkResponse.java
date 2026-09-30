package com.tuap.backend.auth;

/** Deliberately excludes identity subjects, ownership, email and credentials. */
public record AuthIdentityLinkResponse(AuthProvider provider, Status status) {
    public enum Status { LINKED, ALREADY_LINKED }
}
