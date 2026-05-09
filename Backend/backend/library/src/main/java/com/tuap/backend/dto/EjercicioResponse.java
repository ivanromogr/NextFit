package com.tuap.backend.dto;

import java.util.UUID;

public class EjercicioResponse {

    private UUID id;
    private String apiId;
    private String slug;
    private String nombre;
    private String nombreTraducido;
    private String grupoMuscular;
    private String grupoMuscularTraducido;
    private String subgrupoMuscular;
    private String equipamiento;
    private String parteCuerpo;
    private String parteCuerpoTraducida;
    private String imagenUrl;
    private String imagenPaso1;
    private String imagenPaso2;
    private String imagenPaso3;
    private String videoUrl;
    private String dificultad;
    private String nivel;
    private String tipoMovimiento;
    private String descripcionCorta;
    private String instrucciones;
    private String consejosTecnicos;
    private String erroresComunes;
    private Boolean tieneAnimacion;
    private String tipoVisual;
    private String origen;
    private Boolean activo;

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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
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

    public String getSubgrupoMuscular() {
        return subgrupoMuscular;
    }

    public void setSubgrupoMuscular(String subgrupoMuscular) {
        this.subgrupoMuscular = subgrupoMuscular;
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

    public String getImagenPaso1() {
        return imagenPaso1;
    }

    public void setImagenPaso1(String imagenPaso1) {
        this.imagenPaso1 = imagenPaso1;
    }

    public String getImagenPaso2() {
        return imagenPaso2;
    }

    public void setImagenPaso2(String imagenPaso2) {
        this.imagenPaso2 = imagenPaso2;
    }

    public String getImagenPaso3() {
        return imagenPaso3;
    }

    public void setImagenPaso3(String imagenPaso3) {
        this.imagenPaso3 = imagenPaso3;
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

    public String getNivel() {
        return nivel;
    }

    public void setNivel(String nivel) {
        this.nivel = nivel;
    }

    public String getTipoMovimiento() {
        return tipoMovimiento;
    }

    public void setTipoMovimiento(String tipoMovimiento) {
        this.tipoMovimiento = tipoMovimiento;
    }

    public String getDescripcionCorta() {
        return descripcionCorta;
    }

    public void setDescripcionCorta(String descripcionCorta) {
        this.descripcionCorta = descripcionCorta;
    }

    public String getInstrucciones() {
        return instrucciones;
    }

    public void setInstrucciones(String instrucciones) {
        this.instrucciones = instrucciones;
    }

    public String getConsejosTecnicos() {
        return consejosTecnicos;
    }

    public void setConsejosTecnicos(String consejosTecnicos) {
        this.consejosTecnicos = consejosTecnicos;
    }

    public String getErroresComunes() {
        return erroresComunes;
    }

    public void setErroresComunes(String erroresComunes) {
        this.erroresComunes = erroresComunes;
    }

    public Boolean getTieneAnimacion() {
        return tieneAnimacion;
    }

    public void setTieneAnimacion(Boolean tieneAnimacion) {
        this.tieneAnimacion = tieneAnimacion;
    }

    public String getTipoVisual() {
        return tipoVisual;
    }

    public void setTipoVisual(String tipoVisual) {
        this.tipoVisual = tipoVisual;
    }

    public String getOrigen() {
        return origen;
    }

    public void setOrigen(String origen) {
        this.origen = origen;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }
}
