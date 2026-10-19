package com.tuap.backend.chat;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "chat_blocks")
@IdClass(ChatBlock.Key.class)
public class ChatBlock {
    @Id private UUID ownerId;
    @Id private UUID targetId;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    protected ChatBlock() {}
    public ChatBlock(UUID ownerId, UUID targetId) {
        this.ownerId = ownerId; this.targetId = targetId; this.createdAt = Instant.now();
    }
    public static class Key implements Serializable {
        public UUID ownerId;
        public UUID targetId;
        public Key() {}
        public Key(UUID ownerId, UUID targetId) { this.ownerId = ownerId; this.targetId = targetId; }
        @Override public boolean equals(Object value) {
            return value instanceof Key k && Objects.equals(ownerId, k.ownerId) && Objects.equals(targetId, k.targetId);
        }
        @Override public int hashCode() { return Objects.hash(ownerId, targetId); }
    }
}
