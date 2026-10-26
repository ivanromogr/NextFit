package com.tuap.backend.controladores;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.dominio.gestores.GestorEjerciciosApi;
import com.tuap.backend.dto.EjercicioResponse;
import com.tuap.backend.persistencia.EjercicioDAO;
import com.tuap.backend.servicios.EjercicioSeeder;
import com.tuap.backend.servicios.TraductorEjercicios;
import com.tuap.backend.util.ExerciseMediaUrls;
import com.tuap.backend.util.ExerciseProviderHttp;

@RestController
@RequestMapping("/api/ejercicios")
public class EjercicioController {

    @Value("${exercisedb.api.key:}")
    private String apiKey;

    @Value("${app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    private final EjercicioDAO ejercicioDAO;
    private final GestorEjerciciosApi gestorEjerciciosApi;
    private final EjercicioSeeder ejercicioSeeder;
    private final TraductorEjercicios traductorEjercicios;

    public EjercicioController(
            EjercicioDAO ejercicioDAO,
            GestorEjerciciosApi gestorEjerciciosApi,
            EjercicioSeeder ejercicioSeeder,
            TraductorEjercicios traductorEjercicios) {
        this.ejercicioDAO = ejercicioDAO;
        this.gestorEjerciciosApi = gestorEjerciciosApi;
        this.ejercicioSeeder = ejercicioSeeder;
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

        String nombreFiltro = null;
        List<String> musculosFiltro = null;

        if (!sinNombre) {
            nombreFiltro = nombre.trim();
        }

        if (!sinMusculo) {
            musculosFiltro = traducirMusculoALista(musculo);
        }

        return ejercicioDAO.buscarAvanzadoConListaMusculos(nombreFiltro, musculosFiltro)
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

    @PostMapping("/importar-json")
    public ResponseEntity<List<EjercicioResponse>> importarEjerciciosDesdeJson(
            @RequestParam(defaultValue = "false") boolean replace) {
        List<EjercicioResponse> ejercicios = ejercicioSeeder.importarDesdeJson(replace)
                .stream()
                .map(this::convertirAResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ejercicios);
    }

    @PostMapping("/retraducir")
    public ResponseEntity<String> retraducirEjercicios() {
        int total = gestorEjerciciosApi.retraducirEjerciciosGuardados();
        return ResponseEntity.ok("Ejercicios retraducidos correctamente: " + total);
    }

    @GetMapping("/imagen/{apiId}")
    public ResponseEntity<byte[]> obtenerImagenEjercicio(@PathVariable String apiId) {
        try {
            if (!ExerciseMediaUrls.validId(apiId)) {
                return ResponseEntity.badRequest().build();
            }
            if (apiKey == null || apiKey.isBlank()) {
                return ResponseEntity.notFound().build();
            }
            if (!ejercicioDAO.existsByApiId(apiId)) return ResponseEntity.notFound().build();

            String url = "https://exercisedb.p.rapidapi.com/image?exerciseId=" + apiId + "&resolution=180";

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-RapidAPI-Key", apiKey);
            headers.set("X-RapidAPI-Host", "exercisedb.p.rapidapi.com");

            return ExerciseProviderHttp.image(ExerciseProviderHttp.client(), url, headers);

        } catch (Exception e) {
            return ResponseEntity.status(502).build();
        }
    }

    private List<String> traducirMusculoALista(String musculo) {
        if (musculo == null || musculo.isBlank()) {
            return null;
        }

        String m = musculo.toLowerCase().trim();

        if (m.contains("pierna") || m.contains("piernas")) {
            return Arrays.asList("quads", "hamstrings", "glutes", "calves", "leg");
        }

        if (m.contains("espalda")) {
            return Arrays.asList("back", "lats", "traps", "spine", "rhomboids");
        }

        if (m.contains("pecho")) {
            return Arrays.asList("chest");
        }

        if (m.contains("brazo") || m.contains("brazos")) {
            return Arrays.asList("biceps", "triceps", "forearms", "arm");
        }

        if (m.contains("hombro") || m.contains("hombros")) {
            return Arrays.asList("shoulders", "shoulder", "traps");
        }

        if (m.contains("abdominal") || m.contains("abdominales") || m.contains("abdomen")) {
            return Arrays.asList("abs", "waist", "serratus anterior");
        }

        if (m.contains("bíceps") || m.contains("biceps")) {
            return Arrays.asList("biceps");
        }

        if (m.contains("tríceps") || m.contains("triceps")) {
            return Arrays.asList("triceps");
        }

        if (m.contains("glúteo") || m.contains("gluteo") || m.contains("glúteos") || m.contains("gluteos")) {
            return Arrays.asList("glutes");
        }

        if (m.contains("gemelo") || m.contains("gemelos")) {
            return Arrays.asList("calves");
        }

        if (m.contains("cuádriceps") || m.contains("cuadriceps")) {
            return Arrays.asList("quads");
        }

        if (m.contains("isquio") || m.contains("femoral") || m.contains("isquiotibial")) {
            return Arrays.asList("hamstrings");
        }

        return null;
    }

    private EjercicioResponse convertirAResponse(Ejercicio ejercicio) {
        EjercicioResponse response = new EjercicioResponse();

        response.setId(ejercicio.getId());
        response.setApiId(ejercicio.getApiId());
        response.setSlug(ejercicio.getSlug());
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
        response.setSubgrupoMuscular(ejercicio.getSubgrupoMuscular());
        response.setEquipamiento(ejercicio.getEquipamiento());
        response.setParteCuerpo(ejercicio.getParteCuerpo());
        response.setParteCuerpoTraducida(
                traductorEjercicios.traducirParteAEspanol(ejercicio.getParteCuerpo())
        );
        response.setImagenUrl(ejercicio.getImagenUrl());
        response.setImagenPaso1(ejercicio.getImagenPaso1());
        response.setImagenPaso2(ejercicio.getImagenPaso2());
        response.setImagenPaso3(ejercicio.getImagenPaso3());
        response.setVideoUrl(ejercicio.getVideoUrl());
        response.setDificultad(ejercicio.getDificultad());
        response.setNivel(ejercicio.getNivel());
        response.setTipoMovimiento(ejercicio.getTipoMovimiento());
        response.setDescripcionCorta(ejercicio.getDescripcionCorta());
        response.setInstrucciones(ejercicio.getInstrucciones());
        response.setConsejosTecnicos(ejercicio.getConsejosTecnicos());
        response.setErroresComunes(ejercicio.getErroresComunes());
        response.setTieneAnimacion(ejercicio.getTieneAnimacion());
        response.setTipoVisual(ejercicio.getTipoVisual());
        response.setOrigen(ejercicio.getOrigen());
        response.setActivo(ejercicio.getActivo());

        return response;
    }
}
