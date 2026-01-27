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

    public Map<String, Object> obtenerStatsGlobales(UUID clienteId) {
        List<SesionEntrenamiento> sesiones = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId);

        // --- 1. KPIs BÁSICOS ---
        int totalEntrenos = sesiones.size();
        double volumenTotalHistorico = sesiones.stream().mapToDouble(SesionEntrenamiento::getVolumenTotal).sum();
        int minutosTotales = sesiones.stream().mapToInt(SesionEntrenamiento::getDuracionSegundos).sum() / 60;

        // --- 2. COMPARATIVA VOLUMEN (Semana actual vs Anterior) ---
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
            porcentajeCambio = 100.0; // Si antes era 0 y ahora hay algo, es un aumento del 100% (o infinito)
        }

        // --- 3. GRÁFICAS DE CONSISTENCIA (SEMANAL Y DIARIA) ---
        // A) SEMANAL
        List<Map<String, Object>> graficaSemanal = generarGraficaSemanal(sesiones);
        
        // B) DIARIA (Últimos 30 días)
        List<Map<String, Object>> graficaDiaria = generarGraficaDiaria(sesiones);

        // --- 4. DISTRIBUCIÓN MUSCULAR ---
        // Contamos SERIES efectivas por grupo muscular
        Map<String, Integer> conteoMusculos = new HashMap<>();
        for (SesionEntrenamiento sesion : sesiones) {
            // Solo miramos sesiones recientes (ej: últimos 30 días) para que el gráfico sea relevante actual
            // O quitamos el filtro if para que sea histórico total
            for (SerieRealizada serie : sesion.getSeries()) {
                if (serie.isHecho() && serie.getEjercicio() != null) {
                    // ⚠️ ASEGÚRATE QUE TU ENTIDAD EJERCICIO TIENE 'getGrupoMuscular()'
                    // Si se llama diferente (ej: getZona()), cámbialo aquí.
                    String musculo = serie.getEjercicio().getGrupoMuscular(); 
                    if (musculo != null && !musculo.isEmpty()) {
                        conteoMusculos.put(musculo, conteoMusculos.getOrDefault(musculo, 0) + 1);
                    }
                }
            }
        }
        
        // Formatear para frontend
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
        
        // Nuevos datos
        stats.put("comparativaVolumen", Math.round(porcentajeCambio)); // Entero, ej: 15 o -5
        stats.put("graficaSemanal", graficaSemanal);
        stats.put("graficaDiaria", graficaDiaria);
        stats.put("distribucionMuscular", datosMusculos);
        
        return stats;
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
        // Devolver últimas 12 semanas
        return lista.size() > 12 ? lista.subList(lista.size() - 12, lista.size()) : lista;
    }

    private List<Map<String, Object>> generarGraficaDiaria(List<SesionEntrenamiento> sesiones) {
        Map<String, Integer> mapa = new LinkedHashMap<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd"); // Solo día para ahorrar espacio
        
        // Inicializar últimos 14 días con 0 para que la gráfica no se vea rara
        LocalDateTime hoy = LocalDateTime.now();
        for (int i = 13; i >= 0; i--) {
            mapa.put(hoy.minusDays(i).format(fmt), 0);
        }

        for (SesionEntrenamiento s : sesiones) {
            // Solo nos interesan los últimos 14 días
            if (s.getFechaHora().isAfter(hoy.minusDays(14))) {
                String label = s.getFechaHora().format(fmt);
                // Si existe (es de los últimos 14 días), sumamos
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
    
    // El método obtenerProgresoEjercicio se mantiene igual que antes...
    // (Pégalo aquí si lo has borrado, o mantén el que tenías)
    public Map<String, Object> obtenerProgresoEjercicio(UUID clienteId, UUID ejercicioId) {
         List<SerieRealizada> historia = serieDAO.findHistorialEjercicio(clienteId, ejercicioId);
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


    // 
    // Obtener Listado de PRs (Trofeos)
    public List<Map<String, Object>> obtenerPersonalRecords(UUID clienteId) {
        // 1. Obtenemos TODAS las sesiones del cliente (de la más reciente a la más antigua)
        List<SesionEntrenamiento> sesiones = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteId);
        
        // Mapa para guardar el mejor levantamiento por ejercicio
        // Clave: NombreEjercicio, Valor: La Serie con el récord
        Map<String, SerieRealizada> mejoresLevantamientos = new HashMap<>();

        // Recorremos todas las sesiones
        for (SesionEntrenamiento sesion : sesiones) {
            for (SerieRealizada serie : sesion.getSeries()) {
                // Solo nos valen series hechas y con peso válido
                if (!serie.isHecho() || serie.getPeso() == 0 || serie.getPeso() <= 0) continue;

                String nombreEj = serie.getEjercicio().getNombre();
                double pesoActual = serie.getPeso();

                // Si aún no tenemos récord para este ejercicio, lo guardamos
                if (!mejoresLevantamientos.containsKey(nombreEj)) {
                    mejoresLevantamientos.put(nombreEj, serie);
                } else {
                    // Si ya tenemos uno, miramos si el actual es MAYOR
                    if (pesoActual > mejoresLevantamientos.get(nombreEj).getPeso()) {
                        mejoresLevantamientos.put(nombreEj, serie);
                    }
                }
            }
        }

        // 2. Convertir a lista bonita para el frontend
        List<Map<String, Object>> prList = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy");
        LocalDateTime hace7Dias = LocalDateTime.now().minusDays(7);

        for (Map.Entry<String, SerieRealizada> entry : mejoresLevantamientos.entrySet()) {
            Map<String, Object> item = new HashMap<>();
            SerieRealizada s = entry.getValue();

            item.put("ejercicio", entry.getKey());
            item.put("peso", s.getPeso());
            item.put("fecha", s.getSesion().getFechaHora().format(fmt));
            
            // Calculamos si es "Nuevo Récord" (conseguido en los últimos 7 días)
            boolean esReciente = s.getSesion().getFechaHora().isAfter(hace7Dias);
            item.put("esReciente", esReciente);

            prList.add(item);
        }

        // 3. Ordenar: Primero los recientes (fuego), luego por peso descendente
        prList.sort((a, b) -> {
            boolean aRec = (boolean) a.get("esReciente");
            boolean bRec = (boolean) b.get("esReciente");
            if (aRec != bRec) return aRec ? -1 : 1; // Recientes primero
            return Double.compare((Double)b.get("peso"), (Double)a.get("peso")); // Mayor peso primero
        });

        return prList;
    }

}