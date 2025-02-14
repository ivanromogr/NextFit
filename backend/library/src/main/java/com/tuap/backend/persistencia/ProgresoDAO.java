package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tuap.backend.dominio.entidades.Progreso;

public interface ProgresoDAO extends JpaRepository<Progreso, UUID> {
}
