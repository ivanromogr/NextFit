package com.tuap.backend.dominio.entidades;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "rutina")
public class Rutina {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    private String nombre;
    private String objetivo;
    private String descripcion;
    private String nivel;

    // ✅ Campo correcto
    @Column(nullable = false)
    private String creador; 

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @OneToMany(mappedBy = "rutina", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonIgnoreProperties("rutina")
    private List<DetalleRutina> detalles = new ArrayList<>();

    public Rutina() {}

    // --- GETTERS Y SETTERS ---

   
    public String getCreador() { 
        return creador; 
    }

    public void setCreador(String creador) { 
        this.creador = creador; 
    }
    // -------------------------------------------------------------------------

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
    public void setDetalles(List<DetalleRutina> detalles) { 
        if (this.detalles == null) {
            this.detalles = detalles;
        } else {
            this.detalles.clear();
            if (detalles != null) {
                this.detalles.addAll(detalles);
            }
        }
    }
}