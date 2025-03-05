package com.tuap.backend.dominio.entidades;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrimaryKeyJoinColumn;

@Entity
@PrimaryKeyJoinColumn(name = "id")
public class Cliente extends Usuario {
   

    @Column(nullable = false)
    private double peso;

    @Column(nullable = false)
    private int altura;

    @Column(nullable = false)
    private int edad;

    @Column(nullable = false)
    private String objetivo;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    private List<Progreso> progresos;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    private List<Chat> chats;

    public Cliente() {
        super();
    }

    public Cliente( String nombre, String apellido, String email, String contraseña, String rol, double peso, int altura, int edad, String objetivo) {
        super(nombre, apellido, rol, email, contraseña); // id es generado automáticamente, no hace falta pasarlo
        this.peso = peso;
        this.altura = altura;
        this.edad = edad;
        this.objetivo = objetivo;
    }

    // Getters y Setters
    

    public double getPeso() {
        return peso;
    }

    public void setPeso(double peso) {
        this.peso = peso;
    }

    public int getAltura() {
        return altura;
    }

    public void setAltura(int altura) {
        this.altura = altura;
    }

    public int getEdad() {
        return edad;
    }

    public void setEdad(int edad) {
        this.edad = edad;
    }

    public String getObjetivo() {
        return objetivo;
    }

    public void setObjetivo(String objetivo) {
        this.objetivo = objetivo;
    }
}
