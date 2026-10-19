package com.tuap.backend.chat;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ModerationOperatorRepository extends JpaRepository<ModerationOperator, ModerationOperator.Key> {}
