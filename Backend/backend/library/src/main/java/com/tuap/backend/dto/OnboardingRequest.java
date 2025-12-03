package com.tuap.backend.dto;

import java.util.UUID;

public class OnboardingRequest {

    // Identificador clave para saber a quién actualizar
    private UUID idCliente;

    // Estos nombres coinciden EXACTAMENTE con el JSON de React (ClienteOnboarding.jsx)
    private String genero;
    private String fechaNacimiento; // Recibimos String (YYYY-MM-DD), luego calcularemos la edad en el Gestor
    private Double alturaCm;        // React envía "alturaCm"
    private Double pesoKg;          // React envía "pesoKg"
    private String objetivo;

    // Constructores (Opcional, pero recomendado)
    public OnboardingRequest() {}

    // Getters y Setters
    public UUID getIdCliente() { return idCliente; }
    public void setIdCliente(UUID idCliente) { this.idCliente = idCliente; }

    public String getGenero() { return genero; }
    public void setGenero(String genero) { this.genero = genero; }

    public String getFechaNacimiento() { return fechaNacimiento; }
    public void setFechaNacimiento(String fechaNacimiento) { this.fechaNacimiento = fechaNacimiento; }

    public Double getAlturaCm() { return alturaCm; }
    public void setAlturaCm(Double alturaCm) { this.alturaCm = alturaCm; }

    public Double getPesoKg() { return pesoKg; }
    public void setPesoKg(Double pesoKg) { this.pesoKg = pesoKg; }

    public String getObjetivo() { return objetivo; }
    public void setObjetivo(String objetivo) { this.objetivo = objetivo; }
}