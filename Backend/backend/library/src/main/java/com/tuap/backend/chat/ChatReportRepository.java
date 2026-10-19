package com.tuap.backend.chat;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ChatReportRepository extends JpaRepository<ChatReport, ChatReport.Key> {}
