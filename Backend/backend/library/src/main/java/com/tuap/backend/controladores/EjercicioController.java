package com.tuap.backend.controladores;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestTemplate;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.gestores.GestorEjerciciosApi;
import com.tuap.backend.dto.EjercicioResponse;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.servicios.TraductorEjercicios;

@RestController
@RequestMapping("/api/ejercicios")
public class EjercicioController {

    @Value("${exercisedb.api.key:}")
    private String apiKey;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    private final EjercicioDAO ejercicioDAO;
    private final GestorEjerciciosApi gestorEjerciciosApi;
    private final TraductorEjercicios traductorEjercicios;

    public EjercicioController(
            EjercicioDAO ejercicioDAO,
            GestorEjerciciosApi gestorEjerciciosApi,
            TraductorEjercicios traductorEjercicios) {
        this.ejercicioDAO = ejercicioDAO;
        this.gestorEjerciciosApi = gestorEjerciciosApi;
        this.traductorEjercicios = traductorEjercicios;
    }

    @GetMapping
    public List<EjercicioResponse> obtenerTodos() {
        return ejercicioDAO.findAll()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/total")
    public long totalEjercicios() {
        return ejercicioDAO.count();
    }

    @GetMapping("/buscar")
    public List<EjercicioResponse> buscar(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String musculo) {

        boolean sinNombre = (nombre == null || nombre.isBlank());
        boolean sinMusculo = (musculo == null || musculo.isBlank());

        if (sinNombre && sinMusculo) {
            return ejercicioDAO.findAll()
                    .stream()
                    .map(this::convertirAResponse)
                    .collect(Collectors.toList());
        }

        String nombreOriginalFiltro = null;
        String nombreTraducidoFiltro = null;

        if (!sinNombre) {
            nombreOriginalFiltro = nombre;
            nombreTraducidoFiltro = traducirFiltro(nombre);
        }

        String musculoFiltro = null;
        if (!sinMusculo) {
            musculoFiltro = traducirFiltro(musculo);
        }

        return ejercicioDAO.buscarAvanzadoTraducido(nombreOriginalFiltro, nombreTraducidoFiltro, musculoFiltro)
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    @PostMapping("/importar")
    public List<EjercicioResponse> importarEjercicios() {
        return gestorEjerciciosApi.importarEjerciciosDesdeApi()
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());
    }

    @PostMapping("/retraducir")
    public ResponseEntity<String> retraducirEjercicios() {
        List<Ejercicio> ejercicios = ejercicioDAO.findAll();
        ejercicios.forEach(ejercicio -> {
            if (ejercicio.getNombreTraducido() == null || ejercicio.getNombreTraducido().isBlank()) {
                ejercicio.setNombreTraducido(traductorEjercicios.traducirMusculoAEspanol(ejercicio.getNombre()));
                ejercicioDAO.save(ejercicio);
            }
        });
        return ResponseEntity.ok("Ejercicios retraducidos correctamente: " + ejercicios.size());
    }

    @GetMapping("/imagen/{apiId}")
    public ResponseEntity<byte[]> obtenerImagenEjercicio(@PathVariable String apiId) {
        try {
            if (apiKey == null || apiKey.isBlank()) {
                return ResponseEntity.notFound().build();
            }

            String url = "https://exercisedb.p.rapidapi.com/image?exerciseId=" + apiId + "&resolution=180";

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-RapidAPI-Key", apiKey);
            headers.set("X-RapidAPI-Host", "exercisedb.p.rapidapi.com");

            HttpEntity<String> entity = new HttpEntity<>(headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<byte[]> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    byte[].class
            );

            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.IMAGE_GIF);

            return ResponseEntity.ok()
                    .headers(responseHeaders)
                    .body(response.getBody());

        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    private String traducirFiltro(String texto) {
        if (texto == null || texto.isBlank()) {
            return texto;
        }

        String t = texto.toLowerCase().trim();

        // músculos
        if (t.contains("pecho")) return "chest";
        if (t.contains("espalda")) return "back";
        if (t.contains("pierna") || t.contains("piernas")) return "leg";
        if (t.contains("hombro") || t.contains("hombros")) return "shoulder";
        if (t.contains("brazo") || t.contains("brazos")) return "arm";
        if (t.contains("abdominal") || t.contains("abdominales") || t.contains("abdomen")) return "abs";
        if (t.contains("bíceps") || t.contains("biceps")) return "biceps";
        if (t.contains("tríceps") || t.contains("triceps")) return "triceps";
        if (t.contains("glúteo") || t.contains("gluteo") || t.contains("glúteos") || t.contains("gluteos")) return "glutes";
        if (t.contains("gemelo") || t.contains("gemelos")) return "calves";
        if (t.contains("cuádriceps") || t.contains("cuadriceps")) return "quads";
        if (t.contains("isquio") || t.contains("femoral") || t.contains("isquiotibial")) return "hamstrings";

        // ejercicios comunes
        if (t.contains("sentadilla")) return "squat";
        if (t.contains("peso muerto")) return "deadlift";
        if (t.contains("press banca") || t.contains("press de banca") || t.contains("banca")) return "bench press";
        if (t.contains("dominada") || t.contains("dominadas")) return "pull up";
        if (t.contains("flexion") || t.contains("flexión") || t.contains("flexiones")) return "push up";
        if (t.contains("curl")) return "curl";
        if (t.contains("remo")) return "row";
        if (t.contains("prensa")) return "leg press";
        if (t.contains("zancada")) return "lunge";
        if (t.contains("plancha")) return "plank";
        if (t.contains("abdominal")) return "crunch";
        if (t.contains("hombro")) return "shoulder press";

        return t;
    }

    private EjercicioResponse convertirAResponse(Ejercicio ejercicio) {
        EjercicioResponse response = new EjercicioResponse();

        response.setId(ejercicio.getId());
        response.setApiId(ejercicio.getApiId());
        response.setNombre(ejercicio.getNombre());
        response.setNombreTraducido(
                ejercicio.getNombreTraducido() != null && !ejercicio.getNombreTraducido().isBlank()
                        ? ejercicio.getNombreTraducido()
                        : ejercicio.getNombre()
        );
        response.setGrupoMuscular(ejercicio.getGrupoMuscular());
        response.setGrupoMuscularTraducido(
                traductorEjercicios.traducirMusculoAEspanol(ejercicio.getGrupoMuscular())
        );
        response.setEquipamiento(ejercicio.getEquipamiento());
        response.setParteCuerpo(ejercicio.getParteCuerpo());
        response.setParteCuerpoTraducida(
                traductorEjercicios.traducirParteAEspanol(ejercicio.getParteCuerpo())
        );
        response.setImagenUrl(ejercicio.getImagenUrl());
        response.setVideoUrl(ejercicio.getVideoUrl());
        response.setDificultad(ejercicio.getDificultad());
        response.setInstrucciones(ejercicio.getInstrucciones());

        return response;
    }
}