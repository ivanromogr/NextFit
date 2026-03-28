package com.tuap.dominio.entidades;



import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Usuario;
class UsuarioTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad con el constructor vacío
        Usuario usuario = new Usuario();

        // 2. Usamos todos los Setters
        usuario.setNombre("Laura");
        usuario.setApellido("Gómez");
        usuario.setEmail("laura@ejemplo.com");
        usuario.setContrasena("secreta123");
        usuario.setRol("CLIENTE");

        // 3. Verificamos con los Getters (100% Coverage para estos métodos)
        assertEquals("Laura", usuario.getNombre());
        assertEquals("Gómez", usuario.getApellido());
        assertEquals("laura@ejemplo.com", usuario.getEmail());
        assertEquals("secreta123", usuario.getContrasena());
        assertEquals("CLIENTE", usuario.getRol());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos el constructor lleno para asegurar cobertura total
        Usuario usuario = new Usuario("Pedro", "Martínez", "pedro@ejemplo.com", "pass456", "ENTRENADOR");

        assertEquals("Pedro", usuario.getNombre());
        assertEquals("Martínez", usuario.getApellido());
        assertEquals("pedro@ejemplo.com", usuario.getEmail());
        assertEquals("pass456", usuario.getContrasena());
        assertEquals("ENTRENADOR", usuario.getRol());
    }
}