package com.tuap.backend.persistencia;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Resena;

@Repository
public interface ResenaDAO extends JpaRepository<Resena, UUID> {

    /**
     * Obtiene todas las reseñas de un entrenador específico ordenadas por las más recientes.
     */
    List<Resena> findByEntrenadorIdOrderByFechaDesc(UUID entrenadorId);
    
    /**
     * Calcula la media aritmética de las estrellas de un entrenador.
     * @Param id El UUID del entrenador.
     * @return El promedio como Double (puede ser null si no hay reseñas).
     */
    @Query("SELECT AVG(r.estrellas) FROM Resena r WHERE r.entrenador.id = :id")
    Double calcularMediaPorEntrenador(@Param("id") UUID id);
}