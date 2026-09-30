package com.tuap.backend.persistencia;
import java.util.*; import org.springframework.data.jpa.repository.*; import org.springframework.data.repository.query.Param; import jakarta.persistence.LockModeType; import com.tuap.backend.dominio.entidades.ReauthenticationToken;
public interface ReauthenticationTokenDAO extends JpaRepository<ReauthenticationToken,UUID>{
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from ReauthenticationToken t where t.tokenHash=:hash") Optional<ReauthenticationToken> findLockedByTokenHash(@Param("hash") String hash);
}
