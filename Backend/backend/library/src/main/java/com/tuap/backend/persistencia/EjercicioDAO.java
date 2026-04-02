package com.tuap.backend.persistencia;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Ejercicio;

@Repository
public interface EjercicioDAO extends JpaRepository<Ejercicio, UUID> {

    // --- 🔹 BÚSQUEDA ORIGINAL (NO TOCAR) ---
    @Query("SELECT e FROM Ejercicio e WHERE " +
           "(:nombre IS NULL OR LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))) AND " +
           "(:musculo IS NULL OR e.grupoMuscular = :musculo)")
    List<Ejercicio> buscarAvanzado(@Param("nombre") String nombre, @Param("musculo") String musculo);


    // --- 🔥 NUEVO: BÚSQUEDA CON TRADUCCIÓN ---
    @Query("SELECT e FROM Ejercicio e WHERE " +
           "(:nombreOriginal IS NULL OR " +
           "LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombreOriginal, '%')) OR " +
           "LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombreTraducido, '%'))) AND " +
           "(:musculo IS NULL OR e.grupoMuscular = :musculo)")
    List<Ejercicio> buscarAvanzadoTraducido(
            @Param("nombreOriginal") String nombreOriginal,
            @Param("nombreTraducido") String nombreTraducido,
            @Param("musculo") String musculo);


    // --- 🔹 BÚSQUEDA SIMPLE ---
    @Query("SELECT e FROM Ejercicio e WHERE LOWER(e.nombre) LIKE LOWER(CONCAT('%', :nombre, '%'))")
    List<Ejercicio> buscarPorNombre(@Param("nombre") String nombre);


    // --- 🔹 IA / RANDOM ---
    @Query(value = "SELECT * FROM ejercicio e " +
                   "WHERE e.grupo_muscular = :musculo " +
                   "AND (:esCasa = false OR e.equipamiento IN ('Peso Corporal', 'Mancuernas', 'Banda Elástica', 'body weight')) " +
                   "ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Ejercicio encontrarEjercicioAleatorio(@Param("musculo") String musculo, @Param("esCasa") boolean esCasa);


    // --- 🔹 BUSCAR POR TEXTO ---
    Optional<Ejercicio> findFirstByNombreContainingIgnoreCase(String texto);


    // --- 🔹 CONTROL DE DUPLICADOS API ---
    boolean existsByApiId(String apiId);
}