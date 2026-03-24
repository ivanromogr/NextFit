package com.tuap.backend.persistencia;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;

@DataJpaTest
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class EventoCalendarioDAOTest {

    @Autowired
    private EventoCalendarioDAO eventoDAO;

    // 🪄 Herramienta mágica para guardar Clientes y Rutinas sin necesitar sus DAOs
    @Autowired
    private TestEntityManager entityManager; 

    private Cliente clienteMock;
    private Rutina rutinaMock;
    private LocalDate hoy;

    @BeforeEach
    void setUp() {
        hoy = LocalDate.now();

        // 1. Creamos y guardamos un Cliente "padre" con todos sus campos obligatorios
        clienteMock = new Cliente();
        clienteMock.setNombre("Cbum");
        clienteMock.setApellido("Bumstead"); 
        clienteMock.setEmail("cbum@mrolympia.com"); 
        clienteMock.setContraseña("olympia123"); 
        clienteMock.setGenero("Masculino"); 
        clienteMock.setObjetivo("Ganar masa muscular"); // ✅ Añadido
        clienteMock.setAltura(185);                     // ✅ Añadido
        clienteMock.setEdad(29);                        // ✅ Añadido
        clienteMock.setPeso(115.0);                     // ✅ Añadido
        clienteMock.setRol("CLIENTE");                  // ✅ Añadido

        clienteMock = entityManager.persistAndFlush(clienteMock);

        // 2. Creamos y guardamos una Rutina
        rutinaMock = new Rutina();
        rutinaMock.setNombre("Día de Pierna");
        rutinaMock.setCliente(clienteMock);
        rutinaMock.setCreador("SISTEMA");
        rutinaMock = entityManager.persistAndFlush(rutinaMock);

        // 3. Creamos 3 eventos: AYER, HOY y MAÑANA
        EventoCalendario eventoAyer = new EventoCalendario();
        eventoAyer.setCliente(clienteMock);
        eventoAyer.setRutina(rutinaMock);
        eventoAyer.setFecha(hoy.minusDays(1));
        entityManager.persist(eventoAyer);

        EventoCalendario eventoHoy = new EventoCalendario();
        eventoHoy.setCliente(clienteMock);
        eventoHoy.setRutina(rutinaMock);
        eventoHoy.setFecha(hoy);
        entityManager.persist(eventoHoy);

        EventoCalendario eventoManana = new EventoCalendario();
        eventoManana.setCliente(clienteMock);
        eventoManana.setRutina(rutinaMock);
        eventoManana.setFecha(hoy.plusDays(1));
        entityManager.persist(eventoManana);

        // Empujamos todo a la base de datos fantasma
        entityManager.flush(); 
    }

    // 🟢 TEST 1: Buscar entre dos fechas (Rango)
    @Test
    void findByClienteIdAndFechaBetween_RangoValido_DevuelveEventos() {
        // Buscamos desde AYER hasta HOY (Debería devolver 2 eventos, excluyendo el de mañana)
        List<EventoCalendario> resultado = eventoDAO.findByClienteIdAndFechaBetween(
            clienteMock.getId(), 
            hoy.minusDays(1), 
            hoy
        );

        assertEquals(2, resultado.size());
    }

    // 🟢 TEST 2: Buscar pasados y ordenados (Historial)
    @Test
    void findByClienteIdAndFechaLessThanEqualOrderByFechaDesc_DevuelveOrdenado() {
        // Buscamos eventos menores o iguales a HOY (Debería traer HOY y luego AYER)
        List<EventoCalendario> resultado = eventoDAO.findByClienteIdAndFechaLessThanEqualOrderByFechaDesc(
            clienteMock.getId(), 
            hoy
        );

        assertEquals(2, resultado.size());
        
        // Comprobamos que el orden DESCENDENTE funciona (el primero debe ser HOY)
        assertEquals(hoy, resultado.get(0).getFecha());
        // El segundo debe ser AYER
        assertEquals(hoy.minusDays(1), resultado.get(1).getFecha());
    }

    // 🟢 TEST 3: Buscar evento exacto (La consulta JPQL personalizada)
    @Test
    void buscarEventoExacto_EventoExiste_DevuelveEvento() {
        Optional<EventoCalendario> resultado = eventoDAO.buscarEventoExacto(
            clienteMock.getId(), 
            hoy, 
            rutinaMock.getId()
        );

        assertTrue(resultado.isPresent());
        assertEquals(hoy, resultado.get().getFecha());
    }

    // 🔴 TEST 4: Buscar evento exacto (No existe)
    @Test
    void buscarEventoExacto_EventoNoExiste_DevuelveVacio() {
        // Buscamos un evento dentro de 10 días (no existe)
        Optional<EventoCalendario> resultado = eventoDAO.buscarEventoExacto(
            clienteMock.getId(), 
            hoy.plusDays(10), 
            rutinaMock.getId()
        );

        assertFalse(resultado.isPresent());
    }
}