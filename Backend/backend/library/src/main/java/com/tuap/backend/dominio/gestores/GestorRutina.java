package com.tuap.backend.dominio.gestores;

import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.DetalleRutina;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dto.GenerarRutinaRequest;
import com.tuap.backend.dto.RutinaRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.DetalleRutinaDAO;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.persistencia.RutinaDAO;

@Service
public class GestorRutina {

    @Autowired private RutinaDAO rutinaDAO;
    @Autowired private DetalleRutinaDAO detalleRutinaDAO;
    @Autowired private ClienteDAO clienteDAO;
    @Autowired private EjercicioDAO ejercicioDAO;

    // --- 1. GENERAR AUTOMÁTICO (IA) ---
    @Transactional
    public Rutina generarRutinaAutomatica(GenerarRutinaRequest req) {
        // Buscamos al cliente (sin tocar sus datos)
        Cliente cliente = clienteDAO.findById(req.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        boolean esCasa = "CASA".equalsIgnoreCase(req.getLugar());
        String objetivo = req.getObjetivo(); 

        // Configuración básica según objetivo
        int series = "FUERZA".equals(objetivo) ? 5 : 4;
        int repes  = "FUERZA".equals(objetivo) ? 5 : 12;

        // Crear la Cabecera de la Rutina
        Rutina rutina = new Rutina();
        rutina.setNombre("Plan " + req.getNivel() + (esCasa ? " (Casa)" : " (Gym)"));
        rutina.setDescripcion("Rutina generada para: " + objetivo);
        rutina.setObjetivo(objetivo);
        rutina.setNivel(req.getNivel());
        rutina.setCliente(cliente);
        
        // Guardamos la cabecera para tener ID
        rutina = rutinaDAO.save(rutina);

        // --- ALGORITMO: Seleccionar ejercicios ---
        // Usamos las etiquetas de TU json ("Piernas", "Pecho", "Espalda"...)
        
        // Ejercicio 1: Pierna
        agregarEjercicio(rutina, "Piernas", esCasa, series, repes, "Descanso 90s");
        
        // Ejercicio 2: Empuje (Pecho)
        agregarEjercicio(rutina, "Pecho", esCasa, series, repes, "Controla la bajada");
        
        // Ejercicio 3: Tracción (Espalda)
        agregarEjercicio(rutina, "Espalda", esCasa, series, repes, "Retrae escápulas");
        
        // Ejercicio 4: Hombros
        agregarEjercicio(rutina, "Hombros", esCasa, 3, 12, "Sin impulso");
        
        // Ejercicio 5: Core / Abdominales (si tienes etiqueta "Core" o "Abdominales" o "Cintura")
        // Pruebo con 'Abdominales' que suele ser común, o 'Core'
        agregarEjercicio(rutina, "Abdominales", esCasa, 3, 15, "Aprieta el abdomen");

        return rutina;
    }

    // --- 2. CREAR MANUALMENTE ---
    @Transactional
    public Rutina crearRutinaManual(RutinaRequest req) {
        Cliente cliente = clienteDAO.findById(req.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        Rutina rutina = new Rutina();
        rutina.setNombre(req.getNombre());
        rutina.setDescripcion(req.getDescripcion());
        rutina.setObjetivo(req.getObjetivo());
        rutina.setCliente(cliente);
        
        rutina = rutinaDAO.save(rutina);

        if (req.getEjercicios() != null) {
            for (RutinaRequest.EjercicioDetalleDTO detalle : req.getEjercicios()) {
                // Buscamos el ejercicio en el catálogo
                Ejercicio ejercicio = ejercicioDAO.findById(detalle.getIdEjercicio()).orElse(null);
                
                if (ejercicio != null) {
                    guardarDetalle(rutina, ejercicio, detalle.getSeries(), detalle.getRepeticiones(), detalle.getNotas());
                }
            }
        }
        return rutina;
    }
    
    // Método privado para buscar un ejercicio aleatorio y guardarlo
    private void agregarEjercicio(Rutina rutina, String musculo, boolean esCasa, int series, int repes, String notas) {
        // Llama al DAO para buscar un ejercicio random de ese músculo
        Ejercicio ej = ejercicioDAO.encontrarEjercicioAleatorio(musculo, esCasa);
        
        if (ej != null) {
            guardarDetalle(rutina, ej, series, repes, notas);
        } else {
            System.out.println("⚠️ No se encontró ejercicio para: " + musculo);
        }
    }

    private void guardarDetalle(Rutina rutina, Ejercicio ejercicio, int series, int repes, String notas) {
        DetalleRutina dr = new DetalleRutina();
        dr.setRutina(rutina);
        dr.setEjercicio(ejercicio);
        dr.setSeries(series);
        dr.setRepeticiones(repes);
        dr.setNotas(notas);
        detalleRutinaDAO.save(dr);
    }
    
    public List<Rutina> obtenerRutinasDeCliente(UUID idCliente) {
         // Devuelve todas las rutinas (filtraremos por cliente cuando tengas el método en el DAO)
         return rutinaDAO.findAll(); 
    }
}