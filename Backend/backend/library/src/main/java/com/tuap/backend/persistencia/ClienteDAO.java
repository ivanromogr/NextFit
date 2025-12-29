package com.tuap.backend.persistencia;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Cliente;

@Repository
public interface ClienteDAO extends JpaRepository<Cliente, UUID> {
    Optional<Cliente> findByEmail(String email);
    List<Cliente> findByEntrenadorId(UUID entrenadorId);
}
