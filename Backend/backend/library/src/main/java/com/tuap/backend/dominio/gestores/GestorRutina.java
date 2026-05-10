package com.tuap.backend.dominio.gestores;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;

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
import com.tuap.backend.persistencia.EntrenadorDAO;

@Service
public class GestorRutina {

    private static final String ROLE_ENTRENADOR = "ENTRENADOR";
    private static final String ROLE_CLIENTE = "CLIENTE";
    private static final String EJ_SENTADILLA = "Sentadilla";
    private static final String EJ_PESO_MUERTO = "Peso Muerto";
    private static final String NIVEL_PERSO = "Personalizado";
    
  
    private static final String CAT_FUERZA = "FUERZA";
    private static final String CAT_HIPERTROFIA = "HIPERTROFIA";

    private final RutinaDAO rutinaDAO;
    private final DetalleRutinaDAO detalleRutinaDAO;
    private final ClienteDAO clienteDAO;
    private final EjercicioDAO ejercicioDAO;
    private final EntrenadorDAO entrenadorDAO;

    public GestorRutina(RutinaDAO rutinaDAO, 
                        DetalleRutinaDAO detalleRutinaDAO, 
                        ClienteDAO clienteDAO, 
                        EjercicioDAO ejercicioDAO, 
                        EntrenadorDAO entrenadorDAO) {
        this.rutinaDAO = rutinaDAO;
        this.detalleRutinaDAO = detalleRutinaDAO;
        this.clienteDAO = clienteDAO;
        this.ejercicioDAO = ejercicioDAO;
        this.entrenadorDAO = entrenadorDAO;
    }

    @Transactional
    public Rutina crearRutinaManual(RutinaRequest request) {
        if (Boolean.TRUE.equals(request.getEsPlantilla())) {
            return procesarPlantillaMaestra(request);
        }
        return procesarRutinaCliente(request);
    }

    private Rutina procesarPlantillaMaestra(RutinaRequest request) {
        Rutina plantilla = new Rutina();
        plantilla.setNombre(request.getNombre());
        plantilla.setDescripcion(request.getDescripcion());
        plantilla.setObjetivo(request.getObjetivo());
        plantilla.setNivel(NIVEL_PERSO);
        plantilla.setCreador(ROLE_ENTRENADOR);
        plantilla.setEsPlantilla(true);
        plantilla.setEntrenadorId(request.getEntrenadorId());
        plantilla.setCliente(null);
        
        plantilla = rutinaDAO.save(plantilla);
        vincularEjercicios(plantilla, request.getEjercicios());
        return plantilla;
    }

    private Rutina procesarRutinaCliente(RutinaRequest request) {
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new NoSuchElementException("Cliente no encontrado con ID: " + request.getIdCliente()));

        Rutina rutina = new Rutina();
        rutina.setCliente(cliente);
        rutina.setNombre(request.getNombre());
        rutina.setDescripcion(request.getDescripcion());
        rutina.setObjetivo(request.getObjetivo());
        rutina.setNivel(NIVEL_PERSO);
        rutina.setEsPlantilla(false);
        rutina.setEntrenadorId(request.getEntrenadorId()); 

        rutina.setCreador(determinarCreador(request.getCreador()));

