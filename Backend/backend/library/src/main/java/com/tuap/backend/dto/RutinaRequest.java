package com.tuap.backend.dto;

import java.util.List;
import java.util.UUID;

public class RutinaRequest {
    
    private UUID idCliente;
    private String nombre;
    private String objetivo;
    private String descripcion;
    private String nivel; // Nuevo campo
    
    // Lista de ejercicios seleccionados
    private List<EjercicioDetalleDTO> ejercicios;

    // Getters y Setters
    public UUID getIdCliente() { return idCliente; }
    public void setIdCliente(UUID idCliente) { this.idCliente = idCliente; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    
    public String getNivel() { return nivel; }
    public void setNivel(String nivel) { this.nivel = nivel; }

    public List<EjercicioDetalleDTO> getEjercicios() { return ejercicios; }
    public void setEjercicios(List<EjercicioDetalleDTO> ejercicios) { this.ejercicios = ejercicios; }

    // --- CLASE INTERNA ACTUALIZADA ---
    public static class EjercicioDetalleDTO {
        private UUID idEjercicio;
        private int series;
        private int repeticiones;
        private String notas;
        
        // Campos nuevos para el modo manual
        private Float peso;
        private Integer rpe;

        public UUID getIdEjercicio() { return idEjercicio; }
        public void setIdEjercicio(UUID idEjercicio) { this.idEjercicio = idEjercicio; }

        public int getSeries() { return series; }
        public void setSeries(int series) { this.series = series; }

        public int getRepeticiones() { return repeticiones; }
        public void setRepeticiones(int repeticiones) { this.repeticiones = repeticiones; }
        
        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }
        
        public Float getPeso() { return peso; }
        public void setPeso(Float peso) { this.peso = peso; }
        
        public Integer getRpe() { return rpe; }
        public void setRpe(Integer rpe) { this.rpe = rpe; }
    }
}