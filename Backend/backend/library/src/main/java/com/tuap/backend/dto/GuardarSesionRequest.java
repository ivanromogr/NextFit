package com.tuap.backend.dto;

import java.util.List;
import java.util.UUID;

public class GuardarSesionRequest {
    private UUID clienteId;
    private UUID rutinaId; // puede ser null
    private int duracionSegundos;
    private String notasGenerales;
    private List<SerieDTO> series;

    public static class SerieDTO {
        public UUID ejercicioId;
        public int setIndex;
        public Float peso;
        public Integer reps;
        public Integer rpe;
        public boolean hecho;
    }

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
}
