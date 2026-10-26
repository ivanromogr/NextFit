package com.tuap.backend.dominio.entidades;

import java.util.UUID;
import com.tuap.backend.util.ExerciseMediaUrls;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ejercicio")
public class Ejercicio {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(unique = true)
    private String apiId;

    @Column(unique = true)
    private String slug;

    @Column(nullable = false)
    private String nombre;

    private String nombreTraducido;

    @Column(nullable = false)
    private String grupoMuscular;

    private String subgrupoMuscular;

    @Column(nullable = false)
    private String equipamiento;

    private String parteCuerpo;
    private String imagenUrl;
    private String imagenPaso1;
    private String imagenPaso2;
    private String imagenPaso3;
    private String videoUrl;
    private String dificultad;
    private String nivel;
    private String tipoMovimiento;
    private String descripcionCorta;
    private Boolean tieneAnimacion;
    private String tipoVisual;
    private String origen;
    private Boolean activo;

    @Column(columnDefinition = "TEXT")
    private String instrucciones;

    @Column(columnDefinition = "TEXT")
    private String consejosTecnicos;

    @Column(columnDefinition = "TEXT")
    private String erroresComunes;

    public Ejercicio() {
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

    public String getImagenUrl() {
        return ExerciseMediaUrls.forClient(apiId, imagenUrl);
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = ExerciseMediaUrls.forClient(apiId, imagenUrl);
    }

    public String getImagenPaso1() {
        return ExerciseMediaUrls.forClient(apiId, imagenPaso1);
    }

    public void setImagenPaso1(String imagenPaso1) {
        this.imagenPaso1 = ExerciseMediaUrls.forClient(apiId, imagenPaso1);
    }

    public String getImagenPaso2() {
        return ExerciseMediaUrls.forClient(apiId, imagenPaso2);
    }

    public void setImagenPaso2(String imagenPaso2) {
        this.imagenPaso2 = ExerciseMediaUrls.forClient(apiId, imagenPaso2);
    }

    public String getImagenPaso3() {
        return ExerciseMediaUrls.forClient(apiId, imagenPaso3);
    }

    public void setImagenPaso3(String imagenPaso3) {
        this.imagenPaso3 = ExerciseMediaUrls.forClient(apiId, imagenPaso3);
    }

    public String getVideoUrl() {
        return ExerciseMediaUrls.forClient(apiId, videoUrl);
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = ExerciseMediaUrls.forClient(apiId, videoUrl);
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
}
