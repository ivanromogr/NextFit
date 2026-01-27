package com.tuap.backend.dominio.gestores;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.entidades.SerieRealizada;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;
import com.tuap.backend.dto.GuardarSesionRequest;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.persistencia.RutinaDAO;
import com.tuap.backend.persistencia.SesionEntrenamientoDAO;

@Service
public class GestorSesion {

    @Autowired private SesionEntrenamientoDAO sesionDAO;
    @Autowired private ClienteDAO clienteDAO;
    @Autowired private RutinaDAO rutinaDAO;
    @Autowired private EjercicioDAO ejercicioDAO;

    @Transactional
    public SesionEntrenamiento guardarSesion(GuardarSesionRequest req) {
        // 1. Validar Cliente
        Cliente cliente = clienteDAO.findById(req.getClienteId())
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // 2. Crear la Sesión (Cabecera)
        SesionEntrenamiento sesion = new SesionEntrenamiento();
        sesion.setCliente(cliente);
        sesion.setFechaHora(LocalDateTime.now());
        sesion.setDuracionSegundos(req.getDuracionSegundos());
        sesion.setNotasGenerales(req.getNotasGenerales());

        // 3. Vincular con Rutina (si el usuario eligió una)
        if (req.getRutinaId() != null) {
            Rutina rutina = rutinaDAO.findById(req.getRutinaId()).orElse(null);
            if (rutina != null) {
                sesion.setRutina(rutina);
                sesion.setNombre(rutina.getNombre()); 
            }
        } else {
            sesion.setNombre("Entrenamiento Libre");
        }

        // 4. Procesar las Series Reales
        double volumenTotal = 0;
        List<SerieRealizada> listaSeries = new ArrayList<>();

        for (GuardarSesionRequest.SerieDTO dto : req.getSeries()) {
            Ejercicio ej = ejercicioDAO.findById(dto.ejercicioId).orElse(null);
            
            if (ej != null) {
                SerieRealizada s = new SerieRealizada();
                s.setSesion(sesion); // Vinculamos la serie a esta sesión
                s.setEjercicio(ej);
                s.setSetIndex(dto.setIndex);
                // Usamos 0 si viene null para evitar errores
                s.setPeso(dto.peso != null ? dto.peso.doubleValue() : 0.0);
                s.setReps(dto.reps != null ? dto.reps : 0);
                s.setRpe(dto.rpe != null ? dto.rpe : 0);
                s.setHecho(dto.hecho);

                // Calcular volumen de esta serie (Kilos * Reps)
                if (s.isHecho()) {
                    double vol = s.getPeso() * s.getReps();
                    s.setVolumenSerie(vol);
                    volumenTotal += vol;
                }
                listaSeries.add(s);
            }
        }

        sesion.setSeries(listaSeries);
        sesion.setVolumenTotal(volumenTotal);

        // 5. Guardar todo en cascada
        return sesionDAO.save(sesion);
    }
}