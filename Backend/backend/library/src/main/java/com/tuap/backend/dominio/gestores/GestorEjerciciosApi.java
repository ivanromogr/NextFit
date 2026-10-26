package com.tuap.backend.dominio.gestores;

import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

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
import com.tuap.backend.util.ExerciseMediaUrls;
import com.tuap.backend.util.ExerciseProviderHttp;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class GestorEjerciciosApi {
    private static final Logger log = LoggerFactory.getLogger(GestorEjerciciosApi.class);

    @Value("${exercisedb.api.key:}")
    private String apiKey;

    private final EjercicioDAO ejercicioDAO;
    private final ServicioTraduccion servicioTraduccion;

    public GestorEjerciciosApi(EjercicioDAO ejercicioDAO, ServicioTraduccion servicioTraduccion) {
        this.ejercicioDAO = ejercicioDAO;
        this.servicioTraduccion = servicioTraduccion;
    }

    public List<Ejercicio> importarEjerciciosDesdeApi() {

        if (apiKey == null || apiKey.isBlank()) {
            System.out.println("⚠️ No hay EXERCISEDB_API_KEY configurada. No se puede importar.");
            return new ArrayList<>();
        }

        RestTemplate restTemplate = ExerciseProviderHttp.client();

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RapidAPI-Key", apiKey);
        headers.set("X-RapidAPI-Host", "exercisedb.p.rapidapi.com");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        List<Ejercicio> ejerciciosGuardadosTotales = new ArrayList<>();

        int limit = 100;
        int offset = 0;
        Set<String> seenIds = new HashSet<>();

        try {
            // Safety ceiling, not a paid-plan quota. Review provider limits before activation.
            for (int page = 0; page < 50; page++) {

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
                boolean madeProgress = false;

                for (EjercicioApiResponse api : ejerciciosApi) {
                    if (api == null || !ExerciseMediaUrls.validId(api.getId()) || !seenIds.add(api.getId())) continue;
                    madeProgress = true;
                    if (api.getName() != null
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

                        ejercicio.setImagenUrl(ExerciseMediaUrls.proxyPath(api.getId()));

                        ejercicio.setVideoUrl(null);
                        ejercicio.setDificultad(null);
                        ejercicio.setInstrucciones(null);

                        ejerciciosGuardar.add(ejercicio);
                    }
                }
                if (!madeProgress) {
                    log.warn("Exercise provider pagination did not advance; stopping import");
                    break;
                }

                System.out.println("Ejercicios nuevos a guardar en este bloque: " + ejerciciosGuardar.size());

                if (!ejerciciosGuardar.isEmpty()) {
                    List<Ejercicio> guardados = ejercicioDAO.saveAll(ejerciciosGuardar);
                    ejerciciosGuardadosTotales.addAll(guardados);
                }

                offset += ejerciciosApi.size();
                if (page == 49) log.warn("Exercise import reached page safety limit; catalog may be incomplete");
            }

            System.out.println("=========================================");
            System.out.println("IMPORTACIÓN FINALIZADA");
            System.out.println("Total ejercicios nuevos guardados: " + ejerciciosGuardadosTotales.size());
            System.out.println("Total ejercicios en BD ahora: " + ejercicioDAO.count());
            System.out.println("=========================================");

            return ejerciciosGuardadosTotales;

        } catch (Exception e) {
            // Provider bodies/messages can echo credentials; do not log either.
            log.warn("Exercise provider import failed (type={})", e.getClass().getSimpleName());
            return new ArrayList<>();
        }
    }

    public int retraducirEjerciciosGuardados() {
        List<Ejercicio> ejercicios = ejercicioDAO.findAll();
        int totalActualizados = 0;

        for (Ejercicio ejercicio : ejercicios) {
            boolean necesitaTraduccion =
                    ejercicio.getNombre() != null
                    && !ejercicio.getNombre().isBlank()
                    && (
                        ejercicio.getNombreTraducido() == null
                        || ejercicio.getNombreTraducido().isBlank()
                        || ejercicio.getNombreTraducido().trim().equalsIgnoreCase(ejercicio.getNombre().trim())
                    );

            if (!necesitaTraduccion) {
                continue;
            }

            try {
                ejercicio.setNombreTraducido(ejercicio.getNombre());
                ejercicioDAO.save(ejercicio);
                totalActualizados++;
            } catch (Exception e) {
                System.out.println("⚠️ Error retraduciendo ejercicio: " + ejercicio.getNombre());
                e.printStackTrace();
            }
        }

        System.out.println("=========================================");
        System.out.println("RETRADUCCIÓN FINALIZADA");
        System.out.println("Total ejercicios actualizados: " + totalActualizados);
        System.out.println("=========================================");

        return totalActualizados;
    }
}
