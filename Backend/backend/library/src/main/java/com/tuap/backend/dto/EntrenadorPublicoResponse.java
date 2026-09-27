package com.tuap.backend.dto;

import java.util.UUID;

import com.tuap.backend.dominio.entidades.Entrenador;

/** Deliberately minimal representation for marketplace and public profile responses. */
public record EntrenadorPublicoResponse(
        UUID id,
        String nombre,
        String apellido,
        String especialidad,
        Integer aniosExperiencia,
        String formacion,
        String descripcionPerfil,
        String modalidadTrabajo,
        String biografia,
        String fotoPerfil,
        String tituloAcademico,
        String titulacion,
        Double tarifaMensual,
        boolean perfilPublico) {

    public static EntrenadorPublicoResponse from(Entrenador entrenador) {
        return new EntrenadorPublicoResponse(
                entrenador.getId(), entrenador.getNombre(), entrenador.getApellido(), entrenador.getEspecialidad(),
                entrenador.getAniosExperiencia(), entrenador.getFormacion(), entrenador.getDescripcionPerfil(),
                entrenador.getModalidadTrabajo(), entrenador.getBiografia(), entrenador.getFotoPerfil(),
                entrenador.getTituloAcademico(), entrenador.getTitulacion(), entrenador.getTarifaMensual(),
                entrenador.isPerfilPublico());
    }
}
