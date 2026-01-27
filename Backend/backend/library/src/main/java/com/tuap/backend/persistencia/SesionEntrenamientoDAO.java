package com.tuap.backend.persistencia;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.tuap.backend.dominio.entidades.SesionEntrenamiento;

public interface SesionEntrenamientoDAO extends JpaRepository<SesionEntrenamiento, UUID> {
    List<SesionEntrenamiento> findByClienteIdOrderByFechaHoraDesc(UUID clienteId);
    List<SesionEntrenamiento> findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(UUID clienteId, LocalDateTime from, LocalDateTime to);
    Optional<SesionEntrenamiento> findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(UUID clienteId, UUID rutinaId);
}
