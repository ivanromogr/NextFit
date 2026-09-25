package com.tuap.backend.persistencia;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.TestPropertySource;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.EventoCalendario;
import com.tuap.backend.dominio.entidades.Rutina;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;

@DataJpaTest
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class SesionEntrenamientoDAOTest {

    @Autowired
    private SesionEntrenamientoDAO sesionDAO;

    @Autowired
    private TestEntityManager entityManager;

    private Entrenador entrenadorMock;
    private Cliente clienteActivo;
    private Cliente clienteInactivo;
    private Rutina rutinaMock;
    private EventoCalendario eventoMock;
    private LocalDateTime ahora;

    @BeforeEach
    void setUp() {
        ahora = LocalDateTime.now();

        // 1. Entrenador
        entrenadorMock = new Entrenador();
        entrenadorMock.setNombre("Arnold");
        entrenadorMock.setApellido("Schwarzenegger");
        entrenadorMock.setEmail("arnold@gym.com");
        entrenadorMock.setContrasena("1234");
        entrenadorMock.setEspecialidad("Culturismo");
        entrenadorMock.setRol("ENTRENADOR");
        entrenadorMock = entityManager.persistAndFlush(entrenadorMock);

        // 2. Cliente ACTIVO (Entrena HOY)
        clienteActivo = new Cliente();
        clienteActivo.setNombre("Cbum");
        clienteActivo.setApellido("Bumstead");
        clienteActivo.setEmail("cbum@gym.com");
        clienteActivo.setContrasena("1234");
        clienteActivo.setGenero("Masculino");
        clienteActivo.setObjetivo("Volumen");
        clienteActivo.setAltura(185);
        clienteActivo.setEdad(29);
        clienteActivo.setPeso(115.0);
        clienteActivo.setRol("CLIENTE");
        clienteActivo.setEntrenador(entrenadorMock); // Le asignamos el entrenador
        clienteActivo = entityManager.persistAndFlush(clienteActivo);

        // 3. Cliente INACTIVO (Entrenó hace 10 días)
        clienteInactivo = new Cliente();
        clienteInactivo.setNombre("Ronnie");
        clienteInactivo.setApellido("Coleman");
        clienteInactivo.setEmail("ronnie@gym.com");
        clienteInactivo.setContrasena("1234");
        clienteInactivo.setGenero("Masculino");
        clienteInactivo.setObjetivo("Fuerza");
        clienteInactivo.setAltura(180);
        clienteInactivo.setEdad(55);
        clienteInactivo.setPeso(130.0);
        clienteInactivo.setRol("CLIENTE");
        clienteInactivo.setEntrenador(entrenadorMock); // Le asignamos el entrenador
        clienteInactivo = entityManager.persistAndFlush(clienteInactivo);

        // 4. Rutina y Evento (Para probar los métodos específicos)
        rutinaMock = new Rutina();
        rutinaMock.setNombre("Día de Espalda");
        rutinaMock.setCliente(clienteActivo);
        rutinaMock.setCreador("SISTEMA");
        rutinaMock.setEntrenadorId(entrenadorMock.getId());
        rutinaMock = entityManager.persistAndFlush(rutinaMock);

        eventoMock = new EventoCalendario();
        eventoMock.setCliente(clienteActivo);
        eventoMock.setRutina(rutinaMock);
        eventoMock.setFecha(LocalDate.now());
        eventoMock.setCompletado(true);
        eventoMock.setEntrenadorId(entrenadorMock.getId());
        eventoMock = entityManager.persistAndFlush(eventoMock);

        // 5. SESIONES DE ENTRENAMIENTO
        // Sesión 1: Cliente Activo - HOY
        SesionEntrenamiento sesionHoy = new SesionEntrenamiento();
        sesionHoy.setCliente(clienteActivo);
        sesionHoy.setRutina(rutinaMock);
        sesionHoy.setEventoCalendario(eventoMock);
        sesionHoy.setFechaHora(ahora);
        sesionHoy.setDuracionSegundos(3600);
        sesionHoy.setVolumenTotal(5000.0);
        entityManager.persist(sesionHoy);

        // Sesión 2: Cliente Activo - Hace 3 días
        SesionEntrenamiento sesionHace3Dias = new SesionEntrenamiento();
        sesionHace3Dias.setCliente(clienteActivo);
        sesionHace3Dias.setRutina(rutinaMock);
        sesionHace3Dias.setFechaHora(ahora.minusDays(3));
        sesionHace3Dias.setDuracionSegundos(3000);
        sesionHace3Dias.setVolumenTotal(4500.0);
        entityManager.persist(sesionHace3Dias);

        // Sesión 3: Cliente Inactivo - Hace 10 días
        SesionEntrenamiento sesionHace10Dias = new SesionEntrenamiento();
        sesionHace10Dias.setCliente(clienteInactivo);
        sesionHace10Dias.setFechaHora(ahora.minusDays(10));
        sesionHace10Dias.setDuracionSegundos(4000);
        sesionHace10Dias.setVolumenTotal(6000.0);
        entityManager.persist(sesionHace10Dias);

        entityManager.flush();
    }

    @Test
    void findByClienteIdOrderByFechaHoraDesc_DevuelveOrdenado() {
        List<SesionEntrenamiento> sesiones = sesionDAO.findByClienteIdOrderByFechaHoraDesc(clienteActivo.getId());
        
        assertEquals(2, sesiones.size());
        assertEquals(ahora, sesiones.get(0).getFechaHora()); // La más reciente (hoy) primero
    }

    @Test
    void findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc_FiltraPorFechas() {
        // Buscamos desde hace 5 días hasta mañana (Debería coger las de Hoy y Hace 3 días)
        List<SesionEntrenamiento> sesiones = sesionDAO.findByClienteIdAndFechaHoraBetweenOrderByFechaHoraDesc(
            clienteActivo.getId(), 
            ahora.minusDays(5), 
            ahora.plusDays(1)
        );
        assertEquals(2, sesiones.size());
    }

    @Test
    void findByEventoCalendario_Id_DevuelveSesionCorrecta() {
        SesionEntrenamiento sesion = sesionDAO.findByEventoCalendario_Id(eventoMock.getId());
        
        assertNotNull(sesion);
        assertEquals(5000.0, sesion.getVolumenTotal());
    }

    @Test
    void findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc_DevuelveLaMasReciente() {
        Optional<SesionEntrenamiento> sesion = sesionDAO.findFirstByClienteIdAndRutinaIdOrderByFechaHoraDesc(
            clienteActivo.getId(), 
            rutinaMock.getId()
        );
        
        assertTrue(sesion.isPresent());
        assertEquals(ahora, sesion.get().getFechaHora());
    }

    @Test
    void findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc_DevuelveTodasLasSesiones() {
        // Debería traer las 3 sesiones (2 de Cbum y 1 de Ronnie) porque los dos son clientes de Arnold
        List<SesionEntrenamiento> feed = sesionDAO.findTop10ByCliente_Entrenador_IdOrderByFechaHoraDesc(entrenadorMock.getId());
        
        assertEquals(3, feed.size());
    }

    @Test
    void findActividadDashboardByEntrenador_DevuelveSesionesDelEquipo() {
        List<SesionEntrenamiento> feed = sesionDAO.findActividadDashboardByEntrenador(
            entrenadorMock.getId(),
            PageRequest.of(0, 10)
        );

        assertEquals(3, feed.size());
        assertEquals(clienteActivo.getId(), feed.get(0).getCliente().getId());
    }

    @Test
    void countEntrenosHoy_CuentaSoloLasSesionesDeHoy() {
        // Solo Cbum entrenó hoy. Debería devolver 1.
        long hoy = sesionDAO.countEntrenosHoy(entrenadorMock.getId());
        
        assertEquals(1, hoy);
    }

    @Test
    void countClientesEntrenadosDashboardEnRangoByEntrenador_CuentaClientesConActividadDelEquipo() {
        long hoy = sesionDAO.countClientesEntrenadosDashboardEnRangoByEntrenador(
            entrenadorMock.getId(),
            LocalDate.now().atStartOfDay(),
            LocalDate.now().plusDays(1).atStartOfDay()
        );

        assertEquals(1, hoy);
    }

    @Test
    void countSesionesDashboardEnRangoByEntrenador_CuentaSesionesDeLaSemana() {
        long semana = sesionDAO.countSesionesDashboardEnRangoByEntrenador(
            entrenadorMock.getId(),
            ahora.minusDays(7),
            ahora.plusDays(1)
        );

        assertEquals(2, semana);
    }

    @Test
    void countClientesInactivos_CuentaCorrectamente() {
        // Límite: Hace 7 días. 
        // Cbum entrenó hace 3 días (Activo). Ronnie entrenó hace 10 (Inactivo). Debería devolver 1.
        LocalDateTime limite = ahora.minusDays(7);
        long inactivos = sesionDAO.countClientesInactivos(entrenadorMock.getId(), limite);
        
        assertEquals(1, inactivos);
    }
}
