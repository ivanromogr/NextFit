package com.tuap.backend.dto;

import java.util.List;
import java.util.UUID;

public class GuardarSesionRequest {
    private UUID clienteId;
    private UUID rutinaId; 
    private int duracionSegundos;
    private String notasGenerales;
    private List<SerieDTO> series;
    private UUID eventoCalendarioId;

    
    public static class SerieDTO {
        private UUID ejercicioId;
        private int setIndex;
        private Float peso;
        private Integer reps;
        private Integer rpe;
        private boolean hecho;

        // Getters y Setters para la clase interna
        public UUID getEjercicioId() { return ejercicioId; }
        public void setEjercicioId(UUID ejercicioId) { this.ejercicioId = ejercicioId; }

        public int getSetIndex() { return setIndex; }
        public void setSetIndex(int setIndex) { this.setIndex = setIndex; }

        public Float getPeso() { return peso; }
        public void setPeso(Float peso) { this.peso = peso; }

        public Integer getReps() { return reps; }
        public void setReps(Integer reps) { this.reps = reps; }

        public Integer getRpe() { return rpe; }
        public void setRpe(Integer rpe) { this.rpe = rpe; }

        public boolean isHecho() { return hecho; }
        public void setHecho(boolean hecho) { this.hecho = hecho; }
    }

    // Getters y Setters de la clase principal
    public UUID getClienteId() { return clienteId; }
    public void setClienteId(UUID clienteId) { this.clienteId = clienteId; }

    public UUID getRutinaId() { return rutinaId; }
    public void setRutinaId(UUID rutinaId) { this.rutinaId = rutinaId; }

    public int getDuracionSegundos() { return duracionSegundos; }
    public void setDuracionSegundos(int duracionSegundos) { this.duracionSegundos = duracionSegundos; }

    public String getNotasGenerales() { return notasGenerales; }
    public void setNotasGenerales(String notasGenerales) { this.notasGenerales = notasGenerales; }

    public List<SerieDTO> getSeries() { return series; }
    public void setSeries(List<SerieDTO> series) { this.series = series; }
    
    public UUID getEventoCalendarioId() { return eventoCalendarioId; }
    public void setEventoCalendarioId(UUID eventoCalendarioId) { this.eventoCalendarioId = eventoCalendarioId; }
}