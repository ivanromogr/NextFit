package com.tuap.dominio.entidades;



import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;   
class ResenaTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la Entidad
        Resena resena = new Resena();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();
        Entrenador entrenadorPrueba = new Entrenador();
        Cliente clientePrueba = new Cliente();
        LocalDateTime fechaPrueba = LocalDateTime.now();

        // 2. Usamos los Setters
        resena.setId(idPrueba);
        resena.setEntrenador(entrenadorPrueba);
        resena.setCliente(clientePrueba);
        resena.setEstrellas(5);
        resena.setComentario("¡El mejor entrenador que he tenido!");
        resena.setFecha(fechaPrueba);

        // 3. Verificamos con los Getters (100% Coverage)
        assertEquals(idPrueba, resena.getId());
        assertEquals(entrenadorPrueba, resena.getEntrenador());
        assertEquals(clientePrueba, resena.getCliente());
        assertEquals(5, resena.getEstrellas());
        assertEquals("¡El mejor entrenador que he tenido!", resena.getComentario());
        assertEquals(fechaPrueba, resena.getFecha());
    }
}
