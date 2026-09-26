package com.tuap.backend.dominio.entidades;

import java.time.Instant;
import java.util.UUID;

import com.tuap.backend.auth.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** A one-time reset credential. The plaintext token is never persisted. */
@Entity
@Table(name = "password_reset_tokens")
public class PasswordResetToken {
    @Id @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false) private UUID userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
    @Column(nullable = false, unique = true, length = 64) private String tokenHash;
    @Column(nullable = false) private Instant expiresAt;
    private Instant usedAt;
    @Column(nullable = false, updatable = false) private Instant createdAt;

    protected PasswordResetToken() { }

    public PasswordResetToken(UUID userId, Role role, String tokenHash, Instant expiresAt, Instant createdAt) {
        this.userId = userId;
        this.role = role;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }
    public UUID getId() { return id; }
    public UUID getUserId() { return userId; }
    public Role getRole() { return role; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public boolean isUsableAt(Instant now) { return usedAt == null && expiresAt.isAfter(now); }
    public void consume(Instant when) { this.usedAt = when; }
}
