package com.tuap.backend.dto;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class UltimaSesionResponse {
    private UUID id;
    private String nombre;
    private LocalDateTime fechaHora;
    private int duracionSegundos;
    private double volumenTotal;
    private String notasGenerales;
    private List<SerieResponse> series;

    public static class SerieResponse {
        public UUID ejercicioId;
        public String ejercicioNombre;
        public int setIndex;
        // Usamos Wrappers (Objetos) para permitir nulos sin romper la app
        public Double peso; 
        public Integer reps;
        public Integer rpe;
        public boolean hecho;

        // Constructor actualizado
        public SerieResponse(UUID ejercicioId, String ejercicioNombre, int setIndex, Double peso, Integer reps, Integer rpe, boolean hecho) {
            this.ejercicioId = ejercicioId;
            this.ejercicioNombre = ejercicioNombre;
            this.setIndex = setIndex;
            this.peso = peso;
            this.reps = reps;
            this.rpe = rpe;
            this.hecho = hecho;
        }

        // Getters
        public UUID getEjercicioId() { return ejercicioId; }
        public String getEjercicioNombre() { return ejercicioNombre; }
        public int getSetIndex() { return setIndex; }
        public Double getPeso() { return peso; }
        public Integer getReps() { return reps; }
        public Integer getRpe() { return rpe; }
        public boolean isHecho() { return hecho; }
    }

    public UltimaSesionResponse() {}

    public UltimaSesionResponse(UUID id, String nombre, LocalDateTime fechaHora, int duracionSegundos, 
                               double volumenTotal, String notasGenerales, List<SerieResponse> series) {
        this.id = id;
        this.nombre = nombre;
        this.fechaHora = fechaHora;
        this.duracionSegundos = duracionSegundos;
        this.volumenTotal = volumenTotal;
        this.notasGenerales = notasGenerales;
        this.series = series;
    }

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public int getDuracionSegundos() { return duracionSegundos; }
    public void setDuracionSegundos(int duracionSegundos) { this.duracionSegundos = duracionSegundos; }
    public double getVolumenTotal() { return volumenTotal; }
    public void setVolumenTotal(double volumenTotal) { this.volumenTotal = volumenTotal; }
    public String getNotasGenerales() { return notasGenerales; }
    public void setNotasGenerales(String notasGenerales) { this.notasGenerales = notasGenerales; }
    public List<SerieResponse> getSeries() { return series; }
    public void setSeries(List<SerieResponse> series) { this.series = series; }
}