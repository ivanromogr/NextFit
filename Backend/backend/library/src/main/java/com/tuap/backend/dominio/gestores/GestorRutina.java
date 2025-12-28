package com.tuap.backend.dominio.gestores;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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

    // =========================================================
    //  PARTE 1: CREADOR MANUAL
    // =========================================================
    @Transactional
    public Rutina crearRutinaManual(RutinaRequest request) {
        // 1. Buscamos cliente
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // 2. Creamos rutina
        Rutina rutina = new Rutina();
        rutina.setCliente(cliente);
        rutina.setNombre(request.getNombre());
        rutina.setDescripcion(request.getDescripcion());
        rutina.setObjetivo(request.getObjetivo());
        rutina.setNivel("Personalizado");

        rutina = rutinaDAO.save(rutina);

        // 3. Añadimos los ejercicios que seleccionó el usuario manualmente
        List<DetalleRutina> detalles = new ArrayList<>();
        for (RutinaRequest.EjercicioDetalleDTO d : request.getEjercicios()) {
            Ejercicio ej = ejercicioDAO.findById(d.getIdEjercicio())
                    .orElseThrow(() -> new RuntimeException("Ejercicio no encontrado"));

            DetalleRutina detalle = new DetalleRutina();
            detalle.setRutina(rutina);
            detalle.setEjercicio(ej);
            detalle.setSeries(d.getSeries());
            detalle.setRepeticiones(d.getRepeticiones());
            detalle.setPeso(d.getPeso());
            detalle.setRpe(d.getRpe());
            detalle.setNotas(d.getNotas());
            detalles.add(detalle);
        }
        detalleRutinaDAO.saveAll(detalles);
        return rutina;
    }

    // =========================================================
    //  PARTE 2: GENERADOR AUTOMÁTICO "IA"
    // =========================================================
    @Transactional
    public Rutina generarRutinaAutomatica(GenerarRutinaRequest request) {
        
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // Cabecera de la Rutina
        Rutina rutina = new Rutina();
        rutina.setCliente(cliente);
        rutina.setNombre("Plan " + formatearTexto(request.getObjetivo()));
        rutina.setObjetivo(request.getObjetivo());
        rutina.setNivel(request.getNivel());
        
        String desc = String.format("Plan de %s. Frecuencia: %d días/semana. Nivel: %s.", 
                formatearTexto(request.getObjetivo()), request.getDiasPorSemana(), formatearTexto(request.getNivel()));
        rutina.setDescripcion(desc);

        rutina = rutinaDAO.save(rutina);

        List<DetalleRutina> detalles = new ArrayList<>();

        // --- LÓGICA DE PLANTILLAS PROFESIONALES ---
        if ("FUERZA".equalsIgnoreCase(request.getObjetivo())) {
            // Fuerza
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 5, 5, 9, "Descanso 3-5 min. Prioridad técnica.");
            agregarEjercicioSiExiste(detalles, rutina, "Press de Banca", 5, 5, 9, "Barra al pecho, pausa 1 seg.");
            agregarEjercicioSiExiste(detalles, rutina, "Peso Muerto", 3, 5, 9, "Agarre mixto si es necesario.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Militar", 4, 6, 8, "Bloquea los codos arriba.");
            agregarEjercicioSiExiste(detalles, rutina, "Dominadas", 4, 6, 9, "Lastradas si llegas a 10 reps.");

        } else if ("GANAR_MASA".equalsIgnoreCase(request.getObjetivo())) {
            // Hipertrofia
            agregarEjercicioSiExiste(detalles, rutina, "Press Inclinado", 4, 10, 8, "Enfoca pecho superior.");
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 10, 8, "Profunda y controlada.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo con Barra", 4, 12, 8, "Torso a 45 grados.");
            agregarEjercicioSiExiste(detalles, rutina, "Zancadas", 3, 12, 7, "Pasos por pierna.");
            agregarEjercicioSiExiste(detalles, rutina, "Elevaciones Laterales", 4, 15, 9, "Controla la bajada.");
            agregarEjercicioSiExiste(detalles, rutina, "Curl con Barra", 3, 12, 9, "Sin balanceo.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Francés", 3, 12, 8, "Codos cerrados.");

        } else {
            // Definición
            agregarEjercicioSiExiste(detalles, rutina, "Burpees", 4, 15, 8, "Ritmo constante.");
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 20, 7, "Carga ligera, enfoque velocidad.");
            agregarEjercicioSiExiste(detalles, rutina, "Mountain Climbers", 4, 30, 8, "30 segundos activos.");
            agregarEjercicioSiExiste(detalles, rutina, "Flexiones", 4, 15, 9, "Al fallo técnico.");
            agregarEjercicioSiExiste(detalles, rutina, "Plancha", 4, 1, 9, "Aguanta 60 segundos.");
        }

        if (detalles.isEmpty()) {
            throw new RuntimeException("Error: No se encontraron ejercicios compatibles en la base de datos.");
        }
        
        detalleRutinaDAO.saveAll(detalles);
        rutina.setDetalles(detalles);

        return rutina;
    }

    // =========================================================
    //  PARTE 3: ACTUALIZAR RUTINA (NUEVO - PARA EL EDITOR)
    // =========================================================
    @Transactional
    public Rutina actualizarRutina(UUID id, Rutina rutinaDatosNuevos) {
        // 1. Buscar la rutina existente en la base de datos
        Rutina rutinaExistente = rutinaDAO.findById(id)
                .orElseThrow(() -> new RuntimeException("Rutina no encontrada con ID: " + id));

        // 2. Actualizar datos básicos
        rutinaExistente.setNombre(rutinaDatosNuevos.getNombre());
        rutinaExistente.setObjetivo(rutinaDatosNuevos.getObjetivo());
        rutinaExistente.setNivel(rutinaDatosNuevos.getNivel());

        // 3. ACTUALIZAR EJERCICIOS (Magia de orphanRemoval)
        // Limpiamos la lista actual. Gracias a orphanRemoval=true en la entidad Rutina,
        // Hibernate borrará de la BD los ejercicios que ya no estén en la lista.
        rutinaExistente.getDetalles().clear();

        // 4. Añadimos los nuevos ejercicios que vienen del Frontend
        if (rutinaDatosNuevos.getDetalles() != null) {
            for (DetalleRutina detalle : rutinaDatosNuevos.getDetalles()) {
                // Importante: Vinculamos el detalle con la rutina padre
                detalle.setRutina(rutinaExistente); 
                rutinaExistente.getDetalles().add(detalle);
            }
        }

        // 5. Guardar cambios
        return rutinaDAO.save(rutinaExistente);
    }

    // =========================================================
    //  UTILIDADES COMUNES
    // =========================================================
    public List<Rutina> obtenerRutinasDeCliente(UUID idCliente) {
        return rutinaDAO.findByClienteId(idCliente);
    }

    private void agregarEjercicioSiExiste(List<DetalleRutina> lista, Rutina rutina, String nombreClave, int series, int reps, int rpe, String notas) {
        Optional<Ejercicio> optEjercicio = ejercicioDAO.findFirstByNombreContainingIgnoreCase(nombreClave);
        
        if (optEjercicio.isPresent()) {
            DetalleRutina d = new DetalleRutina();
            d.setRutina(rutina);
            d.setEjercicio(optEjercicio.get());
            d.setSeries(series);
            d.setRepeticiones(reps);
            d.setPeso(0.0f);
            d.setRpe(rpe);
            d.setNotas(notas);
            lista.add(d);
        } else {
            System.err.println("⚠️ Aviso: La IA intentó usar '" + nombreClave + "' pero no existe en la BD.");
        }
    }

    public void eliminarRutina(UUID id) {
        if (rutinaDAO.existsById(id)) {
            rutinaDAO.deleteById(id); // Gracias al CascadeType.ALL, borra también los ejercicios
        } else {
            throw new RuntimeException("La rutina no existe");
        }
    }

    private String formatearTexto(String texto) {
        if (texto == null || texto.isEmpty()) return "";
        return texto.substring(0, 1).toUpperCase() + texto.substring(1).toLowerCase().replace("_", " ");
    }
}