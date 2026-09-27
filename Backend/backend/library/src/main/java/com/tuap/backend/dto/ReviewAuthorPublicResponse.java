package com.tuap.backend.dto;

import java.util.UUID;

import com.tuap.backend.dominio.entidades.Cliente;

/** Public review author without account or fitness information. */
public record ReviewAuthorPublicResponse(UUID id, String nombre, String apellido, String fotoPerfil) {
    public static ReviewAuthorPublicResponse from(Cliente cliente) {
        if (!cliente.isActive()) return new ReviewAuthorPublicResponse(null, "Usuario eliminado", "", null);
        return new ReviewAuthorPublicResponse(cliente.getId(), cliente.getNombre(), cliente.getApellido(), cliente.getFotoPerfil());
    }
}
