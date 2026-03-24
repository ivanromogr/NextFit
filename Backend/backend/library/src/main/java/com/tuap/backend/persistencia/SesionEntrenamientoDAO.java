package com.tuap.backend.persistencia;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tuap.backend.dominio.entidades.SesionEntrenamiento;

public interface SesionEntrenamientoDAO extends JpaRepository<SesionEntrenamiento, UUID> {
    List<SesionEntrenamiento> findByClienteIdOrderByFechaHoraDesc(UUID clienteId);
    List<SesionEntrenamiento> findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(UUID clienteId, LocalDateTime from, LocalDateTime to);
    SesionEntrenamiento findByEventoCalendario_Id(UUID eventoCalendarioId);
    Optional<SesionEntrenamiento> findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(UUID clienteId, UUID rutinaId);

    // Feed de actividad
    List<SesionEntrenamiento> findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc(UUID entrenadorId);

    // Contar sesiones completadas HOY
    @Query("SELECT COUNT(s) FROM SesionEntrenamiento s WHERE s.cliente.entrenador.id = :entrenadorId AND CAST(s.fechaHora AS date) = CURRENT_DATE")
    long countEntrenosHoy(@Param("entrenadorId") UUID entrenadorId);

    // Clientes inactivos (+7 días)
    @Query("SELECT COUNT(c) FROM Cliente c " +
           "WHERE c.entrenador.id = :entrenadorId " +
           "AND c.id NOT IN (" +
           "    SELECT s.cliente.id FROM SesionEntrenamiento s " +
           "    WHERE s.fechaHora > :fechaLimite" +
           ")")
    long countClientesInactivos(@Param("entrenadorId") UUID entrenadorId, @Param("fechaLimite") LocalDateTime fechaLimite);
}