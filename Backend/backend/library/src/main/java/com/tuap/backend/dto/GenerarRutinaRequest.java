package com.tuap.backend.dto;

import java.util.UUID;

public class GenerarRutinaRequest {
    
    private UUID idCliente;
    private String lugar;        // "GIMNASIO" o "CASA"
    private String nivel;        // "PRINCIPIANTE", "INTERMEDIO"
    private int diasPorSemana;   // 3, 4, 5
    private String objetivo;     // "GANAR_MASA", "FUERZA", "PERDER_GRASA"

    public GenerarRutinaRequest() {}

    // Getters y Setters
    public UUID getIdCliente() { return idCliente; }
    public void setIdCliente(UUID idCliente) { this.idCliente = idCliente; }
    
    public String getLugar() { return lugar; }
    public void setLugar(String lugar) { this.lugar = lugar; }
    
    public String getNivel() { return nivel; }
    public void setNivel(String nivel) { this.nivel = nivel; }
    
    public int getDiasPorSemana() { return diasPorSemana; }
    public void setDiasPorSemana(int diasPorSemana) { this.diasPorSemana = diasPorSemana; }
    
    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }
}