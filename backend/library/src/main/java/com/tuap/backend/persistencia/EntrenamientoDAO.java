package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tuap.backend.dominio.entidades.Entrenamiento;

public interface EntrenamientoDAO extends JpaRepository<Entrenamiento, UUID> {
}
