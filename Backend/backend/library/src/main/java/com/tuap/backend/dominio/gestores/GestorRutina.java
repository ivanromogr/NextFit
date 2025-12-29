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
    @Autowired private com.tuap.backend.persistencia.EntrenadorDAO entrenadorDAO;

    // =========================================================
    //  PARTE 1: CREADOR MANUAL
    // =========================================================
    @Transactional
    public Rutina crearRutinaManual(RutinaRequest request) {
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        Rutina rutina = new Rutina();
        rutina.setCliente(cliente);
        rutina.setNombre(request.getNombre());
        rutina.setDescripcion(request.getDescripcion());
        rutina.setObjetivo(request.getObjetivo());
        rutina.setNivel("Personalizado");
        
        // ✅ NUEVO: Guardamos quién crea la rutina
        // Prioridad:
        // 1) Si el request especifica 'creador', respetarlo (compatibilidad hacia atrás)
        // 2) Si no, determinamos quién está autenticado: ENTRENADOR o CLIENTE
        // 3) Si no hay auth, por defecto CLIENTE
        if (request.getCreador() != null && !request.getCreador().isBlank()) {
            rutina.setCreador(request.getCreador());
        } else {
            // Intentamos inferir desde el SecurityContext (usuario actualmente autenticado)
            try {
                var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getName() != null) {
                    String email = auth.getName();
                    boolean esEntrenador = entrenadorDAO.findByEmail(email).isPresent();
                    rutina.setCreador(esEntrenador ? "ENTRENADOR" : "CLIENTE");
                } else {
                    rutina.setCreador("CLIENTE");
                }
            } catch (Exception ex) {
                // En caso de entornos de test o sin seguridad, dejamos CLIENTE por defecto
                rutina.setCreador("CLIENTE");
            }
        }

        rutina = rutinaDAO.save(rutina);

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

        Rutina rutina = new Rutina();
        rutina.setCliente(cliente);
        rutina.setNombre("Plan " + formatearTexto(request.getObjetivo()));
        rutina.setObjetivo(request.getObjetivo());
        rutina.setNivel(request.getNivel());
        rutina.setCreador("IA"); // Marcamos que fue la IA
        
        String desc = String.format("Plan de %s. Frecuencia: %d días/semana. Nivel: %s.", 
                formatearTexto(request.getObjetivo()), request.getDiasPorSemana(), formatearTexto(request.getNivel()));
        rutina.setDescripcion(desc);

        rutina = rutinaDAO.save(rutina);

        List<DetalleRutina> detalles = new ArrayList<>();

        if ("FUERZA".equalsIgnoreCase(request.getObjetivo())) {
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 5, 5, 9, "Descanso 3-5 min.");
            agregarEjercicioSiExiste(detalles, rutina, "Press de Banca", 5, 5, 9, "Barra al pecho.");
            agregarEjercicioSiExiste(detalles, rutina, "Peso Muerto", 3, 5, 9, "Agarre mixto.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Militar", 4, 6, 8, "Bloquea arriba.");
            agregarEjercicioSiExiste(detalles, rutina, "Dominadas", 4, 6, 9, "Lastradas.");
        } else if ("GANAR_MASA".equalsIgnoreCase(request.getObjetivo())) {
            agregarEjercicioSiExiste(detalles, rutina, "Press Inclinado", 4, 10, 8, "Pecho superior.");
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 10, 8, "Profunda.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo con Barra", 4, 12, 8, "Torso 45º.");
            agregarEjercicioSiExiste(detalles, rutina, "Zancadas", 3, 12, 7, "Pasos por pierna.");
            agregarEjercicioSiExiste(detalles, rutina, "Elevaciones Laterales", 4, 15, 9, "Controla bajada.");
            agregarEjercicioSiExiste(detalles, rutina, "Curl con Barra", 3, 12, 9, "Sin balanceo.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Francés", 3, 12, 8, "Codos cerrados.");
        } else {
            agregarEjercicioSiExiste(detalles, rutina, "Burpees", 4, 15, 8, "Ritmo constante.");
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 20, 7, "Velocidad.");
            agregarEjercicioSiExiste(detalles, rutina, "Mountain Climbers", 4, 30, 8, "30 segs.");
            agregarEjercicioSiExiste(detalles, rutina, "Flexiones", 4, 15, 9, "Al fallo.");
            agregarEjercicioSiExiste(detalles, rutina, "Plancha", 4, 1, 9, "60 segs.");
        }

        if (detalles.isEmpty()) {
            throw new RuntimeException("Error: No se encontraron ejercicios compatibles.");
        }
        
        detalleRutinaDAO.saveAll(detalles);
        rutina.setDetalles(detalles);
        return rutina;
    }

    // =========================================================
    //  PARTE 3: ACTUALIZAR RUTINA
    // =========================================================
    @Transactional
    public Rutina actualizarRutina(UUID id, Rutina rutinaDatosNuevos) {
        Rutina rutinaExistente = rutinaDAO.findById(id)
                .orElseThrow(() -> new RuntimeException("Rutina no encontrada con ID: " + id));

        rutinaExistente.setNombre(rutinaDatosNuevos.getNombre());
        rutinaExistente.setObjetivo(rutinaDatosNuevos.getObjetivo());
        rutinaExistente.setNivel(rutinaDatosNuevos.getNivel());
        
        // No actualizamos 'creador' para que no se pierda quién la hizo originalmente

        rutinaExistente.getDetalles().clear();

        if (rutinaDatosNuevos.getDetalles() != null) {
            for (DetalleRutina detalle : rutinaDatosNuevos.getDetalles()) {
                detalle.setRutina(rutinaExistente); 
                rutinaExistente.getDetalles().add(detalle);
            }
        }
        return rutinaDAO.save(rutinaExistente);
    }

    // =========================================================
    //  UTILIDADES
    // =========================================================
    
    // Obtener TODAS (Para el cliente)
    public List<Rutina> obtenerRutinasDeCliente(UUID idCliente) {
        return rutinaDAO.findByClienteId(idCliente);
    }

    // ✅ NUEVO: Obtener SOLO las creadas por ENTRENADOR (Para el panel del entrenador)
    public List<Rutina> obtenerRutinasDeEntrenadorParaCliente(UUID idCliente) {
        return rutinaDAO.findByClienteIdAndCreador(idCliente, "ENTRENADOR");
    }

    public void eliminarRutina(UUID id) {
        if (rutinaDAO.existsById(id)) {
            rutinaDAO.deleteById(id);
        } else {
            throw new RuntimeException("La rutina no existe");
        }
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
        }
    }

    private String formatearTexto(String texto) {
        if (texto == null || texto.isEmpty()) return "";
        return texto.substring(0, 1).toUpperCase() + texto.substring(1).toLowerCase().replace("_", " ");
    }
}