package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class JwtPropertiesTest {

    private static final String VALID_TEST_SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";

    @Autowired
    private JwtProperties jwtProperties;

    @Test
    void cargaPropiedadesDelPerfilTest() {
        assertEquals("nextfit-api-test", jwtProperties.getIssuer());
        assertEquals("nextfit-clients-test", jwtProperties.getAudience());
        assertEquals(900, jwtProperties.getAccessTokenTtlSeconds());
        assertEquals(60, jwtProperties.getClockSkewSeconds());
    }

    @Test
    void rechazaSecretAusenteNoBase64OCorto() {
        assertThrows(IllegalStateException.class, () -> properties(null).validate());
        assertThrows(IllegalStateException.class, () -> properties("no-es-base64").validate());
        assertThrows(IllegalStateException.class, () -> properties("dG9vLXNob3J0").validate());
    }

    private JwtProperties properties(String secret) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(secret);
        properties.setIssuer("nextfit-api-test");
        properties.setAudience("nextfit-clients-test");
        properties.setAccessTokenTtlSeconds(900);
        properties.setClockSkewSeconds(60);
        return properties;
    }
}
