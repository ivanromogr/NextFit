package com.tuap.backend.dominio.gestores;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.tuap.backend.dominio.entidades.SerieRealizada;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.persistencia.SerieRealizadaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@Service
public class GestorEstadisticas {

    @Autowired private SesionEntrenamientoDAO sesionDAO;
    @Autowired private SerieRealizadaDAO serieDAO;

    /**
     * Filtra una lista de sesiones por el entrenador que creó la rutina original.
     */
    private List<SesionEntrenamiento> filtrarPorEntrenador(List<SesionEntrenamiento> sesiones, UUID entrenadorId) {
        if (entrenadorId == null) return sesiones;
        return sesiones.stream()
                .filter(s -> s.getRutina() != null && 
                             s.getRutina().getEntrenadorId() != null && 
                             s.getRutina().getEntrenadorId().equals(entrenadorId))
                .collect(Collectors.toList());
    }

    public Map<String, Object> obtenerStatsGlobales(UUID clienteId, UUID entrenadorId) {
        List<SesionEntrenamiento> todasLasSesiones = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId);
        
        // 🔒 Filtro de Privacidad
        List<SesionEntrenamiento> sesiones = filtrarPorEntrenador(todasLasSesiones, entrenadorId);

        // --- 1. KPIs BÁSICOS ---
        int totalEntrenos = sesiones.size();
        double volumenTotalHistorico = sesiones.stream().mapToDouble(SesionEntrenamiento::getVolumenTotal).sum();
        int minutosTotales = sesiones.stream().mapToInt(SesionEntrenamiento::getDuracionSegundos).sum() / 60;

        // --- 2. COMPARATIVA VOLUMEN ---
        LocalDateTime ahora = LocalDateTime.now();
        LocalDateTime hace7dias = ahora.minusDays(7);
        LocalDateTime hace14dias = ahora.minusDays(14);

        double volumenUltimos7Dias = sesiones.stream()
            .filter(s -> s.getFechaHora().isAfter(hace7dias))
            .mapToDouble(SesionEntrenamiento::getVolumenTotal).sum();

        double volumenSemanaPrevia = sesiones.stream()
            .filter(s -> s.getFechaHora().isAfter(hace14dias) && s.getFechaHora().isBefore(hace7dias))
            .mapToDouble(SesionEntrenamiento::getVolumenTotal).sum();

        double porcentajeCambio = 0.0;
        if (volumenSemanaPrevia > 0) {
            porcentajeCambio = ((volumenUltimos7Dias - volumenSemanaPrevia) / volumenSemanaPrevia) * 100.0;
        } else if (volumenUltimos7Dias > 0) {
            porcentajeCambio = 100.0;
        }

        // --- 3. GRÁFICAS ---
        List<Map<String, Object>> graficaSemanal = generarGraficaSemanal(sesiones);
        List<Map<String, Object>> graficaDiaria = generarGraficaDiaria(sesiones);

        // --- 4. DISTRIBUCIÓN MUSCULAR ---
        Map<String, Integer> conteoMusculos = new HashMap<>();
        for (SesionEntrenamiento sesion : sesiones) {
            for (SerieRealizada serie : sesion.getSeries()) {
                if (serie.isHecho() && serie.getEjercicio() != null) {
                    String musculo = serie.getEjercicio().getGrupoMuscular(); 
                    if (musculo != null && !musculo.isEmpty()) {
                        conteoMusculos.put(musculo, conteoMusculos.getOrDefault(musculo, 0) + 1);
                    }
                }
            }
        }
        
