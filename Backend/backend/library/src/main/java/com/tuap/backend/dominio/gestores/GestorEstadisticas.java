package com.tuap.backend.dominio.gestores;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Collections; // 🧹 Agregado
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.tuap.backend.dominio.entidades.SerieRealizada;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.SerieRealizadaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@Service
public class GestorEstadisticas {

    private static final String KEY_ES_RECIENTE = "esReciente";
    private final SesionEntrenamientoDAO sesionDAO;
    private final SerieRealizadaDAO serieDAO;

    public GestorEstadisticas(SesionEntrenamientoDAO sesionDAO, SerieRealizadaDAO serieDAO) {
        this.sesionDAO = sesionDAO;
        this.serieDAO = serieDAO;
    }

    private List<SesionEntrenamiento> filtrarPorEntrenador(List<SesionEntrenamiento> sesiones, UUID entrenadorId) {
        if (entrenadorId == null) return sesiones;
        return sesiones.stream()
                .filter(s -> s.getRutina() != null && 
                             s.getRutina().getEntrenadorId() != null && 
                             s.getRutina().getEntrenadorId().equals(entrenadorId))
                .toList(); 
    }

    public Map<String, Object> obtenerStatsGlobales(UUID clienteId, UUID entrenadorId) {
        List<SesionEntrenamiento> todasLasSesiones = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId);
        List<SesionEntrenamiento> sesiones = filtrarPorEntrenador(todasLasSesiones, entrenadorId);

        int totalEntrenos = sesiones.size();
        double volumenTotalHistorico = sesiones.stream().mapToDouble(SesionEntrenamiento::getVolumenTotal).sum();
        int minutosTotales = sesiones.stream().mapToInt(SesionEntrenamiento::getDuracionSegundos).sum() / 60;

        LocalDateTime ahora = LocalDateTime.now();
        double volumenUltimos7Dias = calcularVolumenRango(sesiones, ahora.minusDays(7), null);
        double volumenSemanaPrevia = calcularVolumenRango(sesiones, ahora.minusDays(14), ahora.minusDays(7));

        double porcentajeCambio = calcularPorcentajeCambio(volumenUltimos7Dias, volumenSemanaPrevia);

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEntrenos", totalEntrenos);
        stats.put("volumenTotal", Math.round(volumenTotalHistorico / 1000.0) + "t");
        stats.put("horasEntrenadas", Math.round(minutosTotales / 60.0));
        stats.put("comparativaVolumen", Math.round(porcentajeCambio));
        stats.put("graficaSemanal", generarGraficaSemanal(sesiones));
        stats.put("graficaDiaria", generarGraficaDiaria(sesiones));
        stats.put("distribucionMuscular", calcularDistribucionMuscular(sesiones));
        
