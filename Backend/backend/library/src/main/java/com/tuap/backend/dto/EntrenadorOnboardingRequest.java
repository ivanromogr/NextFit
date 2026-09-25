package com.tuap.backend.dto;

import java.util.UUID;

public class EntrenadorOnboardingRequest {

    // Identificador para saber a qué entrenador actualizar
    private UUID idEntrenador;

    private String especialidad;
    private Integer edad;
    private String genero;
    private Integer aniosExperiencia;
    private String formacion;
    private String descripcionPerfil;
    private String modalidadTrabajo; // "ONLINE", "PRESENCIAL", "HIBRIDO"
    private String fotoPerfil;

    // Getters y Setters
    public UUID getIdEntrenador() { return idEntrenador; }
    public void setIdEntrenador(UUID idEntrenador) { this.idEntrenador = idEntrenador; }

    public String getEspecialidad() { return especialidad; }
    public void setEspecialidad(String especialidad) { this.especialidad = especialidad; }

    public Integer getEdad() { return edad; }
    public void setEdad(Integer edad) { this.edad = edad; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public Integer getAniosExperiencia() { return aniosExperiencia; }
    public void setAniosExperiencia(Integer aniosExperiencia) { this.aniosExperiencia = aniosExperiencia; }

    public String getFormacion() { return formacion; }
    public void setFormacion(String formacion) { this.formacion = formacion; }

    public String getDescripcionPerfil() { return descripcionPerfil; }
    public void setDescripcionPerfil(String descripcionPerfil) { this.descripcionPerfil = descripcionPerfil; }

    public String getModalidadTrabajo() { return modalidadTrabajo; }
    public void setModalidadTrabajo(String modalidadTrabajo) { this.modalidadTrabajo = modalidadTrabajo; }

    public String getFotoPerfil() { return fotoPerfil; }
    public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }
}
