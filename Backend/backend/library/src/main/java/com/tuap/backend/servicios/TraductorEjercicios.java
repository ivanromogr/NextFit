package com.tuap.backend.servicios;

import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

@Service
public class TraductorEjercicios {

    private final Map<String, String> musculoEsAEn = new HashMap<>();
    private final Map<String, String> musculoEnAEs = new HashMap<>();

    private final Map<String, String> parteEsAEn = new HashMap<>();
    private final Map<String, String> parteEnAEs = new HashMap<>();

    private final Map<String, String> nombreEnAEs = new HashMap<>();
    private final Map<String, String> nombreEsAEn = new HashMap<>();

    public TraductorEjercicios() {
        registrarMusculo("abs", "abdominales");
        registrarMusculo("back", "espalda");
        registrarMusculo("chest", "pecho");
        registrarMusculo("shoulders", "hombros");
        registrarMusculo("biceps", "biceps");
        registrarMusculo("triceps", "triceps");
        registrarMusculo("quads", "cuadriceps");
        registrarMusculo("hamstrings", "isquiotibiales");
        registrarMusculo("glutes", "gluteos");
        registrarMusculo("calves", "gemelos");
        registrarMusculo("lats", "dorsales");
        registrarMusculo("traps", "trapecios");
        registrarMusculo("forearms", "antebrazos");
        registrarMusculo("neck", "cuello");
        registrarMusculo("cardio", "cardio");

        registrarParte("waist", "cintura");
        registrarParte("back", "espalda");
        registrarParte("upper arms", "brazos");
        registrarParte("lower arms", "antebrazos");
        registrarParte("upper legs", "piernas");
        registrarParte("lower legs", "piernas inferiores");
        registrarParte("chest", "pecho");
        registrarParte("shoulders", "hombros");
        registrarParte("neck", "cuello");
        registrarParte("cardio", "cardio");

        registrarNombre("3/4 sit-up", "abdominal parcial");
        registrarNombre("45° side bend", "flexion lateral 45 grados");
        registrarNombre("air bike", "bicicleta abdominal");
        registrarNombre("alternate heel touchers", "toques alternos de talones");
        registrarNombre("band assisted wheel rollerout", "ab wheel asistido con banda");
        registrarNombre("barbell curl", "curl con barra");
        registrarNombre("barbell deadlift", "peso muerto con barra");
        registrarNombre("bench press", "press banca");
        registrarNombre("bodyweight squat", "sentadilla con peso corporal");
        registrarNombre("cable fly", "aperturas en polea");
        registrarNombre("crunch", "crunch abdominal");
        registrarNombre("dumbbell curl", "curl con mancuernas");
        registrarNombre("dumbbell row", "remo con mancuerna");
        registrarNombre("lat pulldown", "jalon al pecho");
        registrarNombre("leg raise", "elevacion de piernas");
        registrarNombre("muscle up", "muscle up");
        registrarNombre("plank", "plancha");
        registrarNombre("pull up", "dominada");
        registrarNombre("push up", "flexion");
        registrarNombre("roller back stretch", "estiramiento hacia atras con rodillo");
        registrarNombre("sit-up", "abdominal");
        registrarNombre("triceps dip", "fondo de triceps");
    }

    private void registrarMusculo(String en, String es) {
        musculoEnAEs.put(normalizar(en), es);
        musculoEsAEn.put(normalizar(es), en);
    }

    private void registrarParte(String en, String es) {
        parteEnAEs.put(normalizar(en), es);
        parteEsAEn.put(normalizar(es), en);
    }

    private void registrarNombre(String en, String es) {
        nombreEnAEs.put(normalizar(en), es);
        nombreEsAEn.put(normalizar(es), en);
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }

        String textoNormalizado = Normalizer.normalize(texto, Normalizer.Form.NFD);
        textoNormalizado = textoNormalizado.replaceAll("\\p{M}", "");

        return textoNormalizado.trim().toLowerCase();
    }

    public String traducirMusculoAIngles(String valorUsuario) {
        if (valorUsuario == null || valorUsuario.isBlank()) {
            return null;
        }

        String normalizado = normalizar(valorUsuario);
        return musculoEsAEn.getOrDefault(normalizado, valorUsuario.trim().toLowerCase());
    }

    public String traducirMusculoAEspanol(String valorBd) {
        if (valorBd == null || valorBd.isBlank()) {
            return null;
        }

        String normalizado = normalizar(valorBd);
        return musculoEnAEs.getOrDefault(normalizado, valorBd);
    }

    public String traducirParteAIngles(String valorUsuario) {
        if (valorUsuario == null || valorUsuario.isBlank()) {
            return null;
        }

        String normalizado = normalizar(valorUsuario);
        return parteEsAEn.getOrDefault(normalizado, valorUsuario.trim().toLowerCase());
    }

    public String traducirParteAEspanol(String valorBd) {
        if (valorBd == null || valorBd.isBlank()) {
            return null;
        }

        String normalizado = normalizar(valorBd);
        return parteEnAEs.getOrDefault(normalizado, valorBd);
    }

    public String traducirNombreAEspanol(String nombreBd) {
        if (nombreBd == null || nombreBd.isBlank()) {
            return null;
        }

        String normalizado = normalizar(nombreBd);
        return nombreEnAEs.getOrDefault(normalizado, nombreBd);
    }

    public String traducirNombreAIngles(String nombreUsuario) {
        if (nombreUsuario == null || nombreUsuario.isBlank()) {
            return null;
        }

        String normalizado = normalizar(nombreUsuario);
        return nombreEsAEn.getOrDefault(normalizado, nombreUsuario.trim().toLowerCase());
    }
}