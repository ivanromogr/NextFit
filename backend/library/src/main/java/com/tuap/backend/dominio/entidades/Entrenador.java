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

    @OneToMany(mappedBy = "entrenador", cascade = CascadeType.ALL)
    private List<Chat> chats;

    @OneToMany(mappedBy = "entrenador", cascade = CascadeType.ALL)
    private List<Entrenamiento> entrenamientos;

    public Entrenador() {
        super();
    }

    public Entrenador( String nombre, String apellido, String email, String contraseña, String rol, String especialidad) {
        super(nombre, apellido, email, contraseña, rol);
        this.especialidad = especialidad;
    }

    // Getters y Setters
    public String getEspecialidad() {
        return especialidad;
    }

    public void setEspecialidad(String especialidad) {
        this.especialidad = especialidad;
    }

}