        rutina = rutinaDAO.save(rutina);
        vincularEjercicios(rutina, request.getEjercicios());
        return rutina;
    }

    private String determinarCreador(String creadorRequest) {
        if (creadorRequest != null && !creadorRequest.isBlank()) {
            return creadorRequest;
        }
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) {
                return entrenadorDAO.findByEmail(auth.getName()).isPresent() ? ROLE_ENTRENADOR : ROLE_CLIENTE;
            }
        } catch (Exception ex) {
            // Log silent
        }
        return ROLE_CLIENTE;
    }

    private void vincularEjercicios(Rutina rutina, List<RutinaRequest.EjercicioDetalleDTO> dtos) {
        if (dtos == null) return;
        
        List<DetalleRutina> detalles = new ArrayList<>();
        for (RutinaRequest.EjercicioDetalleDTO d : dtos) {
            Ejercicio ej = ejercicioDAO.findById(d.getIdEjercicio())
                    .orElseThrow(() -> new NoSuchElementException("Ejercicio no encontrado con ID: " + d.getIdEjercicio()));

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
        detalleRutinaDAO.saveAll(detalles);
        rutina.setDetalles(detalles);
    }

    @Transactional
    public List<Rutina> generarRutinaAutomatica(GenerarRutinaRequest request) {
        Cliente cliente = clienteDAO.findById(request.getIdCliente())
                .orElseThrow(() -> new NoSuchElementException("Cliente no encontrado"));

        int dias = Math.clamp(request.getDiasPorSemana(), 1, 6);
        List<Rutina> rutinasGeneradas = new ArrayList<>();

        for (int dia = 1; dia <= dias; dia++) {
            rutinasGeneradas.add(crearRutinaAutomaticaDia(cliente, request, dia));
        }
        return rutinasGeneradas;
    }

    private Rutina crearRutinaAutomaticaDia(Cliente cliente, GenerarRutinaRequest request, int dia) {
        Rutina rutinaDia = new Rutina();
        rutinaDia.setCliente(cliente);
        rutinaDia.setNombre("Día " + dia + " - Plan " + formatearTexto(request.getObjetivo()));
        rutinaDia.setObjetivo(request.getObjetivo());
        rutinaDia.setNivel(request.getNivel());
        rutinaDia.setCreador("IA");
        rutinaDia.setDescripcion(String.format("Entrenamiento día %d. Objetivo: %s.", dia, request.getObjetivo()));

        rutinaDia = rutinaDAO.save(rutinaDia);
        List<DetalleRutina> detalles = new ArrayList<>();

        String obj = request.getObjetivo().toUpperCase();
        procesarObjetivoIA(obj, detalles, rutinaDia, dia);

        if (detalles.isEmpty()) {
           
            throw new IllegalStateException("Error: No se encontraron ejercicios compatibles para el día " + dia);
        }

        detalleRutinaDAO.saveAll(detalles);
        rutinaDia.setDetalles(detalles);
        return rutinaDia;
    }

    private void procesarObjetivoIA(String obj, List<DetalleRutina> detalles, Rutina rutina, int dia) {
        String categoria = getCategoriaDeObjetivo(obj);
        
        switch (categoria) {
            case CAT_FUERZA -> generarFuerzaDia(detalles, rutina, dia);
            case CAT_HIPERTROFIA -> generarHipertrofiaDia(detalles, rutina, dia);
            default -> generarPerdidaPesoDia(detalles, rutina, dia);
        }
    }

    private String getCategoriaDeObjetivo(String obj) {
        if (obj.contains(CAT_FUERZA)) return CAT_FUERZA;
        if (obj.contains("MASA") || obj.contains(CAT_HIPERTROFIA)) return CAT_HIPERTROFIA;
        return "OTRO";
    }

    private void generarFuerzaDia(List<DetalleRutina> detalles, Rutina rutina, int dia) {
        if ((dia - 1) % 2 == 0) { // A
            agregarEjercicioSiExiste(detalles, rutina, EJ_SENTADILLA, 5, 5, 9, "Descanso 3-5 min.");
            agregarEjercicioSiExiste(detalles, rutina, "Press de Banca", 5, 5, 9, "Barra al pecho.");
            agregarEjercicioSiExiste(detalles, rutina, "Dominadas", 4, 6, 9, "Lastradas.");
        } else { // B
            agregarEjercicioSiExiste(detalles, rutina, EJ_PESO_MUERTO, 3, 5, 9, "Agarre mixto.");
            agregarEjercicioSiExiste(detalles, rutina, "Press Militar", 4, 6, 8, "Bloquea arriba.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo", 4, 6, 8, "Espalda recta.");
        }
    }

    private void generarHipertrofiaDia(List<DetalleRutina> detalles, Rutina rutina, int dia) {
        if (dia == 1) { 
            agregarEjercicioSiExiste(detalles, rutina, "Press Inclinado", 4, 10, 8, "Pecho superior.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo con Barra", 4, 12, 8, "Torso 45º.");
        } else if (dia == 2) { 
            agregarEjercicioSiExiste(detalles, rutina, EJ_SENTADILLA, 4, 10, 8, "Profunda.");
            agregarEjercicioSiExiste(detalles, rutina, EJ_PESO_MUERTO, 3, 10, 8, "Enfoca femoral.");
        } else {
            agregarEjercicioSiExiste(detalles, rutina, EJ_SENTADILLA, 3, 12, 8, "Moderado.");
            agregarEjercicioSiExiste(detalles, rutina, "Remo", 3, 12, 8, "Control total.");
        }
    }

    private void generarPerdidaPesoDia(List<DetalleRutina> detalles, Rutina rutina, int dia) {
        if (dia % 2 == 1) {
            agregarEjercicioSiExiste(detalles, rutina, "Burpees", 4, 12, 8, "Ritmo constante.");
            agregarEjercicioSiExiste(detalles, rutina, "Plancha", 4, 1, 9, "60 seg.");
        } else {
            agregarEjercicioSiExiste(detalles, rutina, EJ_SENTADILLA, 4, 20, 7, "Velocidad.");
            agregarEjercicioSiExiste(detalles, rutina, "Flexiones", 4, 15, 9, "Cerca del fallo.");
        }
    }

    @Transactional
    public Rutina actualizarRutina(UUID id, Rutina nuevosDatos) {
        Rutina existente = rutinaDAO.findById(id).orElseThrow(() -> new NoSuchElementException("Rutina no encontrada"));
        existente.setNombre(nuevosDatos.getNombre());
        existente.setObjetivo(nuevosDatos.getObjetivo());
        existente.setDescripcion(nuevosDatos.getDescripcion());
        existente.setNivel(nuevosDatos.getNivel());
        existente.getDetalles().clear();

        if (nuevosDatos.getDetalles() != null) {
            for (DetalleRutina d : nuevosDatos.getDetalles()) {
                d.setRutina(existente);
                if (d.getDias() < 1) d.setDias(1);
                existente.getDetalles().add(d);
            }
        }
        return rutinaDAO.save(existente);
    }

    @Transactional
    public Rutina actualizarRutina(UUID id, RutinaRequest request) {
        Rutina existente = rutinaDAO.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Rutina no encontrada"));

        existente.setNombre(request.getNombre());
        existente.setDescripcion(request.getDescripcion());
        existente.setObjetivo(request.getObjetivo());
        existente.setNivel(request.getNivel() != null ? request.getNivel() : NIVEL_PERSO);

        if (request.getCreador() != null && !request.getCreador().isBlank()) {
            existente.setCreador(determinarCreador(request.getCreador()));
        }
        if (request.getEntrenadorId() != null) {
            existente.setEntrenadorId(request.getEntrenadorId());
        }
        if (request.getEsPlantilla() != null) {
            existente.setEsPlantilla(request.getEsPlantilla());
        }

        existente.getDetalles().clear();
        if (request.getEjercicios() != null) {
            for (RutinaRequest.EjercicioDetalleDTO dto : request.getEjercicios()) {
                Ejercicio ejercicio = ejercicioDAO.findById(dto.getIdEjercicio())
                        .orElseThrow(() -> new NoSuchElementException("Ejercicio no encontrado con ID: " + dto.getIdEjercicio()));

                DetalleRutina detalle = new DetalleRutina();
                detalle.setRutina(existente);
                detalle.setEjercicio(ejercicio);
                detalle.setSeries(Math.max(dto.getSeries(), 1));
                detalle.setRepeticiones(Math.max(dto.getRepeticiones(), 0));
                detalle.setPeso(dto.getPeso() != null ? dto.getPeso() : 0.0f);
                detalle.setRpe(dto.getRpe());
                detalle.setNotas(dto.getNotas());
                detalle.setDias(dto.getDias() > 0 ? dto.getDias() : 1);
                existente.getDetalles().add(detalle);
            }
        }

        return rutinaDAO.save(existente);
    }

    public List<Rutina> obtenerRutinasDeCliente(UUID idCliente) {
        return rutinaDAO.findByClienteId(idCliente);
    }

    public List<Rutina> obtenerRutinasDeEntrenadorParaCliente(UUID idCliente) {
        return rutinaDAO.findByClienteIdAndCreador(idCliente, ROLE_ENTRENADOR);
    }

    public void eliminarRutina(UUID id) {
        if (rutinaDAO.existsById(id)) {
            rutinaDAO.deleteById(id);
        } else {
            throw new NoSuchElementException("La rutina no existe");
        }
    }

    private void agregarEjercicioSiExiste(List<DetalleRutina> lista, Rutina rutina, String clave, int s, int r, int rpe, String n) {
        ejercicioDAO.findFirstByNombreContainingIgnoreCase(clave).ifPresent(ej -> {
            DetalleRutina d = new DetalleRutina();
            d.setRutina(rutina);
            d.setEjercicio(ej);
            d.setSeries(s);
            d.setRepeticiones(r);
            d.setPeso(0.0f);
            d.setRpe(rpe);
            d.setNotas(n);
            d.setDias(1);
            lista.add(d);
        });
    }

    private String formatearTexto(String t) {
        if (t == null || t.isEmpty()) return "";
        return t.substring(0, 1).toUpperCase() + t.substring(1).toLowerCase().replace("_", " ");
    }
}
