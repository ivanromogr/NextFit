package com.tuap.backend.persistencia;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository; import com.tuap.backend.dominio.entidades.PendingSocialAuth;
public interface PendingSocialAuthDAO extends JpaRepository<PendingSocialAuth,UUID>{Optional<PendingSocialAuth> findByTokenHash(String tokenHash);}
