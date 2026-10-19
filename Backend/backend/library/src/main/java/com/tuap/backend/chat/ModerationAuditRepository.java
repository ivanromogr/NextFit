package com.tuap.backend.chat;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ModerationAuditRepository extends JpaRepository<ModerationAudit, UUID> {
    List<ModerationAudit> findByReporterIdAndMessageIdOrderByCreatedAtAscIdAsc(UUID reporterId, UUID messageId);
}
