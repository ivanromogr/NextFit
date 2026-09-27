package com.tuap.backend.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import com.tuap.backend.dominio.entidades.Resena;

/** Explicit public review representation. */
public record ReviewPublicResponse(UUID id, int estrellas, String comentario, LocalDateTime fecha,
                                   ReviewAuthorPublicResponse autor) {
    public static ReviewPublicResponse from(Resena resena) {
        return new ReviewPublicResponse(resena.getId(), resena.getEstrellas(), resena.getComentario(), resena.getFecha(),
                resena.getCliente() == null ? null : ReviewAuthorPublicResponse.from(resena.getCliente()));
    }
}
