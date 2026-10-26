package com.tuap.backend;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.util.ExerciseMediaUrls;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

class ExerciseMediaSecurityTest {
    private static final String KEY = "fictional-provider-key";
    private static final String LEGACY = "https://exercisedb.p.rapidapi.com/image?exerciseId=1234&rapidapi-key=" + KEY;

    @Test void newMediaStoresOnlyTheLocalProxyPath() {
        Ejercicio exercise = new Ejercicio();
        exercise.setApiId("1234");
        exercise.setImagenUrl(LEGACY);
        assertEquals("/api/ejercicios/imagen/1234", ReflectionTestUtils.getField(exercise, "imagenUrl"));
    }

    @Test void serializationProtectsExistingRowsEvenWhenSettersWereBypassed() throws Exception {
        Ejercicio exercise = new Ejercicio();
        exercise.setApiId("1234");
        for (String field : new String[]{"imagenUrl", "imagenPaso1", "imagenPaso2", "imagenPaso3", "videoUrl"}) {
            ReflectionTestUtils.setField(exercise, field, LEGACY);
        }
        String json = new ObjectMapper().writeValueAsString(exercise);
        assertFalse(json.contains(KEY));
        assertFalse(json.contains("rapidapi-key"));
        assertFalse(json.contains("exercisedb.p.rapidapi.com"));
        assertTrue(json.contains("/api/ejercicios/imagen/1234"));
    }

    @Test void legacyIdCanBeRecoveredWithoutForwardingItsCredential() {
        assertEquals("/api/ejercicios/imagen/1234", ExerciseMediaUrls.forClient(null, LEGACY));
        assertEquals("/api/ejercicios/imagen/catalog-id", ExerciseMediaUrls.forClient("catalog-id", LEGACY));
    }

    @Test void credentialsAreRejectedOnOtherHostsIncludingEncodedNames() {
        for (String parameter : new String[]{"rapidapi-key", "X-RapidAPI-Key", "api_key", "%61pi_key", "token", "password"}) {
            assertNull(ExerciseMediaUrls.forClient("1234", "https://media.example.invalid/image?" + parameter + "=" + KEY));
        }
        assertNull(ExerciseMediaUrls.forClient("1234", "https://user:password@media.example.invalid/file.gif"));
    }

    @Test void ordinaryOwnMediaAndNullValuesArePreserved() {
        for (String url : new String[]{"/images/squat demo.gif", "https://media.example.invalid/video.mp4", "/api/upload/files/fixture", ""}) {
            assertEquals(url, ExerciseMediaUrls.forClient("1234", url));
        }
        assertNull(ExerciseMediaUrls.forClient("1234", null));
    }

    @Test void malformedOrInjectedIdentifiersCannotBecomeProxyPaths() {
        for (String id : new String[]{"", "../private", "1234&resolution=9999", "id?token=secret", "x".repeat(81)}) {
            assertFalse(ExerciseMediaUrls.validId(id));
            assertThrows(IllegalArgumentException.class, () -> ExerciseMediaUrls.proxyPath(id));
        }
        assertNull(ExerciseMediaUrls.forClient(null, "https://exercisedb.p.rapidapi.com/image?exerciseId=../private&rapidapi-key=" + KEY));
    }
}
