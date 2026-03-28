package com.tuap.dominio.entidades;


import org.junit.jupiter.api.Test;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import com.tuap.backend.dominio.entidades.Chat;
class ChatTest {

    @Test
    void testGettersYSetters() {
        // 1. Instanciamos la entidad
        Chat chat = new Chat();

        // Valores de prueba
        UUID idPrueba = UUID.randomUUID();
        UUID clienteIdPrueba = UUID.randomUUID();
        UUID entrenadorIdPrueba = UUID.randomUUID();

        // 2. Usamos todos los Setters
        chat.setId(idPrueba);
        chat.setClienteid(clienteIdPrueba);
        chat.setEntrenadorid(entrenadorIdPrueba);

        // 3. Verificamos con los Getters (100% Coverage)
        assertEquals(idPrueba, chat.getId());
        assertEquals(clienteIdPrueba, chat.getClienteid());
        assertEquals(entrenadorIdPrueba, chat.getEntrenadorid());
    }

    @Test
    void testConstructorConArgumentos() {
        // Probamos el constructor lleno
        UUID id = UUID.randomUUID();
        UUID clienteId = UUID.randomUUID();
        UUID entrenadorId = UUID.randomUUID();

        Chat chat = new Chat(id, clienteId, entrenadorId);

        assertEquals(id, chat.getId());
        assertEquals(clienteId, chat.getClienteid());
        assertEquals(entrenadorId, chat.getEntrenadorid());
    }
}