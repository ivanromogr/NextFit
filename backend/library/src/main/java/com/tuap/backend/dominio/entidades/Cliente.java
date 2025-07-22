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


public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)", unique = true, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String apellido;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String contraseña;

    @Column(nullable = false)
    private String rol; // "cliente"

    @Column(nullable = false)
    private double peso;

    @Column(nullable = false)
    private int altura;

    @Column(nullable = false)
    private int edad;

    @Column(nullable = false)
    private String objetivo;

    @Column(nullable = true)
    private String fotoPerfil;


    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    private List<Progreso> progresos;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    private List<Chat> chats;


    // Constructores
    public Cliente() {}

    public Cliente(String nombre, String apellido, String email, String contraseña, String rol,
                   double peso, int altura, int edad, String objetivo, String fotoPerfil) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.contraseña = contraseña;
        this.rol = rol;
        this.peso = peso;
        this.altura = altura;
        this.edad = edad;
        this.objetivo = objetivo;
        this.fotoPerfil = fotoPerfil;
    }

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

    public String getContraseña() {
        return contraseña;
    }

    public void setContraseña(String contraseña) {
        this.contraseña = contraseña;
    }

    public String getRol() {
        return rol;
    }

    public void setRol(String rol) {
        this.rol = rol;
    }

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

    public String getFotoPerfil() {
        return fotoPerfil;
    }

    public void setFotoPerfil(String fotoPerfil) {
        this.fotoPerfil = fotoPerfil;
    }

    public List<Progreso> getProgresos() {
        return progresos;
    }

    public void setProgresos(List<Progreso> progresos) {
        this.progresos = progresos;
    }

    public List<Chat> getChats() {
        return chats;
    }

    public void setChats(List<Chat> chats) {
        this.chats = chats;
    }

    
}
   