        List<Map<String, Object>> datosMusculos = new ArrayList<>();
        conteoMusculos.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("musculo", k);
            m.put("series", v);
            datosMusculos.add(m);
        });

        // --- CONSTRUIR RESPUESTA ---
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEntrenos", totalEntrenos);
        stats.put("volumenTotal", Math.round(volumenTotalHistorico / 1000.0) + "t");
        stats.put("horasEntrenadas", Math.round(minutosTotales / 60.0));
        stats.put("comparativaVolumen", Math.round(porcentajeCambio));
        stats.put("graficaSemanal", graficaSemanal);
        stats.put("graficaDiaria", graficaDiaria);
        stats.put("distribucionMuscular", datosMusculos);
        
        return stats;
    }

    public Map<String, Object> obtenerProgresoEjercicio(UUID clienteId, UUID ejercicioId, UUID entrenadorId) {
         List<SerieRealizada> historiaCompleta = serieDAO.findHistorialEjercicio(clienteId, ejercicioId);
         
         // 🔒 Filtro de Privacidad en el historial de series
         List<SerieRealizada> historia = historiaCompleta.stream()
                 .filter(serie -> {
                     if (entrenadorId == null) return true;
                     return serie.getSesion().getRutina() != null && 
                            serie.getSesion().getRutina().getEntrenadorId() != null &&
                            serie.getSesion().getRutina().getEntrenadorId().equals(entrenadorId);
                 })
                 .collect(Collectors.toList());

         if (historia.isEmpty()) return null;

         List<Map<String, Object>> puntosGrafica = new ArrayList<>();
         double personalRecord = 0.0;
         Map<SesionEntrenamiento, List<SerieRealizada>> porSesion = historia.stream()
                 .collect(Collectors.groupingBy(SerieRealizada::getSesion));

         List<SesionEntrenamiento> sesionesOrdenadas = new ArrayList<>(porSesion.keySet());
         sesionesOrdenadas.sort(Comparator.comparing(SesionEntrenamiento::getFechaHora));
         DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM");

         for (SesionEntrenamiento sesion : sesionesOrdenadas) {
             List<SerieRealizada> seriesDia = porSesion.get(sesion);
             double max1RMDia = 0;
             for (SerieRealizada s : seriesDia) {
                 if (s.getPeso() <= 0 || s.getReps() <= 0) continue;
                 double e1rm = s.getPeso() * (1 + (s.getReps() / 30.0));
                 if (e1rm > max1RMDia) max1RMDia = e1rm;
                 if (s.getPeso() > personalRecord) personalRecord = s.getPeso();
             }
             if (max1RMDia > 0) {
                 Map<String, Object> punto = new HashMap<>();
                 punto.put("fecha", sesion.getFechaHora().format(formatter));
                 punto.put("valor", Math.round(max1RMDia * 100.0) / 100.0);
                 puntosGrafica.add(punto);
             }
         }
         Map<String, Object> respuesta = new HashMap<>();
         respuesta.put("grafica", puntosGrafica);
         respuesta.put("pr", personalRecord);
         return respuesta;
    }

    public List<Map<String, Object>> obtenerPersonalRecords(UUID clienteId, UUID entrenadorId) {
        List<SesionEntrenamiento> todasLasSesiones = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId);
        
        // 🔒 Filtro de Privacidad
        List<SesionEntrenamiento> sesiones = filtrarPorEntrenador(todasLasSesiones, entrenadorId);
        
        Map<String, SerieRealizada> mejoresLevantamientos = new HashMap<>();

        for (SesionEntrenamiento sesion : sesiones) {
            for (SerieRealizada serie : sesion.getSeries()) {
                if (!serie.isHecho() || serie.getPeso() <= 0) continue;

                String nombreEj = serie.getEjercicio().getNombre();
                double pesoActual = serie.getPeso();

                if (!mejoresLevantamientos.containsKey(nombreEj) || 
                    pesoActual > mejoresLevantamientos.get(nombreEj).getPeso()) {
                    mejoresLevantamientos.put(nombreEj, serie);
                }
            }
        }

        List<Map<String, Object>> prList = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy");
        LocalDateTime hace7Dias = LocalDateTime.now().minusDays(7);

        for (Map.Entry<String, SerieRealizada> entry : mejoresLevantamientos.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            SerieRealizada s = entry.getValue();

            item.put("ejercicio", entry.getKey());
            item.put("peso", s.getPeso());
            item.put("fecha", s.getSesion().getFechaHora().format(fmt));
            item.put("esReciente", s.getSesion().getFechaHora().isAfter(hace7Dias));

            prList.add(item);
        }

        prList.sort((a, b) -> {
            boolean aRec = (boolean) a.get("esReciente");
            boolean bRec = (boolean) b.get("esReciente");
            if (aRec != bRec) return aRec ? -1 : 1;
            return Double.compare((Double)b.get("peso"), (Double)a.get("peso"));
        });

        return prList;
    }

    // --- MÉTODOS AUXILIARES ---

    private List<Map<String, Object>> generarGraficaSemanal(List<SesionEntrenamiento> sesiones) {
        Map<String, Integer> mapa = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM");
        List<SesionEntrenamiento> crono = new ArrayList<>(sesiones);
        Collections.reverse(crono);

        for (SesionEntrenamiento s : crono) {
            LocalDateTime inicioSemana = s.getFechaHora().with(WeekFields.of(Locale.getDefault()).dayOfWeek(), 1);
            String label = inicioSemana.format(fmt);
            mapa.put(label, mapa.getOrDefault(label, 0) + 1);
        }
        
        List<Map<String, Object>> lista = new ArrayList<>();
        mapa.forEach((k, v) -> {
            Map<String, Object> p = new HashMap<>();
            p.put("label", k);
            p.put("cantidad", v);
            lista.add(p);
        });
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
            if (s.getFechaHora().isAfter(hoy.minusDays(14))) {
                String label = s.getFechaHora().format(fmt);
                if (mapa.containsKey(label)) {
                    mapa.put(label, mapa.getOrDefault(label, 0) + 1);
                }
            }
        }

        List<Map<String, Object>> lista = new ArrayList<>();
        mapa.forEach((k, v) -> {
            Map<String, Object> p = new HashMap<>();
            p.put("label", k);
            p.put("cantidad", v);
            lista.add(p);
        });
        return lista;
    }
}