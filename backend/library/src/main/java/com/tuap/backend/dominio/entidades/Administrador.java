package com.tuap.backend.dominio.entidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;

@Entity
@PrimaryKeyJoinColumn(name = "id")
public class Administrador extends Usuario {

    @Column(nullable = false)
    private String nivelAcceso;

    public Administrador() {
    }

    public Administrador(String nombre, String apellido, String email,String rol, String contraseña, String nivelAcceso) {
        super(nombre, apellido, email, contraseña,rol); // id es generado automáticamente, no hace falta pasarlo
        this.nivelAcceso = nivelAcceso;
    }

    // Getters y Setters
    public String getNivelAcceso() {
        return nivelAcceso;
    }

    public void setNivelAcceso(String nivelAcceso) {
        this.nivelAcceso = nivelAcceso;
    }
}
