package com.tuap.dominio.entidades;



import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Administrador;
class AdministradorTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad
        Administrador admin = new Administrador();

        // 2. Usamos el Setter
        admin.setNivelAcceso("SUPER_ADMIN");

        // 3. Verificamos con el Getter
        assertEquals("SUPER_ADMIN", admin.getNivelAcceso());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos el constructor con parámetros
        Administrador admin = new Administrador(
                "Admin", 
                "Principal", 
                "admin@nextfit.com", 
                "ROLE_ADMIN", 
                "12345", 
                "BASICO"
        );

        // Verificamos el nivel de acceso asignado en el constructor
        assertEquals("BASICO", admin.getNivelAcceso());
    }
}
