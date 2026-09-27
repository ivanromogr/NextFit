package com.tuap.backend.auth;
import java.time.Instant;
import java.util.UUID;
public record SessionResponse(UUID familyId, ClientType clientType, Instant createdAt, Instant expiresAt, Instant lastUsedAt, boolean current) { }
