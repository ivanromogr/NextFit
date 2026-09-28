package com.tuap.backend.persistencia;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository; import org.springframework.stereotype.Repository; import com.tuap.backend.auth.Role; import com.tuap.backend.dominio.entidades.EmailChangeToken;
@Repository public interface EmailChangeTokenDAO extends JpaRepository<EmailChangeToken,UUID>{Optional<EmailChangeToken> findByTokenHash(String hash); List<EmailChangeToken> findByUserIdAndRoleAndConsumedAtIsNull(UUID id,Role role);}