        return stats;
    }

    public Map<String, Object> obtenerProgresoEjercicio(UUID clienteId, UUID ejercicioId, UUID entrenadorId) {
         List<SerieRealizada> historia = serieDAO.findHistorialEjercicio(clienteId, ejercicioId).stream()
                 .filter(serie -> entrenadorId == null || (serie.getSesion().getRutina() != null && 
                        entrenadorId.equals(serie.getSesion().getRutina().getEntrenadorId())))
                 .toList(); 

         // 🧹 SOLUCIÓN SONARQUBE: Devolver mapa vacío en lugar de null
         if (historia.isEmpty()) return Collections.emptyMap();

         List<Map<String, Object>> puntosGrafica = new ArrayList<>();
         Map<SesionEntrenamiento, List<SerieRealizada>> porSesion = historia.stream()
                 .collect(java.util.stream.Collectors.groupingBy(SerieRealizada::getSesion));

         List<SesionEntrenamiento> sesionesOrdenadas = porSesion.keySet().stream()
                 .sorted(Comparator.comparing(SesionEntrenamiento::getFechaHora))
                 .toList(); 
         
         DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

         for (SesionEntrenamiento sesion : sesionesOrdenadas) {
             double max1RMDia = calcularMax1RM(porSesion.get(sesion));
             if (max1RMDia > 0) {
                 Map<String, Object> punto = new HashMap<>();
                 punto.put("fecha", sesion.getFechaHora().format(formatter));
                 punto.put("valor", Math.round(max1RMDia * 100.0) / 100.0);
                 puntosGrafica.add(punto);
             }
         }

         Map<String, Object> respuesta = new HashMap<>();
         respuesta.put("grafica", puntosGrafica);
         respuesta.put("pr", historia.stream().mapToDouble(SerieRealizada::getPeso).max().orElse(0.0));
         return respuesta;
    }

    public List<Map<String, Object>> obtenerPersonalRecords(UUID clienteId, UUID entrenadorId) {
        List<SesionEntrenamiento> sesiones = filtrarPorEntrenador(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId), entrenadorId);
        Map<String, SerieRealizada> mejoresLevantamientos = buscarMejoresLevantamientos(sesiones);

        List<Map<String, Object>> prList = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy");
        LocalDateTime hace7Dias = LocalDateTime.now().minusDays(7);

        for (Map.Entry<String, SerieRealizada> entry : mejoresLevantamientos.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            SerieRealizada s = entry.getValue();
            item.put("ejercicio", entry.getKey());
            item.put("peso", s.getPeso());
            item.put("fecha", s.getSesion().getFechaHora().format(fmt));
            item.put(KEY_ES_RECIENTE, s.getSesion().getFechaHora().isAfter(hace7Dias));
            prList.add(item);
        }

        prList.sort((a, b) -> {
            if (!a.get(KEY_ES_RECIENTE).equals(b.get(KEY_ES_RECIENTE))) {
                return (boolean) a.get(KEY_ES_RECIENTE) ? -1 : 1;
            }
            return Double.compare((Double)b.get("peso"), (Double)a.get("peso"));
        });

        return prList;
    }

    public List<Map<String, Object>> obtenerEjerciciosConHistorial(UUID clienteId, UUID entrenadorId) {
        List<SesionEntrenamiento> sesiones = filtrarPorEntrenador(sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId), entrenadorId);
        Map<UUID, Map<String, Object>> ejercicios = new LinkedHashMap<>();

        for (SesionEntrenamiento sesion : sesiones) {
            for (SerieRealizada serie : sesion.getSeries()) {
                if (!serie.isHecho() || serie.getEjercicio() == null) continue;
                UUID ejercicioId = serie.getEjercicio().getId();
                ejercicios.computeIfAbsent(ejercicioId, id -> {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", id);
                    item.put("nombre", serie.getEjercicio().getNombre());
                    item.put("nombreTraducido", serie.getEjercicio().getNombreTraducido());
                    item.put("grupoMuscular", serie.getEjercicio().getGrupoMuscular());
                    item.put("imagenUrl", serie.getEjercicio().getImagenUrl());
                    return item;
                });
            }
        }

        return new ArrayList<>(ejercicios.values());
    }

    public List<Map<String, Object>> obtenerDatosProgreso(UUID clienteId, UUID ejercicioId, UUID entrenadorId) {
        return serieDAO.findHistorialEjercicio(clienteId, ejercicioId).stream()
                .filter(serie -> entrenadorId == null || (serie.getSesion().getRutina() != null
                        && entrenadorId.equals(serie.getSesion().getRutina().getEntrenadorId())))
                .map(serie -> {
                    Map<String, Object> punto = new HashMap<>();
                    punto.put("fecha", serie.getSesion().getFechaHora().format(DateTimeFormatter.ISO_LOCAL_DATE));
                    punto.put("peso", serie.getPeso());
                    punto.put("reps", serie.getReps());
                    punto.put("rpe", serie.getRpe());
                    punto.put("volumen", serie.getVolumenSerie());
                    punto.put("valor", Math.round(calcularMax1RM(List.of(serie)) * 100.0) / 100.0);
                    return punto;
                })
                .toList();
    }

    // --- MÉTODOS PRIVADOS DE APOYO ---

    private double calcularMax1RM(List<SerieRealizada> seriesDia) {
        double max = 0;
        for (SerieRealizada s : seriesDia) {
            if (s.getPeso() > 0 && s.getReps() > 0) {
                double e1rm = s.getPeso() * (1 + (s.getReps() / 30.0));
                if (e1rm > max) max = e1rm;
            }
        }
        return max;
    }

    private Map<String, SerieRealizada> buscarMejoresLevantamientos(List<SesionEntrenamiento> sesiones) {
        Map<String, SerieRealizada> mejores = new HashMap<>();
        for (SesionEntrenamiento sesion : sesiones) {
            for (SerieRealizada serie : sesion.getSeries()) {
                if (serie.isHecho() && serie.getPeso() > 0) {
                    String nombre = serie.getEjercicio().getNombre();
                    // 🧹 SOLUCIÓN SONARQUBE: Uso de merge para simplificar lógica de "máximo"
                    mejores.merge(nombre, serie, (existente, nueva) -> 
                        nueva.getPeso() > existente.getPeso() ? nueva : existente
                    );
                }
            }
        }
        return mejores;
    }

    private double calcularVolumenRango(List<SesionEntrenamiento> sesiones, LocalDateTime inicio, LocalDateTime fin) {
        return sesiones.stream()
            .filter(s -> s.getFechaHora().isAfter(inicio) && (fin == null || s.getFechaHora().isBefore(fin)))
            .mapToDouble(SesionEntrenamiento::getVolumenTotal).sum();
    }

    private double calcularPorcentajeCambio(double actual, double previa) {
        if (previa > 0) return ((actual - previa) / previa) * 100.0;
        return actual > 0 ? 100.0 : 0.0;
    }

    private List<Map<String, Object>> calcularDistribucionMuscular(List<SesionEntrenamiento> sesiones) {
        Map<String, Integer> conteo = new HashMap<>();
        for (SesionEntrenamiento s : sesiones) {
            for (SerieRealizada serie : s.getSeries()) {
                if (serie.isHecho() && serie.getEjercicio() != null && serie.getEjercicio().getGrupoMuscular() != null) {
                    String m = serie.getEjercicio().getGrupoMuscular();
                    // 🧹 Mejora extra: Uso de merge
                    conteo.merge(m, 1, Integer::sum);
                }
            }
        }
        return conteo.entrySet().stream().map(e -> {
            Map<String, Object> map = new HashMap<>();
            map.put("musculo", e.getKey());
            map.put("series", e.getValue());
            return map;
        }).toList(); 
    }

    private List<Map<String, Object>> generarGraficaSemanal(List<SesionEntrenamiento> sesiones) {
        Map<String, Integer> mapa = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM");
        
        List<SesionEntrenamiento> crono = sesiones.reversed();

        for (SesionEntrenamiento s : crono) {
            LocalDateTime inicioSemana = s.getFechaHora().with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1);
            String label = inicioSemana.format(fmt);
            // 🧹 Mejora extra: Uso de merge
            mapa.merge(label, 1, Integer::sum);
        }
        
        List<Map<String, Object>> lista = mapa.entrySet().stream().map(e -> {
            Map<String, Object> p = new HashMap<>();
            p.put("label", e.getKey());
            p.put("cantidad", e.getValue());
            return p;
        }).toList(); 

        return lista.size() > 12 ? lista.subList(lista.size() - 12, lista.size()) : lista;
    }

    private List<Map<String, Object>> generarGraficaDiaria(List<SesionEntrenamiento> sesiones) {
        Map<String, Integer> mapa = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd");
        LocalDateTime hoy = LocalDateTime.now();

        for (int i = 13; i >= 0; i--) {
            mapa.put(hoy.minusDays(i).format(fmt), 0);
        }

        for (SesionEntrenamiento s : sesiones) {
            String label = s.getFechaHora().format(fmt);
            if (s.getFechaHora().isAfter(hoy.minusDays(14))) {
                // 🧹 SOLUCIÓN SONARQUBE: Uso de computeIfPresent para actualizar solo si existe
                mapa.computeIfPresent(label, (k, v) -> v + 1);
            }
        }

        return mapa.entrySet().stream().map(e -> {
            Map<String, Object> p = new HashMap<>();
            p.put("label", e.getKey());
            p.put("cantidad", e.getValue());
            return p;
        }).toList(); 
    }
}
