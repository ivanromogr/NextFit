package com.tuap.backend.persistencia;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.tuap.backend.dominio.entidades.Rutina;

@Repository
public interface RutinaDAO extends JpaRepository<Rutina, UUID> {
    
    // Buscar rutinas por cliente
    List<Rutina> findByClienteId(UUID clienteId);
    
    // Método derivado para buscar por cliente y creador (ENTRENADOR/CLIENTE/IA)
    List<Rutina> findByClienteIdAndCreador(UUID clienteId, String creador);
    
    // --- NUEVO: Buscar las plantillas de un entrenador ---
    List<Rutina> findByEntrenadorIdAndEsPlantillaTrue(UUID entrenadorId);
}