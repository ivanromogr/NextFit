package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Ejercicio;

@Repository
public interface EjercicioDAO extends JpaRepository<Ejercicio, UUID> {
}
