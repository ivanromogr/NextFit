package com.tuap.backend.chat;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.*;
import com.tuap.backend.auth.Role;

/** A server-managed entitlement. There is deliberately no self-service grant endpoint. */
@Entity
@Table(name = "moderation_operators")
@IdClass(ModerationOperator.Key.class)
public class ModerationOperator {
    @Id private UUID userId;
    @Id @Enumerated(EnumType.STRING) private Role role;
    @Column(nullable = false) private boolean active;
    protected ModerationOperator() {}
    public ModerationOperator(UUID userId, Role role) { this.userId = userId; this.role = role; this.active = true; }
    public boolean isActive() { return active; }
    public static class Key implements Serializable {
        public UUID userId;
        public Role role;
        public Key() {}
        public Key(UUID userId, Role role) { this.userId = userId; this.role = role; }
        @Override public boolean equals(Object value) { return value instanceof Key k && Objects.equals(userId, k.userId) && role == k.role; }
        @Override public int hashCode() { return Objects.hash(userId, role); }
    }
}
