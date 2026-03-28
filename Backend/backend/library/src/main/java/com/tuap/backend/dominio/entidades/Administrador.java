package com.tuap.backend.dominio.entidades;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;

@Entity

public class Administrador {
    @Id
    @GeneratedValue
    private UUID id;
    @Column(nullable = false)
    private String nivelAcceso;

    public Administrador() {
    }

    public Administrador(String nombre, String apellido, String email, String rol, String contrasena, String nivelAcceso) {
        // super(nombre, apellido, email, contrasena, rol); // id es generado automáticamente, no hace falta pasarlo
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
