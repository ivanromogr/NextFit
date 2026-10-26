package com.tuap.backend;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.gestores.GestorEjerciciosApi;
import com.tuap.backend.dto.EjercicioApiResponse;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.servicios.ServicioTraduccion;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(OutputCaptureExtension.class)
class ExerciseProviderImportSecurityTest {
    private static EjercicioApiResponse row(String id) {
        var row = new EjercicioApiResponse(); row.setId(id); row.setName("Fixture");
        row.setTarget("legs"); row.setEquipment("body weight"); return row;
    }

    @Test void repeatedPagesStopInsteadOfSpendingRequestsForever() {
        EjercicioDAO dao = mock(EjercicioDAO.class);
        when(dao.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        var service = new GestorEjerciciosApi(dao, mock(ServicioTraduccion.class));
        ReflectionTestUtils.setField(service, "apiKey", "fictional-pagination-key");
        try (var construction = mockConstruction(RestTemplate.class, (client, context) ->
                doReturn(ResponseEntity.ok(List.of(row("1234")))).when(client)
                        .exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))) {
            assertEquals(1, service.importarEjerciciosDesdeApi().size());
            verify(construction.constructed().get(0), times(2)).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class));
            verify(dao, times(1)).saveAll(anyList());
        }
    }

    @Test void importHasAHardPageCeiling(CapturedOutput output) {
        EjercicioDAO dao = mock(EjercicioDAO.class);
        when(dao.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        var service = new GestorEjerciciosApi(dao, mock(ServicioTraduccion.class));
        ReflectionTestUtils.setField(service, "apiKey", "fictional-pagination-key");
        AtomicInteger pages = new AtomicInteger();
        try (var construction = mockConstruction(RestTemplate.class, (client, context) ->
                doAnswer(invocation -> ResponseEntity.ok(List.of(row("item-" + pages.incrementAndGet())))).when(client)
                        .exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))) {
            assertEquals(50, service.importarEjerciciosDesdeApi().size());
            assertEquals(50, pages.get());
            assertTrue(output.getAll().contains("catalog may be incomplete"));
        }
    }

    @Test void importUsesCredentialHeaderButPersistsNoSecretInMedia() {
        EjercicioDAO dao = mock(EjercicioDAO.class);
        ServicioTraduccion translation = mock(ServicioTraduccion.class);
        when(translation.traducirTexto(anyString(), eq("en"), eq("es"))).thenReturn("Ejercicio de prueba");
        when(dao.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));
        GestorEjerciciosApi service = new GestorEjerciciosApi(dao, translation);
        String key = "fictional-import-key";
        ReflectionTestUtils.setField(service, "apiKey", key);
        EjercicioApiResponse row = new EjercicioApiResponse();
        row.setId("1234"); row.setName("Fixture"); row.setTarget("legs"); row.setEquipment("body weight");
        try (var construction = mockConstruction(RestTemplate.class, (client, context) ->
                doReturn(ResponseEntity.ok(List.of(row)), ResponseEntity.ok(List.of()))
                        .when(client).exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))) {
            List<Ejercicio> result = service.importarEjerciciosDesdeApi();
            assertEquals(1, result.size());
            assertEquals("/api/ejercicios/imagen/1234", result.get(0).getImagenUrl());
            assertEquals("/api/ejercicios/imagen/1234", ReflectionTestUtils.getField(result.get(0), "imagenUrl"));
            verify(construction.constructed().get(0), times(2)).exchange(
                    argThat((String url) -> !url.contains(key)), eq(HttpMethod.GET),
                    argThat((HttpEntity<?> request) -> key.equals(request.getHeaders().getFirst("X-RapidAPI-Key"))),
                    any(ParameterizedTypeReference.class));
        }
    }

    @Test void providerFailureDoesNotLogItsBodyOrCredential(CapturedOutput output) {
        var service = new GestorEjerciciosApi(mock(EjercicioDAO.class), mock(ServicioTraduccion.class));
        String key = "fictional-key-echoed-by-provider";
        ReflectionTestUtils.setField(service, "apiKey", key);
        try (var construction = mockConstruction(RestTemplate.class, (client, context) ->
                doThrow(new IllegalStateException("provider echoed " + key)).when(client)
                        .exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), any(ParameterizedTypeReference.class)))) {
            assertTrue(service.importarEjerciciosDesdeApi().isEmpty());
            assertFalse(output.getAll().contains(key));
            assertTrue(output.getAll().contains("Exercise provider import failed"));
        }
    }
}
