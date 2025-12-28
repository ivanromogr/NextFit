package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Rutina;

@Repository
public interface RutinaDAO extends JpaRepository<Rutina, UUID> {
    // Buscar rutinas por cliente (filtrado real para evitar mostrar rutinas de otros usuarios)
    java.util.List<Rutina> findByClienteId(java.util.UUID clienteId);
}