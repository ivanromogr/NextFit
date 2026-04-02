package com.tuap.backend.dto;

import java.util.UUID;

public class EjercicioResponse {

    private UUID id;
    private String apiId;
    private String nombre;
    private String nombreTraducido;
    private String grupoMuscular;
    private String grupoMuscularTraducido;
    private String equipamiento;
    private String parteCuerpo;
    private String parteCuerpoTraducida;
    private String imagenUrl;
    private String videoUrl;
    private String dificultad;
    private String instrucciones;

    public EjercicioResponse() {
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getApiId() {
        return apiId;
    }

    public void setApiId(String apiId) {
        this.apiId = apiId;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getNombreTraducido() {
        return nombreTraducido;
    }

    public void setNombreTraducido(String nombreTraducido) {
        this.nombreTraducido = nombreTraducido;
    }

    public String getGrupoMuscular() {
        return grupoMuscular;
    }

    public void setGrupoMuscular(String grupoMuscular) {
        this.grupoMuscular = grupoMuscular;
    }

    public String getGrupoMuscularTraducido() {
        return grupoMuscularTraducido;
    }

    public void setGrupoMuscularTraducido(String grupoMuscularTraducido) {
        this.grupoMuscularTraducido = grupoMuscularTraducido;
    }

    public String getEquipamiento() {
        return equipamiento;
    }

    public void setEquipamiento(String equipamiento) {
        this.equipamiento = equipamiento;
    }

    public String getParteCuerpo() {
        return parteCuerpo;
    }

    public void setParteCuerpo(String parteCuerpo) {
        this.parteCuerpo = parteCuerpo;
    }

    public String getParteCuerpoTraducida() {
        return parteCuerpoTraducida;
    }

    public void setParteCuerpoTraducida(String parteCuerpoTraducida) {
        this.parteCuerpoTraducida = parteCuerpoTraducida;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }

    public String getVideoUrl() {
        return videoUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
    }

    public String getDificultad() {
        return dificultad;
    }

    public void setDificultad(String dificultad) {
        this.dificultad = dificultad;
    }

    public String getInstrucciones() {
        return instrucciones;
    }

    public void setInstrucciones(String instrucciones) {
        this.instrucciones = instrucciones;
    }
}