package com.tuap.backend.chat;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "chat_restrictions")
public class ChatRestriction {
    @Id private UUID userId;
    @Column(nullable = false) private boolean active;
    @Column(nullable = false) private UUID reporterId;
    @Column(nullable = false) private UUID messageId;
    @Column(nullable = false) private Instant updatedAt;
    protected ChatRestriction() {}
    public ChatRestriction(UUID userId, UUID reporterId, UUID messageId) {
        this.userId = userId; this.reporterId = reporterId; this.messageId = messageId;
        this.active = true; this.updatedAt = Instant.now();
    }
    public boolean isActive() { return active; }
    public boolean belongsTo(ChatReport report) { return reporterId.equals(report.getReporterId()) && messageId.equals(report.getMessageId()); }
    public void lift() { active = false; updatedAt = Instant.now(); }
}
