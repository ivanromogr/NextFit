package com.tuap.backend.dto;

public class UpdateEntrenadorRequest {
    private String nombre;
    private String apellido;
    private String email;
    private String contrasena;
    private String especialidad;
    private Integer edad;
    private String genero;
    private Integer aniosExperiencia;
    private String formacion;
    private String descripcionPerfil;
    private String modalidadTrabajo;
    private String fotoPerfil;

    public UpdateEntrenadorRequest() {
        // Necesario para la deserialización 
    }

    // getters y setters
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getContrasena() { return contrasena; }
    public void setContrasena(String contrasena) { this.contrasena = contrasena; }

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