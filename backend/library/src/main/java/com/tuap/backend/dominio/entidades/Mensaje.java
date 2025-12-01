package com.tuap.backend.dominio.entidades;

import java.util.Date;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "mensaje")
public class Mensaje {
    @Id
    private UUID id;
    @Column(nullable = false)
    private UUID chatid;
    @Column(nullable = false)
    private UUID remitenteid;
    @Column(nullable = false)
    private String contenido;
    @Column(nullable = false)
    private Date timestamp;

    public Mensaje() {
    }
    
    public Mensaje(UUID id, UUID chatid, UUID remitenteid, String contenido, Date timestamp) {
        this.id = id;
        this.chatid = chatid;
        this.remitenteid = remitenteid;
        this.contenido = contenido;
        this.timestamp = timestamp;
    }


    //Getters
    public UUID getId() {
        return id;
    }

    public UUID getChatid() {
        return chatid;
    }

    public UUID getRemitenteid() {
        return remitenteid;
    }

    public String getContenido() {
        return contenido;
    }

    public Date getTimestamp() {
        return timestamp;
    }

    //Setters

    public void setId(UUID id) {
        this.id = id;
    }

    public void setChatid(UUID chatid) {
        this.chatid = chatid;
    }

    public void setRemitenteid(UUID remitenteid) {
        this.remitenteid = remitenteid;
    }

    public void setContenido(String contenido) {
        this.contenido = contenido;
    }

    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }
    
    
}
