package com.tuap.backend.dominio.entidades;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrimaryKeyJoinColumn;

@Entity
@PrimaryKeyJoinColumn(name = "id")
public class Entrenador extends Usuario {
    @Column(nullable = false)
    private String especialidad;

    @Column(nullable = false)
    private String codigoEntrenador;
    
    @OneToMany(mappedBy = "entrenador", cascade = CascadeType.ALL)
    private List<Chat> chats;

    @OneToMany(mappedBy = "entrenador", cascade = CascadeType.ALL)
    private List<Entrenamiento> entrenamientos;

    public Entrenador() {
    }

    public Entrenador(String especialidad, String codigoEntrenador,String rol, String nombre, String apellido, String email, String contraseña) {
        super(nombre, apellido, email, contraseña,rol); // id es generado automáticamente, no hace falta pasarlo
        this.especialidad = especialidad;
        this.codigoEntrenador = codigoEntrenador;
    }

    // Getters y Setters
    public String getEspecialidad() {
        return especialidad;
    }

    public void setEspecialidad(String especialidad) {
        this.especialidad = especialidad;
    }

    public String getCodigoEntrenador() {
        return codigoEntrenador;
    }

    public void setCodigoEntrenador(String codigoEntrenador) {
        this.codigoEntrenador = codigoEntrenador;
    }
}

