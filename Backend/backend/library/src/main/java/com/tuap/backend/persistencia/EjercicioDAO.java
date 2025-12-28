package com.tuap.backend.persistencia;

import java.util.List;
import java.util.Optional; // <--- IMPORTANTE: Necesario para el nuevo método
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Ejercicio;

@Repository
public interface EjercicioDAO extends JpaRepository<Ejercicio, UUID> {

    // --- TUS MÉTODOS ACTUALES (NO TOCAR) ---

    // Búsqueda para el Panel Lateral (Filtra por nombre Y/O músculo)
    @Query("SELECT e FROM Ejercicio e WHERE " +
           "(:nombre IS NULL OR LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))) AND " +
           "(:musculo IS NULL OR e.grupoMuscular = :musculo)")
    List<Ejercicio> buscarAvanzado(@Param("nombre") String nombre, @Param("musculo") String musculo);

    // Para el modo MANUAL simple
    @Query("SELECT e FROM Ejercicio e WHERE LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Ejercicio> buscarPorNombre(@Param("nombre") String nombre);

    // Para el modo AUTOMÁTICO (IA) - Selección Aleatoria
    @Query(value = "SELECT * FROM ejercicio e " +
                   "WHERE e.grupo_muscular = :musculo " +
                   "AND (:esCasa = false OR e.equipamiento IN ('Peso Corporal', 'Mancuernas', 'Banda Elástica', 'body weight')) " +
                   "ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Ejercicio encontrarEjercicioAleatorio(@Param("musculo") String musculo, @Param("esCasa") boolean esCasa);

    
    // --- NUEVO MÉTODO AÑADIDO PARA EL GESTOR DE RUTINAS INTELIGENTE ---
    // Este método permite buscar un ejercicio específico por su nombre (o parte de él)
    // Ej: Si buscas "Sentadilla", te devolverá el primer ejercicio que contenga esa palabra.
    Optional<Ejercicio> findFirstByNombreContainingIgnoreCase(String texto);
}