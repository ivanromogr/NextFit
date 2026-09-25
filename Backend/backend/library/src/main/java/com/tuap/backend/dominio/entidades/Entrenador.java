package com.tuap.backend.dominio.entidades;

import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

@Entity
public class Entrenador {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false, unique = true)
    private String email;

   
    @Column(nullable = false)
    private String contrasena;

    @Column(nullable = false)
    private String rol; // "entrenador"

    @Column(nullable = false)
    private String especialidad;
    
    @Column
    private Integer edad;

    @Column
    private String genero;

    @Column
    private Integer aniosExperiencia;

    @Column
    private String formacion;

    @Column(length = 1000)
    private String descripcionPerfil;

    @Column
    private String modalidadTrabajo; // ONLINE / PRESENCIAL / MIXTO, etc.

    @Column(name = "biografia", columnDefinition = "TEXT")
    private String biografia;

    @Column
    private String fotoPerfil;

  
    @Column(name = "titulo_academico")
    private String tituloAcademico; 

    @Column(name = "titulacion")
    private String titulacion;

    @Column(name = "tarifa_mensual")
    private Double tarifaMensual;

    @Column(name = "perfil_publico")
    private boolean perfilPublico = false;

    @OneToMany(mappedBy = "entrenador", cascade = CascadeType.ALL)
    private List<Chat> chats;

    @OneToMany(mappedBy = "entrenador", cascade = CascadeType.ALL)
    private List<Entrenamiento> entrenamientos;

    // Constructores
    public Entrenador() {
    }

    public Entrenador(String nombre, String apellido, String email, String contrasena, String rol,
            String especialidad,
            Integer edad, String genero,
            Integer aniosExperiencia, String formacion,
            String descripcionPerfil, String modalidadTrabajo,
            String fotoPerfil) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.contrasena = contrasena;
        this.rol = rol;
        this.especialidad = especialidad;
        this.edad = edad;
        this.genero = genero;
        this.aniosExperiencia = aniosExperiencia;
        this.formacion = formacion;
        this.descripcionPerfil = descripcionPerfil;
        this.modalidadTrabajo = modalidadTrabajo;
        this.fotoPerfil = fotoPerfil;
    }

    // Getters y Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getApellido() {
        return apellido;
    }

    public void setApellido(String apellido) {
        this.apellido = apellido;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getContrasena() {
        return contrasena;
    }

    public void setContrasena(String contrasena) {
        this.contrasena = contrasena;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

    public String getEspecialidad() {
        return especialidad;
    }

    public void setEspecialidad(String especialidad) {
        this.especialidad = especialidad;
    }

    public List<Chat> getChats() {
        return chats;
    }

    public void setChats(List<Chat> chats) {
        this.chats = chats;
    }

    public List<Entrenamiento> getEntrenamientos() {
        return entrenamientos;
    }

    public void setEntrenamientos(List<Entrenamiento> entrenamientos) {
        this.entrenamientos = entrenamientos;
    }

    public Integer getEdad() {
        return edad;
    }

    public void setEdad(Integer edad) {
        this.edad = edad;
    }

    public String getGenero() {
        return genero;
    }

    public void setGenero(String genero) {
        this.genero = genero;
    }

    public Integer getAniosExperiencia() {
        return aniosExperiencia;
    }

    public void setAniosExperiencia(Integer aniosExperiencia) {
        this.aniosExperiencia = aniosExperiencia;
    }

    public String getFormacion() {
        return formacion;
    }

    public void setFormacion(String formacion) {
        this.formacion = formacion;
    }

    public String getDescripcionPerfil() {
        return descripcionPerfil;
    }

    public void setDescripcionPerfil(String descripcionPerfil) {
        this.descripcionPerfil = descripcionPerfil;
    }

    public String getModalidadTrabajo() {
        return modalidadTrabajo;
    }

    public void setModalidadTrabajo(String modalidadTrabajo) {
        this.modalidadTrabajo = modalidadTrabajo;
    }

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public String getBiografia() {
        return biografia;
    }

    public void setBiografia(String biografia) {
        this.biografia = biografia;
    }

    public String getTituloAcademico() {
        return tituloAcademico;
    }

    public void setTituloAcademico(String tituloAcademico) {
        this.tituloAcademico = tituloAcademico;
    }

    public String getTitulacion() {
        return titulacion;
    }

    public void setTitulacion(String titulacion) {
        this.titulacion = titulacion;
    }

    public Double getTarifaMensual() {
        return tarifaMensual;
    }

    public void setTarifaMensual(Double tarifaMensual) {
        this.tarifaMensual = tarifaMensual;
    }

    public boolean isPerfilPublico() {
        return perfilPublico;
    }

    public void setPerfilPublico(boolean perfilPublico) {
        this.perfilPublico = perfilPublico;
    }
}
