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

    @Value("${exercisedb.api.key}")
    private String apiKey;

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

    @GetMapping("/buscar")
    public List<EjercicioResponse> buscar(
            @RequestParam(required = false) String nombre,
            @RequestParam(required = false) String musculo) {

        String nombreOriginalFiltro = null;
        String nombreTraducidoFiltro = null;

        if (nombre != null && !nombre.isEmpty()) {
            nombreOriginalFiltro = nombre;
            nombreTraducidoFiltro = traductorEjercicios.traducirNombreAIngles(nombre);
        }

        String musculoFiltro = null;
        if (musculo != null && !musculo.isEmpty()) {
            musculoFiltro = traductorEjercicios.traducirMusculoAIngles(musculo);
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

    @GetMapping("/imagen/{apiId}")
public ResponseEntity<byte[]> obtenerImagenEjercicio(@PathVariable String apiId) {
    try {
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

        // IMPORTANTE: ahora devolvemos la URL de TU backend, no la de RapidAPI
        response.setImagenUrl("http://localhost:8080/api/ejercicios/imagen/" + ejercicio.getApiId());

        response.setVideoUrl(ejercicio.getVideoUrl());
        response.setDificultad(ejercicio.getDificultad());
        response.setInstrucciones(ejercicio.getInstrucciones());

        return response;
    }
}