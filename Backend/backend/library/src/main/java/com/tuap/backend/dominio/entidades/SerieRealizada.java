package com.tuap.backend.dominio.entidades;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "serie_realizada")
public class SerieRealizada {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "sesion_id", nullable = false)
    @JsonIgnore // Evita errores de bucle infinito al convertir a JSON
    private SesionEntrenamiento sesion;

    @ManyToOne
    @JoinColumn(name = "ejercicio_id", nullable = false)
    private Ejercicio ejercicio;

    private int setIndex;
    private double peso;      // Double para permitir 12.5kg
    private int reps;
    private int rpe;
    private boolean hecho;
    
    // Guardamos el volumen de esta serie (peso * reps)
    private double volumenSerie; 

    public SerieRealizada() {
        // Constructor vacío necesario para JPA
    }

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public SesionEntrenamiento getSesion() { return sesion; }
    public void setSesion(SesionEntrenamiento sesion) { this.sesion = sesion; }
    public Ejercicio getEjercicio() { return ejercicio; }
    public void setEjercicio(Ejercicio ejercicio) { this.ejercicio = ejercicio; }
    public int getSetIndex() { return setIndex; }
    public void setSetIndex(int setIndex) { this.setIndex = setIndex; }
    public double getPeso() { return peso; }
    public void setPeso(double peso) { this.peso = peso; }
    public int getReps() { return reps; }
    public void setReps(int reps) { this.reps = reps; }
    public int getRpe() { return rpe; }
    public void setRpe(int rpe) { this.rpe = rpe; }
    public boolean isHecho() { return hecho; }
    public void setHecho(boolean hecho) { this.hecho = hecho; }
    public double getVolumenSerie() { return volumenSerie; }
    public void setVolumenSerie(double volumenSerie) { this.volumenSerie = volumenSerie; }
}