package com.tuap.backend.dominio.gestores;

import org.springframework.web.bind.annotation.GetMapping;

public class GestorEntrenador {
   @GetMapping("/menuentrenador")
    public String menuEntrenador() {
        return "menuentrenador";
    } 
}
