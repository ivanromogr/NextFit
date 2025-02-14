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
    private String codigoCliente;
    @Column(nullable = false)
    private Float peso;
    @Column(nullable = false)
    private Float altura;
    @Column(nullable = false)
    private int edad;
    @Column(nullable = false)
    private String objetivo;
    @Column(nullable = false)
    private String codigoUnico;
    
    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    private List<Progreso> progresos;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    private List<Chat> chats;

    public Cliente() {
    }

    public Cliente(String codigoCliente, Float peso, Float altura, int edad, String objetivo, String codigoUnico,
            String nombre, String apellido,String rol, String email, String contraseña) {
        super(nombre, apellido,rol,email, contraseña); // id es generado automáticamente, no hace falta pasarlo
        this.codigoCliente = codigoCliente;
        this.peso = peso;
        this.altura = altura;
        this.edad = edad;
        this.objetivo = objetivo;
        this.codigoUnico = codigoUnico;
    }

    // Getters y Setters
    public String getCodigoCliente() {
        return codigoCliente;
    }

    public void setCodigoCliente(String codigoCliente) {
        this.codigoCliente = codigoCliente;
    }

    public Float getPeso() {
        return peso;
    }

    public void setPeso(Float peso) {
        this.peso = peso;
    }

    public Float getAltura() {
        return altura;
    }

    public void setAltura(Float altura) {
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

    public String getCodigoUnico() {
        return codigoUnico;
    }

    public void setCodigoUnico(String codigoUnico) {
        this.codigoUnico = codigoUnico;
    }
}
