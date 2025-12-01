package com.tuap.backend.persistencia;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Ejercicio;

@Repository
public interface EjercicioDAO extends JpaRepository<Ejercicio, UUID> {
    // Método mágico de JPA para buscar por el campo apiId
    Optional<Ejercicio> findByApiId(String apiId);
}