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
    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END FROM Mensaje m WHERE " +
           "(m.remitenteId = :usuario1 AND m.destinatarioId = :usuario2) OR " +
           "(m.remitenteId = :usuario2 AND m.destinatarioId = :usuario1)")
    boolean existsHistoryBetween(@Param("usuario1") UUID usuario1, @Param("usuario2") UUID usuario2);
    
    @Query("SELECT DISTINCT CASE " +
       "  WHEN m.remitenteId = :usuarioId THEN m.destinatarioId " +
       "  ELSE m.remitenteId END " +
       "FROM Mensaje m " +
       "WHERE m.remitenteId = :usuarioId OR m.destinatarioId = :usuarioId")
List<UUID> findContactosIds(@Param("usuarioId") UUID usuarioId);
    
    // Contar mensajes no leídos para un usuario
    long countByDestinatarioIdAndLeidoFalse(UUID destinatarioId);
    // Busca los mensajes que el 'remitente' envió al 'destinatario' y que aún NO han sido leídos
    List<Mensaje> findByRemitenteIdAndDestinatarioIdAndLeidoFalse(UUID remitenteId, UUID destinatarioId);

    boolean existsByAttachmentId(UUID attachmentId);

    @Query("SELECT CASE WHEN COUNT(m) > 0 THEN true ELSE false END FROM Mensaje m " +
           "WHERE m.attachmentId = :attachmentId AND (m.remitenteId = :userId OR m.destinatarioId = :userId)")
    boolean existsAttachmentForParticipant(@Param("attachmentId") UUID attachmentId, @Param("userId") UUID userId);
}
