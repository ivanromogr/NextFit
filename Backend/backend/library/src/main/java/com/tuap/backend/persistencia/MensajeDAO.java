package com.tuap.backend.persistencia;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.tuap.backend.dominio.entidades.Mensaje;

public interface MensajeDAO extends JpaRepository<Mensaje, UUID> {

    // Buscar conversación entre A y B (en cualquier dirección) ordenado por fecha
    @Query("SELECT m FROM Mensaje m WHERE " +
           "(m.remitenteId = :usuario1 AND m.destinatarioId = :usuario2) OR " +
           "(m.remitenteId = :usuario2 AND m.destinatarioId = :usuario1) " +
           "ORDER BY m.fechaHora ASC")
    List<Mensaje> findChatHistory(@Param("usuario1") UUID usuario1, @Param("usuario2") UUID usuario2);
    
    @Query(value = "SELECT DISTINCT remitente_id FROM mensajes WHERE destinatario_id = :usuarioId " +
                   "UNION " +
                   "SELECT DISTINCT destinatario_id FROM mensajes WHERE remitente_id = :usuarioId", 
           nativeQuery = true)
    List<UUID> findContactosIds(@Param("usuarioId") UUID usuarioId);
    
    // Contar mensajes no leídos para un usuario
    long countByDestinatarioIdAndLeidoFalse(UUID destinatarioId);
    // Busca los mensajes que el 'remitente' envió al 'destinatario' y que aún NO han sido leídos
    List<Mensaje> findByRemitenteIdAndDestinatarioIdAndLeidoFalse(UUID remitenteId, UUID destinatarioId);
}