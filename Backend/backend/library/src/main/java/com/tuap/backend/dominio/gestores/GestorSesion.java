package com.tuap.backend.dominio.gestores;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.dto.GuardarSesionRequest;
import com.tuap.backend.persistencia.*;

@Service
public class GestorSesion {

    // 🧹 SOLUCIÓN SONARQUBE: Campos final para inyección por constructor
    private final SesionEntrenamientoDAO sesionDAO;
    private final ClienteDAO clienteDAO;
    private final RutinaDAO rutinaDAO;
    private final EjercicioDAO ejercicioDAO;
    private final EventoCalendarioDAO eventoDAO;

    // 🧹 SOLUCIÓN SONARQUBE: Constructor Injection (Adiós a los @Autowired sueltos)
    public GestorSesion(SesionEntrenamientoDAO sesionDAO, 
                        ClienteDAO clienteDAO, 
                        RutinaDAO rutinaDAO, 
                        EjercicioDAO ejercicioDAO, 
                        EventoCalendarioDAO eventoDAO) {
        this.sesionDAO = sesionDAO;
        this.clienteDAO = clienteDAO;
        this.rutinaDAO = rutinaDAO;
        this.ejercicioDAO = ejercicioDAO;
        this.eventoDAO = eventoDAO;
    }

    @Transactional
    public SesionEntrenamiento guardarSesion(GuardarSesionRequest req) {
        Cliente cliente = clienteDAO.findById(req.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        if (req.getEventoCalendarioId() != null) {
            SesionEntrenamiento existente = sesionDAO.findByEventoCalendario_Id(req.getEventoCalendarioId());
            if (existente != null) {
                return existente;
            }
        }

        SesionEntrenamiento sesion = inicializarSesion(req, cliente);
        
        // Procesamos series y calculamos volumen
        List<SerieRealizada> series = procesarSeries(req.getSeries(), sesion);
        sesion.setSeries(series);
        sesion.setVolumenTotal(series.stream()
                .filter(SerieRealizada::isHecho)
                .mapToDouble(SerieRealizada::getVolumenSerie)
                .sum());

        SesionEntrenamiento guardada = sesionDAO.save(sesion);

        // Actualización lógica del calendario, sin impedir que la sesión quede guardada.
        if (req.getEventoCalendarioId() != null) {
            actualizarEstadoCalendarioPorId(req.getEventoCalendarioId(), guardada);
        } else if (req.getRutinaId() != null) {
            actualizarEstadoCalendario(req.getClienteId(), req.getRutinaId(), guardada);
        }

        return guardada;
    }

    private SesionEntrenamiento inicializarSesion(GuardarSesionRequest req, Cliente cliente) {
        SesionEntrenamiento sesion = new SesionEntrenamiento();
        sesion.setCliente(cliente);
        sesion.setFechaHora(LocalDateTime.now());
        sesion.setDuracionSegundos(req.getDuracionSegundos());
        sesion.setNotasGenerales(req.getNotasGenerales());

        if (req.getEventoCalendarioId() != null
                && sesionDAO.findByEventoCalendario_Id(req.getEventoCalendarioId()) == null) {
            eventoDAO.findById(req.getEventoCalendarioId()).ifPresent(sesion::setEventoCalendario);
        }

        if (req.getRutinaId() != null) {
            rutinaDAO.findById(req.getRutinaId()).ifPresent(r -> {
                sesion.setRutina(r);
                sesion.setNombre(r.getNombre());
            });
        } else {
            sesion.setNombre("Entrenamiento Libre");
        }
        return sesion;
    }

    private List<SerieRealizada> procesarSeries(List<GuardarSesionRequest.SerieDTO> dtos, SesionEntrenamiento sesion) {
    List<SerieRealizada> lista = new ArrayList<>();
    if (dtos == null) {
        return lista;
    }
    for (GuardarSesionRequest.SerieDTO dto : dtos) {
       
        ejercicioDAO.findById(dto.getEjercicioId()).ifPresent(ej -> {
            SerieRealizada s = new SerieRealizada();
            s.setSesion(sesion);
            s.setEjercicio(ej);
            
            
            s.setSetIndex(dto.getSetIndex());
            
            
            s.setPeso(dto.getPeso() != null ? dto.getPeso().doubleValue() : 0.0);
            s.setReps(dto.getReps() != null ? dto.getReps() : 0);
            s.setRpe(dto.getRpe() != null ? dto.getRpe() : 0);
            s.setHecho(dto.isHecho());
            
            if (s.isHecho()) {
                s.setVolumenSerie(s.getPeso() * s.getReps());
            }
            lista.add(s);
        });
    }
    return lista;
}

    private void actualizarEstadoCalendarioPorId(UUID eventoCalendarioId, SesionEntrenamiento sesion) {
        try {
            eventoDAO.findById(eventoCalendarioId)
                .ifPresent(evento -> {
                    evento.setCompletado(true);
                    evento.setDuracionSegundos(sesion.getDuracionSegundos());
                    evento.setVolumenTotal(sesion.getVolumenTotal());
                    eventoDAO.save(evento);
                    sesion.setEventoCalendario(evento);
                });
        } catch (Exception e) {
            // Mantener el guardado de sesión aunque falle la marca del calendario.
        }
    }

    private void actualizarEstadoCalendario(UUID clienteId, UUID rutinaId, SesionEntrenamiento sesion) {
        try {
            eventoDAO.buscarEventoExacto(clienteId, LocalDate.now(), rutinaId)
                .ifPresent(evento -> {
                    evento.setCompletado(true);
                    evento.setDuracionSegundos(sesion.getDuracionSegundos());
                    evento.setVolumenTotal(sesion.getVolumenTotal());
                    eventoDAO.save(evento);
                });
        } catch (Exception e) {
            // Log de error omitido para brevedad conforme a tu versión original
        }
    }
}
