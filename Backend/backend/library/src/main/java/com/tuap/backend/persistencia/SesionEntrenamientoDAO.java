package com.tuap.backend.persistencia;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
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

    @Query("SELECT s FROM SesionEntrenamiento s " +
           "LEFT JOIN s.rutina r " +
           "LEFT JOIN s.eventoCalendario e " +
           "WHERE ((r IS NOT NULL AND r.entrenadorId = :entrenadorId) " +
           "OR (e IS NOT NULL AND e.entrenadorId = :entrenadorId)) " +
           "ORDER BY s.fechaHora DESC")
    List<SesionEntrenamiento> findActividadAsignadaByEntrenador(@Param("entrenadorId") UUID entrenadorId, Pageable pageable);

    // Contar sesiones completadas HOY
    @Query("SELECT COUNT(s) FROM SesionEntrenamiento s WHERE s.cliente.entrenador.id = :entrenadorId AND CAST(s.fechaHora AS date) = CURRENT_DATE")
    long countEntrenosHoy(@Param("entrenadorId") UUID entrenadorId);

    @Query("SELECT COUNT(DISTINCT s.cliente.id) FROM SesionEntrenamiento s " +
           "LEFT JOIN s.rutina r " +
           "LEFT JOIN s.eventoCalendario e " +
           "WHERE s.fechaHora >= :inicio AND s.fechaHora < :fin " +
           "AND ((r IS NOT NULL AND r.entrenadorId = :entrenadorId) " +
           "OR (e IS NOT NULL AND e.entrenadorId = :entrenadorId))")
    long countClientesEntrenadosEnRangoByEntrenador(
            @Param("entrenadorId") UUID entrenadorId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);

    @Query("SELECT COUNT(s) FROM SesionEntrenamiento s " +
           "LEFT JOIN s.rutina r " +
           "LEFT JOIN s.eventoCalendario e " +
           "WHERE s.fechaHora >= :inicio AND s.fechaHora < :fin " +
           "AND ((r IS NOT NULL AND r.entrenadorId = :entrenadorId) " +
           "OR (e IS NOT NULL AND e.entrenadorId = :entrenadorId))")
    long countSesionesAsignadasEnRangoByEntrenador(
            @Param("entrenadorId") UUID entrenadorId,
            @Param("inicio") LocalDateTime inicio,
            @Param("fin") LocalDateTime fin);

    // Clientes inactivos (+7 días)
    @Query("SELECT COUNT(c) FROM Cliente c " +
           "WHERE c.entrenador.id = :entrenadorId " +
           "AND c.id NOT IN (" +
           "    SELECT s.cliente.id FROM SesionEntrenamiento s " +
           "    LEFT JOIN s.rutina r " +
           "    LEFT JOIN s.eventoCalendario e " +
           "    WHERE s.fechaHora > :fechaLimite " +
           "    AND ((r IS NOT NULL AND r.entrenadorId = :entrenadorId) " +
           "    OR (e IS NOT NULL AND e.entrenadorId = :entrenadorId))" +
           ")")
    long countClientesInactivos(@Param("entrenadorId") UUID entrenadorId, @Param("fechaLimite") LocalDateTime fechaLimite);
}
