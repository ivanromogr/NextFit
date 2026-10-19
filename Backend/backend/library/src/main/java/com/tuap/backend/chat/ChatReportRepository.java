package com.tuap.backend.chat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface ChatReportRepository extends JpaRepository<ChatReport, ChatReport.Key> {
    @Query("select r from ChatReport r where r.status = :status and r.reporterId <> :operator and r.reportedUserId <> :operator")
    Page<ChatReport> queue(@Param("status") String status, @Param("operator") UUID operator, Pageable page);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from ChatReport r where r.reporterId = :reporter and r.messageId = :message")
    Optional<ChatReport> lockReport(@Param("reporter") UUID reporter, @Param("message") UUID message);
}
