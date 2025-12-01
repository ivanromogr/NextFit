package com.tuap.backend.dominio.entidades;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

@Entity
@Table(name = "ejercicio")
public class Ejercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(columnDefinition = "BINARY(16)", unique = true, nullable = false)
    private UUID id;

    // ID externo de la API (para evitar duplicados al importar)
    @Column(unique = true)
    private String apiId; 

    @Column(nullable = false)
    private String nombre;

    @Column(nullable = false)
    private String grupoMuscular; // Ej: "chest", "back"

    @Column(nullable = false)
    private String equipamiento; // Ej: "barbell", "body weight"

    @Column(nullable = false)
    private String parteCuerpo; // Ej: "upper arms", "waist"

    @Column
    private String gifUrl; // El GIF animado vital para la app

    @Lob // Permite textos muy largos
    @Column(columnDefinition = "TEXT")
    private String instrucciones; 

    // Constructor vacío obligatorio para JPA
    public Ejercicio() {}

    // Getters y Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getApiId() { return apiId; }
    public void setApiId(String apiId) { this.apiId = apiId; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getGrupoMuscular() { return grupoMuscular; }
    public void setGrupoMuscular(String grupoMuscular) { this.grupoMuscular = grupoMuscular; }

    public String getEquipamiento() { return equipamiento; }
    public void setEquipamiento(String equipamiento) { this.equipamiento = equipamiento; }

    public String getParteCuerpo() { return parteCuerpo; }
    public void setParteCuerpo(String parteCuerpo) { this.parteCuerpo = parteCuerpo; }

    public String getGifUrl() { return gifUrl; }
    public void setGifUrl(String gifUrl) { this.gifUrl = gifUrl; }

    public String getInstrucciones() { return instrucciones; }
    public void setInstrucciones(String instrucciones) { this.instrucciones = instrucciones; }
}