package com.tuap.backend.controladores;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam; 
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

@RestController
@RequestMapping("/api/ejercicios")

public class EjercicioController {

    private final EjercicioDAO ejercicioDAO;

    public EjercicioController(EjercicioDAO ejercicioDAO) {
        this.ejercicioDAO = ejercicioDAO;
    }

    @GetMapping
    public List<Ejercicio> obtenerTodos() {
        return ejercicioDAO.findAll();
    }

   
    @GetMapping("/buscar")
    public List<Ejercicio> buscar(@RequestParam(required = false) String nombre,
                                  @RequestParam(required = false) String musculo) {
        String nombreFiltro = (nombre != null && !nombre.isEmpty()) ? nombre : null;
        String musculoFiltro = (musculo != null && !musculo.isEmpty()) ? musculo : null;
       
        return ejercicioDAO.buscarAvanzado(nombreFiltro, musculoFiltro);
    }
}