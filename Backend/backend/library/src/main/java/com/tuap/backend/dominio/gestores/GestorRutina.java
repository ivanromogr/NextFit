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
    //  PARTE 1: CREADOR MANUAL (incluyendo PLANTILLAS MAESTRAS)
    // =========================================================
    @Transactional
    public Rutina crearRutinaManual(RutinaRequest request) {
        // ✅ Si es una PLANTILLA MAESTRA
        if (request.getEsPlantilla() != null && request.getEsPlantilla()) {
            Rutina plantilla = new Rutina();
            plantilla.setNombre(request.getNombre());
            plantilla.setDescripcion(request.getDescripcion());
            plantilla.setObjetivo(request.getObjetivo());
            plantilla.setNivel("Personalizado");
            plantilla.setCreador("ENTRENADOR");
            plantilla.setEsPlantilla(true);
            plantilla.setEntrenadorId(request.getEntrenadorId()); // ✅ Asociamos al entrenador
            plantilla.setCliente(null); // Una plantilla NO pertenece a un cliente específico
            
            plantilla = rutinaDAO.save(plantilla);
            
            List<DetalleRutina> detalles = new ArrayList<>();
            if (request.getEjercicios() != null) {
                for (RutinaRequest.EjercicioDetalleDTO d : request.getEjercicios()) {
                    Ejercicio ej = ejercicioDAO.findById(d.getIdEjercicio())
                            .orElseThrow(() -> new RuntimeException("Ejercicio no encontrado"));

                    DetalleRutina detalle = new DetalleRutina();
                    detalle.setRutina(plantilla);
                    detalle.setEjercicio(ej);
                    detalle.setSeries(d.getSeries());
                    detalle.setRepeticiones(d.getRepeticiones());
                    detalle.setPeso(d.getPeso());
                    detalle.setRpe(d.getRpe());
                    detalle.setNotas(d.getNotas());
                    detalle.setDias(1);

                    detalles.add(detalle);
                }
            }

            detalleRutinaDAO.saveAll(detalles);
            plantilla.setDetalles(detalles);
            return plantilla;
        }
        
        // ✅ Si es una RUTINA NORMAL
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        Rutina rutina = new Rutina();
        rutina.setCliente(cliente);
        rutina.setNombre(request.getNombre());
        rutina.setDescripcion(request.getDescripcion());
        rutina.setObjetivo(request.getObjetivo());
        rutina.setNivel("Personalizado");
        rutina.setEsPlantilla(false); // No es plantilla

        // ✅ Guardamos quién crea la rutina
        if (request.getCreador() != null && !request.getCreador().isBlank()) {
            rutina.setCreador(request.getCreador());
        } else {
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
                rutina.setCreador("CLIENTE");
            }
        }

        rutina = rutinaDAO.save(rutina);

        List<DetalleRutina> detalles = new ArrayList<>();
        if (request.getEjercicios() != null) {
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
                detalle.setDias(1);

                detalles.add(detalle);
            }
        }

        detalleRutinaDAO.saveAll(detalles);
        rutina.setDetalles(detalles);
        return rutina;
    }

    // =========================================================
    //  PARTE 2: GENERADOR AUTOMÁTICO "IA" (CREA 1 RUTINA POR DÍA)
    // =========================================================
    @Transactional
    public List<Rutina> generarRutinaAutomatica(GenerarRutinaRequest request) {
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        int dias = request.getDiasPorSemana();
        if (dias < 1) dias = 1;
        if (dias > 6) dias = 6; // límite razonable

        List<Rutina> rutinasGeneradas = new ArrayList<>();

        for (int dia = 1; dia <= dias; dia++) {

            // ✅ Creamos UNA RUTINA POR CADA DÍA
            Rutina rutinaDia = new Rutina();
            rutinaDia.setCliente(cliente);
            rutinaDia.setNombre("Día " + dia + " - Plan " + formatearTexto(request.getObjetivo()));
            rutinaDia.setObjetivo(request.getObjetivo());
            rutinaDia.setNivel(request.getNivel());
            rutinaDia.setCreador("IA");

            String desc = String.format(
                    "Entrenamiento día %d. Objetivo: %s. Nivel: %s.",
                    dia,
                    formatearTexto(request.getObjetivo()),
                    formatearTexto(request.getNivel())
            );
            rutinaDia.setDescripcion(desc);

            rutinaDia = rutinaDAO.save(rutinaDia);

            List<DetalleRutina> detallesDia = new ArrayList<>();

            // ✅ Selección por objetivo + variación por día
            if ("FUERZA".equalsIgnoreCase(request.getObjetivo())) {
                generarFuerzaDia(detallesDia, rutinaDia, dia);
            } else if ("GANAR_MASA".equalsIgnoreCase(request.getObjetivo())) {
                generarHipertrofiaDia(detallesDia, rutinaDia, dia);
            } else {
                generarPerdidaPesoDia(detallesDia, rutinaDia, dia);
            }

            if (detallesDia.isEmpty()) {
                throw new RuntimeException("Error: No se encontraron ejercicios compatibles para el día " + dia);
            }

            detalleRutinaDAO.saveAll(detallesDia);
            rutinaDia.setDetalles(detallesDia);

            rutinasGeneradas.add(rutinaDia);
        }

        return rutinasGeneradas;
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

        // No actualizamos 'creador'
        rutinaExistente.getDetalles().clear();

        if (rutinaDatosNuevos.getDetalles() != null) {
            for (DetalleRutina detalle : rutinaDatosNuevos.getDetalles()) {
                detalle.setRutina(rutinaExistente);

                // Si tu entidad tiene "dias", evitamos que sea null o <1
                try {
                    Integer d = detalle.getDias(); // funciona aunque sea int (autoboxing)
                    if (d == null || d < 1) detalle.setDias(1);
                } catch (Exception ignore) {}

                rutinaExistente.getDetalles().add(detalle);
            }
        }

        return rutinaDAO.save(rutinaExistente);
    }

    // =========================================================
    //  UTILIDADES
    // =========================================================

    public List<Rutina> obtenerRutinasDeCliente(UUID idCliente) {
        return rutinaDAO.findByClienteId(idCliente);
    }

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

    // =========================================================
    //  GENERACIÓN POR DÍA (IA) -> 1 día = 1 rutina
    // =========================================================

    private void generarFuerzaDia(List<DetalleRutina> detalles, Rutina rutina, int dia) {
        // Alternamos A/B
        int mod = (dia - 1) % 2;

        if (mod == 0) { // A
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 5, 5, 9, "Descanso 3-5 min.");
            agregarEjercicioSiExiste(detalles, rutina, "Press de Banca", 5, 5, 9, "Barra al pecho.");
            agregarEjercicioSiExiste(detalles, rutina, "Dominadas", 4, 6, 9, "Lastradas si puedes.");
        } else { // B
            agregarEjercicioSiExiste(detalles, rutina, "Peso Muerto", 3, 5, 9, "Agarre mixto.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Militar", 4, 6, 8, "Bloquea arriba.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo", 4, 6, 8, "Controla la espalda.");
        }

        // Accesorio
        if (dia % 2 == 0) {
            agregarEjercicioSiExiste(detalles, rutina, "Curl", 3, 10, 8, "Técnica estricta.");
        } else {
            agregarEjercicioSiExiste(detalles, rutina, "Tríceps", 3, 10, 8, "Codos estables.");
        }
    }

    private void generarHipertrofiaDia(List<DetalleRutina> detalles, Rutina rutina, int dia) {
        if (dia == 1) { // Torso A
            agregarEjercicioSiExiste(detalles, rutina, "Press Inclinado", 4, 10, 8, "Pecho superior.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo con Barra", 4, 12, 8, "Torso 45º.");
            agregarEjercicioSiExiste(detalles, rutina, "Elevaciones Laterales", 4, 15, 9, "Controla bajada.");
            agregarEjercicioSiExiste(detalles, rutina, "Curl", 3, 12, 9, "Sin balanceo.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Francés", 3, 12, 8, "Codos cerrados.");
        } else if (dia == 2) { // Pierna A
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 10, 8, "Profunda.");
            agregarEjercicioSiExiste(detalles, rutina, "Zancadas", 3, 12, 7, "Pasos por pierna.");
            agregarEjercicioSiExiste(detalles, rutina, "Peso Muerto", 3, 10, 8, "Enfoca femoral.");
            agregarEjercicioSiExiste(detalles, rutina, "Gemelos", 4, 15, 8, "Pausa arriba.");
        } else if (dia == 3) { // Torso B
            agregarEjercicioSiExiste(detalles, rutina, "Press de Banca", 4, 10, 8, "Recorrido completo.");
            agregarEjercicioSiExiste(detalles, rutina, "Dominadas", 4, 8, 9, "Controlando bajada.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Militar", 3, 10, 8, "Sin arquear.");
            agregarEjercicioSiExiste(detalles, rutina, "Curl", 3, 12, 9, "Tensión continua.");
            agregarEjercicioSiExiste(detalles, rutina, "Tríceps", 3, 12, 8, "Extensión controlada.");
        } else if (dia == 4) { // Pierna B
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 12, 8, "Más volumen.");
            agregarEjercicioSiExiste(detalles, rutina, "Zancadas", 3, 12, 7, "Rango completo.");
            agregarEjercicioSiExiste(detalles, rutina, "Peso Muerto", 3, 12, 8, "Técnica limpia.");
            agregarEjercicioSiExiste(detalles, rutina, "Gemelos", 4, 15, 8, "Sin rebotes.");
        } else { // 5-6: Full body extra
            agregarEjercicioSiExiste(detalles, rutina, "Press Inclinado", 3, 12, 8, "Moderado.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo", 3, 12, 8, "Control total.");
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 3, 12, 8, "Moderado.");
            agregarEjercicioSiExiste(detalles, rutina, "Plancha", 3, 1, 8, "45-60 seg.");
        }
    }

    private void generarPerdidaPesoDia(List<DetalleRutina> detalles, Rutina rutina, int dia) {
        if (dia % 3 == 1) { // A
            agregarEjercicioSiExiste(detalles, rutina, "Burpees", 4, 12, 8, "Ritmo constante.");
            agregarEjercicioSiExiste(detalles, rutina, "Mountain", 4, 30, 8, "30 segs.");
            agregarEjercicioSiExiste(detalles, rutina, "Plancha", 4, 1, 9, "45-60 seg.");
        } else if (dia % 3 == 2) { // B
            agregarEjercicioSiExiste(detalles, rutina, "Sentadilla", 4, 20, 7, "Velocidad.");
            agregarEjercicioSiExiste(detalles, rutina, "Flexiones", 4, 15, 9, "Cerca del fallo.");
            agregarEjercicioSiExiste(detalles, rutina, "Plancha", 3, 1, 9, "60 segs.");
        } else { // C
            agregarEjercicioSiExiste(detalles, rutina, "Burpees", 4, 10, 8, "Técnica limpia.");
            agregarEjercicioSiExiste(detalles, rutina, "Flexiones", 4, 12, 8, "Control.");
            agregarEjercicioSiExiste(detalles, rutina, "Mountain", 4, 30, 8, "30 segs.");
        }
    }

    // =========================================================
    //  HELPERS
    // =========================================================
    private void agregarEjercicioSiExiste(
            List<DetalleRutina> lista,
            Rutina rutina,
            String nombreClave,
            int series,
            int reps,
            int rpe,
            String notas
    ) {
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

            // Si tu entidad tiene "dias", lo ponemos a 1 porque esta rutina ya es "el día"
            try {
                d.setDias(1);
            } catch (Exception ignore) {}

            lista.add(d);
        }
    }

    private String formatearTexto(String texto) {
        if (texto == null || texto.isEmpty()) return "";
        return texto.substring(0, 1).toUpperCase()
                + texto.substring(1).toLowerCase().replace("_", " ");
    }
}
