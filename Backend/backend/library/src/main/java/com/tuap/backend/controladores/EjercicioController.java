package com.tuap.backend.controladores;

import java.util.List;

import org.springframework.web.bind.annotation.CrossOrigin; 
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

@RestController
@RequestMapping("/api/ejercicios")
@CrossOrigin(origins = "http://localhost:5173") // 👈 2. AÑADIR ESTA LÍNEA (IMPORTANTE)
public class EjercicioController {

    private final EjercicioDAO ejercicioDAO;

    public EjercicioController(EjercicioDAO ejercicioDAO) {
        this.ejercicioDAO = ejercicioDAO;
    }

    @GetMapping
    public List<Ejercicio> obtenerTodos() {
        return ejercicioDAO.findAll();
    }
}