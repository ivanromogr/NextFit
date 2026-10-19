package com.tuap.backend.chat;

import java.time.Instant;
import java.util.UUID;
import jakarta.persistence.*;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;

@Entity
@Table(name = "moderation_audit", indexes = @Index(name = "moderation_audit_report_idx", columnList = "reporter_id,message_id,created_at"))
public class ModerationAudit {
    public enum Action { DISMISS, CONFIRM, RESTRICT_CHAT, LIFT_RESTRICTION }
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, updatable = false) private UUID operatorId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Role operatorRole;
    @Column(nullable = false, updatable = false) private UUID reporterId;
    @Column(nullable = false, updatable = false) private UUID messageId;
    @Column(nullable = false, updatable = false) private UUID targetId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, updatable = false) private Action action;
    @Column(nullable = false, updatable = false, length = 1000) private String note;
    @Column(nullable = false, updatable = false) private Instant createdAt;
    protected ModerationAudit() {}
    public ModerationAudit(AuthenticatedUser operator, ChatReport report, Action action, String note) {
        operatorId = operator.userId(); operatorRole = operator.role(); reporterId = report.getReporterId();
        messageId = report.getMessageId(); targetId = report.getReportedUserId(); this.action = action;
        this.note = note; createdAt = Instant.now();
    }
    public UUID getId() { return id; }
    public UUID getOperatorId() { return operatorId; }
    public Role getOperatorRole() { return operatorRole; }
    public Action getAction() { return action; }
    public String getNote() { return note; }
    public Instant getCreatedAt() { return createdAt; }
}
