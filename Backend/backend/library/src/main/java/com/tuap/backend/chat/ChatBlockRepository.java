package com.tuap.backend.chat;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ChatBlockRepository extends JpaRepository<ChatBlock, ChatBlock.Key> {}
