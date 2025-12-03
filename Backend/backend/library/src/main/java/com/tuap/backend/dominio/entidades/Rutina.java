package com.tuap.backend.dominio.entidades;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "rutina")
public class Rutina {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    private String nombre;       // Ej: "Rutina Full Body"
    private String objetivo;     // "FUERZA", "HIPERTROFIA"
    private String descripcion;  // "Creada automáticamente por IA"
    private String nivel;        // "PRINCIPIANTE"

    // Relación: Una rutina es de UN cliente
    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    // Relación: Una rutina tiene MUCHOS detalles (ejercicios con sus series)
    // "cascade = ALL" significa que si borras la rutina, se borran sus ejercicios asociados
    @OneToMany(mappedBy = "rutina", cascade = CascadeType.ALL)
    @JsonIgnoreProperties("rutina") // Evita bucle infinito al enviar a React
    private List<DetalleRutina> detalles;

    public Rutina() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getNivel() { return nivel; }
    public void setNivel(String nivel) { this.nivel = nivel; }

    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }

    public List<DetalleRutina> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleRutina> detalles) { this.detalles = detalles; }
}