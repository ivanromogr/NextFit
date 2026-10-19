package com.tuap.backend.chat;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import jakarta.persistence.*;

@Entity
@Table(name = "chat_reports", indexes = @Index(name = "chat_reports_pending_idx", columnList = "status,created_at"))
@IdClass(ChatReport.Key.class)
public class ChatReport {
    public enum Reason { HARASSMENT, SPAM, INAPPROPRIATE, OTHER }
    @Id private UUID reporterId;
    @Id private UUID messageId;
    @Column(nullable = false, updatable = false) private UUID reportedUserId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Reason reason;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    @Column(nullable = false) private String status = "PENDING";
    @Version private long version;
    private Instant reviewedAt;
    protected ChatReport() {}
    public ChatReport(UUID reporterId, UUID messageId, UUID reportedUserId, Reason reason) {
        this.reporterId = reporterId; this.messageId = messageId; this.reportedUserId = reportedUserId;
        this.reason = reason; this.createdAt = Instant.now();
    }
    public UUID getReporterId() { return reporterId; }
    public UUID getMessageId() { return messageId; }
    public UUID getReportedUserId() { return reportedUserId; }
    public Instant getCreatedAt() { return createdAt; }
    public long getVersion() { return version; }
    public void recordActivity() { reviewedAt = Instant.now(); }
    public void resolve(boolean confirmed) { status = confirmed ? "CONFIRMED" : "DISMISSED"; recordActivity(); }
    public String getStatus() { return status; }
    public Reason getReason() { return reason; }
    public static class Key implements Serializable {
        public UUID reporterId;
        public UUID messageId;
        public Key() {}
        public Key(UUID reporterId, UUID messageId) { this.reporterId = reporterId; this.messageId = messageId; }
        @Override public boolean equals(Object value) {
            return value instanceof Key k && Objects.equals(reporterId, k.reporterId) && Objects.equals(messageId, k.messageId);
        }
        @Override public int hashCode() { return Objects.hash(reporterId, messageId); }
    }
}
