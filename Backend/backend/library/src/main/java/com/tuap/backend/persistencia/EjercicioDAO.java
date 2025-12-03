package com.tuap.backend.persistencia;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Ejercicio;

@Repository
public interface EjercicioDAO extends JpaRepository<Ejercicio, UUID> {

    // Para el modo MANUAL (Buscador)
    @Query("SELECT e FROM Ejercicio e WHERE LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Ejercicio> buscarPorNombre(@Param("nombre") String nombre);

    // Para el modo AUTOMÁTICO (IA)
    // Busca 1 ejercicio aleatorio que coincida con el músculo.
    // Si esCasa = true, solo busca equipamiento 'Peso Corporal' o 'Mancuernas'.
    @Query(value = "SELECT * FROM ejercicio e " +
                   "WHERE e.grupo_muscular = :musculo " +
                   "AND (:esCasa = false OR e.equipamiento IN ('Peso Corporal', 'Mancuernas', 'Banda Elástica', 'body weight')) " +
                   "ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Ejercicio encontrarEjercicioAleatorio(@Param("musculo") String musculo, @Param("esCasa") boolean esCasa);
}