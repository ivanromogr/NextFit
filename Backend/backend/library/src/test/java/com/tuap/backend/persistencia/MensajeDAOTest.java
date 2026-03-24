package com.tuap.backend.persistencia;


import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.TestPropertySource;

import com.tuap.backend.dominio.entidades.Mensaje;

@DataJpaTest
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class MensajeDAOTest {

    @Autowired
    private MensajeDAO mensajeDAO;

    // Tres usuarios ficticios para nuestras pruebas
    private UUID aliceId = UUID.randomUUID();
    private UUID bobId = UUID.randomUUID();
    private UUID charlieId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        mensajeDAO.deleteAll();

        // 1. Alice le escribe a Bob (Ayer, LEÍDO)
        Mensaje m1 = new Mensaje();
        m1.setRemitenteId(aliceId);
        m1.setDestinatarioId(bobId);
        m1.setContenido("Hola Bob, ¿qué tal?");
        m1.setFechaHora(LocalDateTime.now().minusDays(1));
        m1.setLeido(true);
        mensajeDAO.save(m1);

        // 2. Bob le responde a Alice (Hace una hora, NO LEÍDO)
        Mensaje m2 = new Mensaje();
        m2.setRemitenteId(bobId);
        m2.setDestinatarioId(aliceId);
        m2.setContenido("¡Hola Alice! Todo bien. ¿Tú?");
        m2.setFechaHora(LocalDateTime.now().minusHours(1));
        m2.setLeido(false);
        mensajeDAO.save(m2);

        // 3. Alice le escribe a Charlie (Ahora mismo, NO LEÍDO)
        Mensaje m3 = new Mensaje();
        m3.setRemitenteId(aliceId);
        m3.setDestinatarioId(charlieId);
        m3.setContenido("Charlie, ¿vamos a entrenar?");
        m3.setFechaHora(LocalDateTime.now());
        m3.setLeido(false);
        mensajeDAO.save(m3);
    }

    // 🟢 TEST 1: Historial de chat entre dos personas (A y B)
    @Test
    void findChatHistory_DevuelveMensajesOrdenadosEntreDosUsuarios() {
        // Buscamos la conversación entre Alice y Bob
        List<Mensaje> chat = mensajeDAO.findChatHistory(aliceId, bobId);

        // Tienen que salir 2 mensajes (excluye el de Charlie)
        assertEquals(2, chat.size());
        
        // Comprobamos el orden cronológico ASCENDENTE (el más antiguo primero)
        assertEquals("Hola Bob, ¿qué tal?", chat.get(0).getContenido());
        assertEquals("¡Hola Alice! Todo bien. ¿Tú?", chat.get(1).getContenido());
    }

    // 🟢 TEST 2: Lista de contactos únicos
    @Test
    void findContactosIds_DevuelveListaDeIdsUnicos() {
        // Buscamos con quién ha hablado Alice (Ha hablado con Bob y Charlie)
        List<UUID> contactosAlice = mensajeDAO.findContactosIds(aliceId);

        assertEquals(2, contactosAlice.size());
        assertTrue(contactosAlice.contains(bobId));
        assertTrue(contactosAlice.contains(charlieId));

        // Bob solo ha hablado con Alice
        List<UUID> contactosBob = mensajeDAO.findContactosIds(bobId);
        assertEquals(1, contactosBob.size());
        assertEquals(aliceId, contactosBob.get(0));
    }

    // 🟢 TEST 3: Contar mensajes no leídos globalmente
    @Test
    void countByDestinatarioIdAndLeidoFalse_CuentaCorrectamente() {
        // Alice tiene 1 mensaje sin leer (el de Bob)
        long noLeidosAlice = mensajeDAO.countByDestinatarioIdAndLeidoFalse(aliceId);
        assertEquals(1, noLeidosAlice);

        // Bob no tiene mensajes sin leer (el de Alice lo leyó)
        long noLeidosBob = mensajeDAO.countByDestinatarioIdAndLeidoFalse(bobId);
        assertEquals(0, noLeidosBob);

        // Charlie tiene 1 mensaje sin leer (el de Alice)
        long noLeidosCharlie = mensajeDAO.countByDestinatarioIdAndLeidoFalse(charlieId);
        assertEquals(1, noLeidosCharlie);
    }

    // 🟢 TEST 4: Buscar mensajes no leídos de un remitente concreto
    @Test
    void findByRemitenteIdAndDestinatarioIdAndLeidoFalse_DevuelveMensajesEspecificos() {
        // Mensajes que Bob le mandó a Alice y ella NO ha leído
        List<Mensaje> sinLeerDeBobParaAlice = mensajeDAO.findByRemitenteIdAndDestinatarioIdAndLeidoFalse(bobId, aliceId);
        
        assertEquals(1, sinLeerDeBobParaAlice.size());
        assertEquals("¡Hola Alice! Todo bien. ¿Tú?", sinLeerDeBobParaAlice.get(0).getContenido());

        // Mensajes que Alice le mandó a Bob y él NO ha leído (Tienen que ser 0, porque Bob lo leyó)
        List<Mensaje> sinLeerDeAliceParaBob = mensajeDAO.findByRemitenteIdAndDestinatarioIdAndLeidoFalse(aliceId, bobId);
        
        assertTrue(sinLeerDeAliceParaBob.isEmpty());
    }
}
