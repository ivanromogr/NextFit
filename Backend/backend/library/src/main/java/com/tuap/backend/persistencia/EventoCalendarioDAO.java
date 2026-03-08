package com.tuap.backend.persistencia;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query; // 👈 Importante
import org.springframework.data.repository.query.Param; // 👈 Importante

import com.tuap.backend.dominio.entidades.EventoCalendario;

public interface EventoCalendarioDAO extends JpaRepository<EventoCalendario, UUID> {
    
    // Obtener eventos para pintar el calendario
    List<EventoCalendario> findByClienteIdAndFechaBetween(UUID clienteId, LocalDate inicio, LocalDate fin);
    List<EventoCalendario> findByClienteIdAndFechaLessThanEqualOrderByFechaDesc(UUID clienteId, LocalDate fecha);
    
    @Query("SELECT e FROM EventoCalendario e WHERE e.cliente.id = :clienteId AND e.fecha = :fecha AND e.rutina.id = :rutinaId")
    Optional<EventoCalendario> buscarEventoExacto(
        @Param("clienteId") UUID clienteId, 
        @Param("fecha") LocalDate fecha, 
        @Param("rutinaId") UUID rutinaId
    );
}