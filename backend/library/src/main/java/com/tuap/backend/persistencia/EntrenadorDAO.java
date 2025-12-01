package com.tuap.backend.persistencia;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Entrenador;

@Repository
public interface EntrenadorDAO extends JpaRepository<Entrenador, UUID> {
     Optional<Entrenador> findByEmail(String email);
}
