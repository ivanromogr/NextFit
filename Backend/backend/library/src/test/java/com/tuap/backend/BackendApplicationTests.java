package com.tuap.backend;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class ContextLoadTest {

    @Test
    void contextLoads() {
        // Este test simplemente comprueba que el servidor de Spring Boot 
        // es capaz de arrancar sin petar. Si arranca, el test pasa (Verde).
        System.out.println("✅ El contexto de prueba ha cargado correctamente.");
    }
}
