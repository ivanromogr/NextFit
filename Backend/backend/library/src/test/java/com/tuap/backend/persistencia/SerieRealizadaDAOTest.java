package com.tuap.backend.persistencia;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.entidades.SerieRealizada;
import com.tuap.backend.dominio.entidades.SesionEntrenamiento;

@DataJpaTest
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "jwt.secret=ClaveDePruebaParaQueElContextoNoFalle1234567890" 
})
class SerieRealizadaDAOTest {

    @Autowired
    private SerieRealizadaDAO serieDAO;

    @Autowired
    private TestEntityManager entityManager;

    private Cliente clienteMock;
    private Ejercicio ejercicioMock;

    @BeforeEach
    void setUp() {
        // 1. Creamos al Cliente (con todos los campos obligatorios que ya conocemos)
        clienteMock = new Cliente();
        clienteMock.setNombre("Cbum");
        clienteMock.setApellido("Bumstead");
        clienteMock.setEmail("cbum@mrolympia.com");
        clienteMock.setContrasena("olympia123");
        clienteMock.setGenero("Masculino");
        clienteMock.setObjetivo("Ganar masa muscular");
        clienteMock.setAltura(185);
        clienteMock.setEdad(29);
        clienteMock.setPeso(115.0);
        clienteMock.setRol("CLIENTE");
        clienteMock = entityManager.persistAndFlush(clienteMock);

        // 2. Creamos un Ejercicio
        ejercicioMock = new Ejercicio();
        ejercicioMock.setNombre("Sentadilla Libre");
        ejercicioMock.setGrupoMuscular("Piernas");
        ejercicioMock.setEquipamiento("Barra");
        ejercicioMock = entityManager.persistAndFlush(ejercicioMock);

        // 3. Creamos la Sesión 1 (Fue hace 2 días)
        SesionEntrenamiento sesionAntigua = new SesionEntrenamiento();
        sesionAntigua.setCliente(clienteMock);
        sesionAntigua.setFechaHora(LocalDateTime.now().minusDays(2));
        sesionAntigua.setDuracionSegundos(3600);
        sesionAntigua.setVolumenTotal(3000.0);
        sesionAntigua = entityManager.persistAndFlush(sesionAntigua);

        // 4. Creamos la Sesión 2 (Es la de HOY)
        SesionEntrenamiento sesionNueva = new SesionEntrenamiento();
        sesionNueva.setCliente(clienteMock);
        sesionNueva.setFechaHora(LocalDateTime.now());
        sesionNueva.setDuracionSegundos(4000);
        sesionNueva.setVolumenTotal(3500.0);
        sesionNueva = entityManager.persistAndFlush(sesionNueva);

        // 5. Metemos Series Realizadas
        // Serie 1: Sesion antigua, COMPLETADA
        SerieRealizada serie1 = new SerieRealizada();
        serie1.setSesion(sesionAntigua);
        serie1.setEjercicio(ejercicioMock);
        serie1.setHecho(true);
        serie1.setPeso(100.0);
        serie1.setReps(10);
        serie1.setRpe(8);
        serie1.setSetIndex(1);
        serie1.setVolumenSerie(1000.0);
        entityManager.persist(serie1);

        // Serie 2: Sesion nueva, COMPLETADA
        SerieRealizada serie2 = new SerieRealizada();
        serie2.setSesion(sesionNueva);
        serie2.setEjercicio(ejercicioMock);
        serie2.setHecho(true);
        serie2.setPeso(110.0);
        serie2.setReps(8);
        serie2.setRpe(9);
        serie2.setSetIndex(1);
        serie2.setVolumenSerie(880.0);
        entityManager.persist(serie2);

        // Serie 3: Sesion nueva, FALLADA / NO COMPLETADA (hecho = false)
        SerieRealizada serie3 = new SerieRealizada();
        serie3.setSesion(sesionNueva);
        serie3.setEjercicio(ejercicioMock);
        serie3.setHecho(false); 
        serie3.setPeso(120.0);
        serie3.setReps(3);
        serie3.setRpe(10);
        serie3.setSetIndex(2);
        serie3.setVolumenSerie(360.0);
        entityManager.persist(serie3);

        entityManager.flush();
    }

    @Test
    void findBySesionClienteIdAndEjercicioId_DevuelveTodasLasSeriesDelClienteYEjercicio() {
        // Debería traer las 3 series (las 2 hechas y la 1 fallada)
        List<SerieRealizada> todas = serieDAO.findBySesionClienteIdAndEjercicioId(
            clienteMock.getId(), 
            ejercicioMock.getId()
        );

        assertEquals(3, todas.size());
    }

    @Test
    void findHistorialEjercicio_DevuelveSoloSeriesCompletadasEnOrdenCronologico() {
        // Debería traer SOLO las 2 series que tienen "hecho = true"
        List<SerieRealizada> historial = serieDAO.findHistorialEjercicio(
            clienteMock.getId(), 
            ejercicioMock.getId()
        );

        assertEquals(2, historial.size());

        // Comprobamos el orden cronológico ASCENDENTE (la antigua primero)
        // La serie 1 se hizo con 100kg en la sesión antigua
        assertEquals(100.0, historial.get(0).getPeso());
        assertTrue(historial.get(0).isHecho());
        
        // La serie 2 se hizo con 110kg en la sesión nueva
        assertEquals(110.0, historial.get(1).getPeso());
        assertTrue(historial.get(1).isHecho());
    }
}
