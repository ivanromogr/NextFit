package com.tuap.backend.persistencia;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.TestPropertySource;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Resena;

@DataJpaTest
@TestPropertySource(properties = {
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"
})
class ResenaDAOTest {

    @Autowired
    private ResenaDAO resenaDAO;

    @Autowired
    private TestEntityManager entityManager;

    private Entrenador entrenadorMock;
    private Entrenador entrenadorSinResenas;
    private Cliente clienteMock;

    @BeforeEach
    void setUp() {
        // 1. Creamos el Entrenador al que le pondremos reseñas
        entrenadorMock = new Entrenador();
        entrenadorMock.setNombre("Arnold");
        entrenadorMock.setApellido("Schwarzenegger");
        entrenadorMock.setEmail("arnold@goldgym.com");
        entrenadorMock.setContrasena("terminator123");
        entrenadorMock.setEspecialidad("Culturismo");
        entrenadorMock.setRol("ENTRENADOR");
        entrenadorMock = entityManager.persistAndFlush(entrenadorMock);

        // Creamos otro entrenador "fantasma" que nadie ha puntuado todavía
        entrenadorSinResenas = new Entrenador();
        entrenadorSinResenas.setNombre("Ronnie");
        entrenadorSinResenas.setApellido("Coleman");
        entrenadorSinResenas.setEmail("ronnie@lightweight.com");
        entrenadorSinResenas.setContrasena("yeahbuddy");
        entrenadorSinResenas.setEspecialidad("Fuerza");
        entrenadorSinResenas.setRol("ENTRENADOR");
        entrenadorSinResenas = entityManager.persistAndFlush(entrenadorSinResenas);

        // 2. Creamos el Cliente que escribirá las reseñas (usamos nuestro modelo a prueba de fallos)
        clienteMock = new Cliente();
        clienteMock.setNombre("Cbum");
        clienteMock.setApellido("Bumstead");
        clienteMock.setEmail("cbum@mrolympia.com");
        clienteMock.setContrasena("olympia123");
        clienteMock.setGenero("Masculino");
        clienteMock.setObjetivo("Ganar masa");
        clienteMock.setAltura(185);
        clienteMock.setEdad(29);
        clienteMock.setPeso(115.0);
        clienteMock.setRol("CLIENTE");
        clienteMock = entityManager.persistAndFlush(clienteMock);

        // 3. Escribimos 2 reseñas para Arnold
        Resena resenaAntigua = new Resena();
        resenaAntigua.setCliente(clienteMock);
        resenaAntigua.setEntrenador(entrenadorMock);
        resenaAntigua.setEstrellas(3); // Nota regular
        resenaAntigua.setComentario("Buen entreno, pero me gritó mucho.");
        resenaAntigua.setFecha(LocalDateTime.now().minusDays(5)); // Hace 5 días
        entityManager.persist(resenaAntigua);

        Resena resenaNueva = new Resena();
        resenaNueva.setCliente(clienteMock);
        resenaNueva.setEntrenador(entrenadorMock);
        resenaNueva.setEstrellas(5); // Nota perfecta
        resenaNueva.setComentario("¡I'll be back! Increíble.");
        resenaNueva.setFecha(LocalDateTime.now()); // Hoy mismo
        entityManager.persist(resenaNueva);

        entityManager.flush();
    }

    @Test
    void findByEntrenadorIdOrderByFechaDesc_DevuelveListaOrdenada() {
        List<Resena> reseñas = resenaDAO.findByEntrenadorIdOrderByFechaDesc(entrenadorMock.getId());

        assertEquals(2, reseñas.size());
        
        // La primera de la lista tiene que ser la "resenaNueva" (5 estrellas) porque es de HOY
        assertEquals(5, reseñas.get(0).getEstrellas());
        // La segunda de la lista tiene que ser la "resenaAntigua" (3 estrellas) porque es de HACE 5 DÍAS
        assertEquals(3, reseñas.get(1).getEstrellas());
    }

    @Test
    void calcularMediaPorEntrenador_ConResenas_CalculaLaMedia() {
        // Arnold tiene un 3 y un 5. La media aritmética es 4.0
        Double media = resenaDAO.calcularMediaPorEntrenador(entrenadorMock.getId());

        assertNotNull(media);
        assertEquals(4.0, media);
    }

    @Test
    void calcularMediaPorEntrenador_SinResenas_DevuelveNull() {
        // Ronnie no tiene ninguna reseña. Debería devolver null sin explotar.
        Double media = resenaDAO.calcularMediaPorEntrenador(entrenadorSinResenas.getId());

        assertNull(media);
    }
}
