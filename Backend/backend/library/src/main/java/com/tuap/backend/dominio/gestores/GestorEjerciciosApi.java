package com.tuap.backend.dominio.gestores;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dto.EjercicioApiResponse;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.servicios.ServicioTraduccion;

@Service
public class GestorEjerciciosApi {

    @Value("${exercisedb.api.key}")
    private String apiKey;

    private final EjercicioDAO ejercicioDAO;
    private final ServicioTraduccion servicioTraduccion;

    public GestorEjerciciosApi(EjercicioDAO ejercicioDAO, ServicioTraduccion servicioTraduccion) {
        this.ejercicioDAO = ejercicioDAO;
        this.servicioTraduccion = servicioTraduccion;
    }

    public List<Ejercicio> importarEjerciciosDesdeApi() {

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RapidAPI-Key", apiKey);
        headers.set("X-RapidAPI-Host", "exercisedb.p.rapidapi.com");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        List<Ejercicio> ejerciciosGuardadosTotales = new ArrayList<>();

        int limit = 100;
        int offset = 0;

        try {
            while (true) {

                String url = "https://exercisedb.p.rapidapi.com/exercises?limit=" + limit + "&offset=" + offset;

                System.out.println("=========================================");
                System.out.println("Llamando a URL: " + url);

                ResponseEntity<List<EjercicioApiResponse>> response = restTemplate.exchange(
                        url,
                        HttpMethod.GET,
                        entity,
                        new ParameterizedTypeReference<List<EjercicioApiResponse>>() {}
                );

                List<EjercicioApiResponse> ejerciciosApi = response.getBody();

                if (ejerciciosApi == null || ejerciciosApi.isEmpty()) {
                    System.out.println("No se recibieron más ejercicios. Fin de la importación.");
                    break;
                }

                System.out.println("Ejercicios recibidos desde la API: " + ejerciciosApi.size());

                List<Ejercicio> ejerciciosGuardar = new ArrayList<>();

                for (EjercicioApiResponse api : ejerciciosApi) {
                    if (api.getId() != null
                            && api.getName() != null
                            && api.getTarget() != null
                            && api.getEquipment() != null
                            && !ejercicioDAO.existsByApiId(api.getId())) {

                        String nombreTraducido;
                        try {
                            nombreTraducido = servicioTraduccion.traducirTexto(api.getName(), "en", "es");
                        } catch (Exception e) {
                            System.out.println("⚠️ Error traduciendo ejercicio " + api.getName() + ". Se guarda el nombre original.");
                            nombreTraducido = api.getName();
                        }

                        Ejercicio ejercicio = new Ejercicio();
                        ejercicio.setApiId(api.getId());
                        ejercicio.setNombre(api.getName());
                        ejercicio.setNombreTraducido(nombreTraducido);
                        ejercicio.setGrupoMuscular(api.getTarget());
                        ejercicio.setEquipamiento(api.getEquipment());
                        ejercicio.setParteCuerpo(api.getBodyPart());

                        ejercicio.setImagenUrl(
                                "https://exercisedb.p.rapidapi.com/image?exerciseId="
                                        + api.getId()
                                        + "&resolution=180"
                                        + "&rapidapi-key=" + apiKey
                        );

                        ejercicio.setVideoUrl(null);
                        ejercicio.setDificultad(null);
                        ejercicio.setInstrucciones(null);

                        ejerciciosGuardar.add(ejercicio);
                    }
                }

                System.out.println("Ejercicios nuevos a guardar en este bloque: " + ejerciciosGuardar.size());

                if (!ejerciciosGuardar.isEmpty()) {
                    List<Ejercicio> guardados = ejercicioDAO.saveAll(ejerciciosGuardar);
                    ejerciciosGuardadosTotales.addAll(guardados);
                }

                offset += ejerciciosApi.size();
            }

            System.out.println("=========================================");
            System.out.println("IMPORTACIÓN FINALIZADA");
            System.out.println("Total ejercicios nuevos guardados: " + ejerciciosGuardadosTotales.size());
            System.out.println("Total ejercicios en BD ahora: " + ejercicioDAO.count());
            System.out.println("=========================================");

            return ejerciciosGuardadosTotales;

        } catch (Exception e) {
            System.out.println("❌ ERROR al llamar a la API:");
            e.printStackTrace();
            return new ArrayList<>();
        }
    }
}