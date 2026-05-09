package com.tuap.backend.servicios;

import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

@Service
public class EjercicioSeeder {

    private final EjercicioDAO ejercicioDAO;
    private final ObjectMapper mapper = new ObjectMapper();

    public EjercicioSeeder(EjercicioDAO ejercicioDAO) {
        this.ejercicioDAO = ejercicioDAO;
    }

    @Transactional
    public List<Ejercicio> importarDesdeJson(boolean reemplazarCatalogo) {
        try (InputStream inputStream = getClass().getResourceAsStream("/ejercicios.json")) {
            if (inputStream == null) {
                throw new IllegalStateException("No se encontro ejercicios.json en src/main/resources");
            }

            if (reemplazarCatalogo) {
                ejercicioDAO.deleteAllInBatch();
            }

            JsonNode root = mapper.readTree(inputStream);
            if (!root.isArray()) {
                throw new IllegalStateException("ejercicios.json debe contener un array de ejercicios");
            }

            List<Ejercicio> ejercicios = new ArrayList<>();

            for (JsonNode node : root) {
                String nombre = texto(node, "nombre");
                String slug = texto(node, "slug");

                if (slug == null || slug.isBlank()) {
                    slug = generarSlug(nombre);
                }

                if (nombre == null || nombre.isBlank() || slug == null || slug.isBlank()) {
                    continue;
                }

                Ejercicio ejercicio = reemplazarCatalogo
                        ? new Ejercicio()
                        : ejercicioDAO.findBySlug(slug).orElseGet(Ejercicio::new);

                ejercicio.setSlug(slug);
                ejercicio.setApiId(texto(node, "apiId"));
                ejercicio.setNombre(nombre);
                ejercicio.setNombreTraducido(valorOTexto(node, "nombreTraducido", nombre));
                ejercicio.setGrupoMuscular(valorOTexto(node, "grupoMuscular", "General"));
                ejercicio.setSubgrupoMuscular(texto(node, "subgrupoMuscular"));
                ejercicio.setEquipamiento(valorOTexto(node, "equipamiento", "Sin equipamiento"));
                ejercicio.setParteCuerpo(texto(node, "parteCuerpo"));
                ejercicio.setImagenUrl(primerTexto(node, "imagenUrl", "imagenPrincipal"));
                ejercicio.setImagenPaso1(texto(node, "imagenPaso1"));
                ejercicio.setImagenPaso2(texto(node, "imagenPaso2"));
                ejercicio.setImagenPaso3(texto(node, "imagenPaso3"));
                ejercicio.setVideoUrl(texto(node, "videoUrl"));
                ejercicio.setNivel(texto(node, "nivel"));
                ejercicio.setDificultad(primerTexto(node, "dificultad", "nivel"));
                ejercicio.setTipoMovimiento(texto(node, "tipoMovimiento"));
                ejercicio.setDescripcionCorta(texto(node, "descripcionCorta"));
                ejercicio.setInstrucciones(textoListaOTexto(node, "instrucciones"));
                ejercicio.setConsejosTecnicos(textoListaOTexto(node, "consejosTecnicos"));
                ejercicio.setErroresComunes(textoListaOTexto(node, "erroresComunes"));
                ejercicio.setTieneAnimacion(booleano(node, "tieneAnimacion"));
                ejercicio.setTipoVisual(texto(node, "tipoVisual"));
                ejercicio.setOrigen(valorOTexto(node, "origen", "PROPIO"));
                ejercicio.setActivo(booleanoConDefault(node, "activo", true));

                ejercicios.add(ejercicio);
            }

            return ejercicioDAO.saveAll(ejercicios);
        } catch (Exception e) {
            throw new IllegalStateException("Error importando ejercicios desde JSON: " + e.getMessage(), e);
        }
    }

    private String texto(JsonNode node, String campo) {
        JsonNode valor = node.get(campo);
        if (valor == null || valor.isNull()) {
            return null;
        }
        if (valor.isTextual()) {
            String texto = valor.asText().trim();
            return texto.isBlank() ? null : texto;
        }
        return valor.toString();
    }

    private String valorOTexto(JsonNode node, String campo, String valorPorDefecto) {
        String valor = texto(node, campo);
        return valor == null || valor.isBlank() ? valorPorDefecto : valor;
    }

    private String primerTexto(JsonNode node, String primerCampo, String segundoCampo) {
        String valor = texto(node, primerCampo);
        return valor == null || valor.isBlank() ? texto(node, segundoCampo) : valor;
    }

    private String textoListaOTexto(JsonNode node, String campo) {
        JsonNode valor = node.get(campo);
        if (valor == null || valor.isNull()) {
            return null;
        }
        if (!valor.isArray()) {
            return texto(node, campo);
        }

        List<String> textos = new ArrayList<>();
        for (JsonNode item : valor) {
            if (item != null && item.isTextual() && !item.asText().isBlank()) {
                textos.add(item.asText().trim());
            }
        }
        return textos.isEmpty() ? null : String.join("\n", textos);
    }

    private Boolean booleano(JsonNode node, String campo) {
        JsonNode valor = node.get(campo);
        return valor != null && !valor.isNull() ? valor.asBoolean() : null;
    }

    private Boolean booleanoConDefault(JsonNode node, String campo, boolean valorPorDefecto) {
        Boolean valor = booleano(node, campo);
        return valor == null ? valorPorDefecto : valor;
    }

    private String generarSlug(String valor) {
        if (valor == null || valor.isBlank()) {
            return null;
        }

        String normalizado = Normalizer.normalize(valor, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");

        return normalizado.isBlank() ? null : normalizado;
    }
}
