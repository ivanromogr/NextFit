package com.tuap.backend.dto;

import java.util.List;
import java.util.UUID;

public class RutinaRequest {
    
    private UUID idCliente;
    private String nombre;
    private String objetivo;
    private String descripcion;
    
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

    public List<EjercicioDetalleDTO> getEjercicios() { return ejercicios; }
    public void setEjercicios(List<EjercicioDetalleDTO> ejercicios) { this.ejercicios = ejercicios; }

    // --- CLASE INTERNA PARA CADA EJERCICIO ---
    public static class EjercicioDetalleDTO {
        private UUID idEjercicio;
        private int series;
        private int repeticiones;
        private String notas;

        public UUID getIdEjercicio() { return idEjercicio; }
        public void setIdEjercicio(UUID idEjercicio) { this.idEjercicio = idEjercicio; }

        public int getSeries() { return series; }
        public void setSeries(int series) { this.series = series; }

        public int getRepeticiones() { return repeticiones; }
        public void setRepeticiones(int repeticiones) { this.repeticiones = repeticiones; }
        
        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }
    }
}