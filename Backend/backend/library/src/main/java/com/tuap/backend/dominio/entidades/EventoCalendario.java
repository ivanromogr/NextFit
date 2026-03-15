package com.tuap.backend.dominio.entidades;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "evento_calendario")
public class EventoCalendario {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)")
    private UUID id;

    @Column(nullable = false)
    private LocalDate fecha; // El día programado

    @ManyToOne(fetch = FetchType.EAGER) // Eager para traer el nombre de la rutina directamente
    @JoinColumn(name = "rutina_id", nullable = false)
    private Rutina rutina;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;
    @Column(nullable = true)
    private Integer duracionSegundos; // Para guardar cuánto tardó

    @Column(nullable = true)
    private Double volumenTotal;

    @Column(name = "entrenador_id")
    private UUID entrenadorId;

    private boolean completado; // Para marcar si ya se hizo

    public EventoCalendario() {}

    public EventoCalendario(LocalDate fecha, Rutina rutina, Cliente cliente) {
        this.fecha = fecha;
        this.rutina = rutina;
        this.cliente = cliente;
        this.completado = false;
    }

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public Rutina getRutina() { return rutina; }
    public void setRutina(Rutina rutina) { this.rutina = rutina; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public boolean isCompletado() { return completado; }
    public void setCompletado(boolean completado) { this.completado = completado; }
    public Integer getDuracionSegundos() { return duracionSegundos; }
    public void setDuracionSegundos(Integer duracionSegundos) { this.duracionSegundos = duracionSegundos; }
    public Double getVolumenTotal() { return volumenTotal; }
    public void setVolumenTotal(Double volumenTotal) { this.volumenTotal = volumenTotal; }

    public UUID getEntrenadorId() {
        return entrenadorId;
    }

    public void setEntrenadorId(UUID entrenadorId) {
        this.entrenadorId = entrenadorId;
    }
}