package com.tuap.backend.persistencia;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Entrenador;

@Repository
public interface EntrenadorDAO extends JpaRepository<Entrenador, UUID> {
     Optional<Entrenador> findByEmail(String email);
     List<Entrenador> findByPerfilPublicoTrue();
    @org.springframework.data.jpa.repository.Query("select u from Entrenador u where u.active = true and lower(trim(u.email)) = lower(trim(:email))")
    List<Entrenador> findActiveForModerationBootstrap(@org.springframework.data.repository.query.Param("email") String email);
}

