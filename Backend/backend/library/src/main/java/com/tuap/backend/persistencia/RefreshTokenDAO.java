package com.tuap.backend.persistencia;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.RefreshToken;
@Repository
public interface RefreshTokenDAO extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);
    List<RefreshToken> findByFamilyId(UUID familyId);
    List<RefreshToken> findByUserIdAndRole(UUID userId, Role role);
}
