package com.tuap.backend.persistencia;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.PasswordResetToken;

@Repository
public interface PasswordResetTokenDAO extends JpaRepository<PasswordResetToken, UUID> {
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);
    List<PasswordResetToken> findByUserIdAndRoleAndUsedAtIsNull(UUID userId, Role role);
}
