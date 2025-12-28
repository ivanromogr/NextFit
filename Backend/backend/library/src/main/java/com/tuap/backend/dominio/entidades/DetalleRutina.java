package com.tuap.backend.dominio.entidades;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "detalle_rutina")
public class DetalleRutina {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    // A qué rutina pertenece esta fila
    @ManyToOne
    @JoinColumn(name = "rutina_id", nullable = false)
    @JsonIgnoreProperties("detalles") // Evita bucle infinito
    private Rutina rutina;

    // Qué ejercicio es
    @ManyToOne
    @JoinColumn(name = "ejercicio_id", nullable = false)
    private Ejercicio ejercicio;

    private int series;
    private int repeticiones;
    private String notas; 

    // --- NUEVOS CAMPOS ---
    // Usamos Float e Integer (objetos) para permitir nulos si fuera necesario
    private Float peso; 
    private Integer rpe; // Rating of Perceived Exertion (1-10)

    public DetalleRutina() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Rutina getRutina() { return rutina; }
    public void setRutina(Rutina rutina) { this.rutina = rutina; }

    public Ejercicio getEjercicio() { return ejercicio; }
    public void setEjercicio(Ejercicio ejercicio) { this.ejercicio = ejercicio; }

    public int getSeries() { return series; }
    public void setSeries(int series) { this.series = series; }

    public int getRepeticiones() { return repeticiones; }
    public void setRepeticiones(int repeticiones) { this.repeticiones = repeticiones; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    // --- GETTERS Y SETTERS NUEVOS ---
    public Float getPeso() { return peso; }
    public void setPeso(Float peso) { this.peso = peso; }

    public Integer getRpe() { return rpe; }
    public void setRpe(Integer rpe) { this.rpe = rpe; }
}