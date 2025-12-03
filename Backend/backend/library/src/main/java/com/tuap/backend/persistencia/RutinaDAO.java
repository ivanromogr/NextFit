package com.tuap.backend.persistencia;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Rutina;

@Repository
public interface RutinaDAO extends JpaRepository<Rutina, UUID> {
    // Aquí podríamos añadir búsquedas extra en el futuro, por ejemplo:
    // List<Rutina> findByClienteId(UUID clienteId);
}