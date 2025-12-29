package com.tuap.backend.dto;

import java.util.List;
import java.util.UUID;

public class RutinaRequest {

    private UUID idCliente;
    private String nombre;
    private String descripcion;
    private String objetivo;
    
    // ✅ 1. CAMPO NUEVO PARA SOLUCIONAR EL PRIMER ERROR
    private String creador; 

    private List<EjercicioDetalleDTO> ejercicios;

    // Getters y Setters
    public UUID getIdCliente() { return idCliente; }
    public void setIdCliente(UUID idCliente) { this.idCliente = idCliente; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }

    // ✅ Getter y Setter para Creador (¡ESTO ES LO QUE FALTABA!)
    public String getCreador() { return creador; }
    public void setCreador(String creador) { this.creador = creador; }

    public List<EjercicioDetalleDTO> getEjercicios() { return ejercicios; }
    public void setEjercicios(List<EjercicioDetalleDTO> ejercicios) { this.ejercicios = ejercicios; }

    // Clase interna para los detalles del ejercicio
    public static class EjercicioDetalleDTO {
        private UUID idEjercicio;
        private int series;
        private int repeticiones;
        
        // ✅ 2. CAMBIO DE TIPO: De double a Float para solucionar el segundo error
        private Float peso; 
        
        private int rpe;
        private String notas;

        public UUID getIdEjercicio() { return idEjercicio; }
        public void setIdEjercicio(UUID idEjercicio) { this.idEjercicio = idEjercicio; }

        public int getSeries() { return series; }
        public void setSeries(int series) { this.series = series; }

        public int getRepeticiones() { return repeticiones; }
        public void setRepeticiones(int repeticiones) { this.repeticiones = repeticiones; }

        // Getters y Setters de Peso como Float
        public Float getPeso() { return peso; }
        public void setPeso(Float peso) { this.peso = peso; }

        public int getRpe() { return rpe; }
        public void setRpe(int rpe) { this.rpe = rpe; }

        public String getNotas() { return notas; }
        public void setNotas(String notas) { this.notas = notas; }
    }
}