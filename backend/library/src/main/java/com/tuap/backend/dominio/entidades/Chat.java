package com.tuap.backend.dominio.entidades;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "chat")
public class Chat {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;
    private UUID clienteid;
    private UUID entrenadorid;

    @ManyToOne
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne
    @JoinColumn(name = "entrenador_id", nullable = false)
    private Entrenador entrenador;

    public Chat() {
    }

    public Chat(UUID id, UUID clienteid, UUID entrenadorid) {
        this.id = id;
        this.clienteid = clienteid;
        this.entrenadorid = entrenadorid;
    }

    //Getters  
    public UUID getId() {
        return id;
    }

    public UUID getClienteid() {
        return clienteid;
    }

    public UUID getEntrenadorid() {
        return entrenadorid;
    }

    //Setters

    public void setId(UUID id) {
        this.id = id;
    }

    public void setClienteid(UUID clienteid) {
        this.clienteid = clienteid;
    }

    public void setEntrenadorid(UUID entrenadorid) {
        this.entrenadorid = entrenadorid;
    }

    
}
