package com.tuap.backend.chat;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ChatRestrictionRepository extends JpaRepository<ChatRestriction, UUID> {
    boolean existsByUserIdAndActiveTrue(UUID userId);
}
