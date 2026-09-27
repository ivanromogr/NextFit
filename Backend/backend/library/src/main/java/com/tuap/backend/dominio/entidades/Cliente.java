package com.tuap.backend.dominio.entidades;

import java.util.List;
import java.util.UUID;
import java.time.Instant;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties; 
import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;

@Entity
public class Cliente {

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
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String contrasena; 

    @Column(nullable = false)
    private String rol;

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

    @Column(nullable = false)
    private String genero;
    @Column(nullable = false) private boolean active = true;
    private Instant deletedAt;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("cliente")
    private List<Progreso> progresos;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("cliente")
    private List<Chat> chats;

    @OneToMany(mappedBy = "cliente", cascade = CascadeType.ALL)
    @JsonIgnoreProperties({"cliente", "detalles"})
    private List<Rutina> rutinas;

    @ManyToOne
    @JoinColumn(name = "entrenador_id")
    @JsonIgnoreProperties("clientes") 
    private Entrenador entrenador;

    // Constructores
    public Cliente() {}

    public Cliente(String nombre, String apellido, String email, String contrasena, String rol,
                   double peso, int altura, int edad, String objetivo, String fotoPerfil, String genero) {
        this.nombre = nombre;
        this.apellido = apellido;
        this.email = email;
        this.contrasena = contrasena; 
        this.rol = rol;
        this.peso = peso;
        this.altura = altura;
        this.edad = edad;
        this.objetivo = objetivo;
        this.fotoPerfil = fotoPerfil;
        this.genero = genero;
    }

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    //  Actualizados Getter y Setter
    public String getContrasena() { return contrasena; }
    public void setContrasena(String contrasena) { this.contrasena = contrasena; }

    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }

    public double getPeso() { return peso; }
    public void setPeso(double peso) { this.peso = peso; }

    public int getAltura() { return altura; }
    public void setAltura(int altura) { this.altura = altura; }

    public int getEdad() { return edad; }
    public void setEdad(int edad) { this.edad = edad; }

    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }

    public String getFotoPerfil() { return fotoPerfil; }
    public void setFotoPerfil(String fotoPerfil) { this.fotoPerfil = fotoPerfil; }

    public List<Progreso> getProgresos() { return progresos; }
    public void setProgresos(List<Progreso> progresos) { this.progresos = progresos; }

    public List<Chat> getChats() { return chats; }
    public void setChats(List<Chat> chats) { this.chats = chats; }

    public List<Rutina> getRutinas() { return rutinas; }
    public void setRutinas(List<Rutina> rutinas) { this.rutinas = rutinas; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public Entrenador getEntrenador() { return entrenador; }
    public void setEntrenador(Entrenador entrenador) { this.entrenador = entrenador; }
    public boolean isActive() { return active; } public void setActive(boolean active) { this.active = active; }
    public Instant getDeletedAt() { return deletedAt; } public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
