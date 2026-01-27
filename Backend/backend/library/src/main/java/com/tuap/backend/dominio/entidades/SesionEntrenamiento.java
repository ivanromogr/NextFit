package com.tuap.backend.dominio.entidades;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "sesion_entrenamiento")
public class SesionEntrenamiento {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    // Relación opcional: Si el entreno venía de una Rutina planificada
    @ManyToOne
    @JoinColumn(name = "rutina_id")
    @JsonIgnoreProperties({"detalles", "cliente"})
    private Rutina rutina;

    private String nombre; // Ej: "Torso Pesado" o "Entreno Libre"

    @Column(nullable = false)
    private LocalDateTime fechaHora;

    private int duracionSegundos;
    private double volumenTotal; // Suma total de Kgs movidos

    @Lob
    @Column(columnDefinition = "TEXT")
    private String notasGenerales;

    // Lista de series reales
    @OneToMany(mappedBy = "sesion", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("sesion")
    private List<SerieRealizada> series = new ArrayList<>();

    public SesionEntrenamiento() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public Rutina getRutina() { return rutina; }
    public void setRutina(Rutina rutina) { this.rutina = rutina; }
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
    public List<SerieRealizada> getSeries() { return series; }
    public void setSeries(List<SerieRealizada> series) { this.series = series; }
}