package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Entrenamiento;

@Repository
public interface EntrenamientoDAO extends JpaRepository<Entrenamiento, UUID> {
}
