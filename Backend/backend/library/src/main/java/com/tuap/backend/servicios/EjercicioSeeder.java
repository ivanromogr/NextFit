package com.tuap.backend.servicios;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

@Component
public class EjercicioSeeder implements CommandLineRunner {

    @Autowired
    private EjercicioDAO ejercicioDAO;

    // TU CLAVE DE RAPIDAPI (Asegúrate de que es válida)
    private String rapidApiKey = "4b7792241dmsh72970281dbcb35ep1231a1jsn9a024c6b8292"; 

    @Override
    public void run(String... args) throws Exception {
        // Ejecutar solo si la base de datos está vacía para no duplicar
        if (ejercicioDAO.count() == 0) {
            System.out.println("⚡ Base de datos vacía. Iniciando HACK de descarga...");
            importarEjerciciosHack();
        } else {
            System.out.println("✅ La librería ya tiene datos (" + ejercicioDAO.count() + " ejercicios).");
        }
    }

    private void importarEjerciciosHack() {
        // Pedimos TODOS los ejercicios (1300+)
        // Si falla por timeout, baja el limit a 100 o 200 para probar.
        String url = "https://exercisedb.p.rapidapi.com/exercises?limit=1300"; 

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-RapidAPI-Key", rapidApiKey);
        headers.set("X-RapidAPI-Host", "exercisedb.p.rapidapi.com");

        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            System.out.println("📡 Contactando con ExerciseDB...");
            ResponseEntity<EjercicioDTO[]> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, EjercicioDTO[].class);

            EjercicioDTO[] ejerciciosExternos = response.getBody();

            if (ejerciciosExternos != null) {
                System.out.println("📦 Recibidos " + ejerciciosExternos.length + " ejercicios. Procesando GIFs...");
                
                int contador = 0;
                for (EjercicioDTO dto : ejerciciosExternos) {
                    
                    Ejercicio ejercicio = new Ejercicio();
                    ejercicio.setApiId(dto.id); // Ej: "0001"
                    ejercicio.setNombre(dto.name);
                    ejercicio.setGrupoMuscular(dto.target);
                    ejercicio.setParteCuerpo(dto.bodyPart);
                    ejercicio.setEquipamiento(dto.equipment);
                    
                    // 👇 EL HACK MAESTRO: Construimos la URL nosotros mismos 👇
                    // No importa si la API dice null, nosotros sabemos dónde están.
                    String urlHack = "https://d205bpvrqc9yn1.cloudfront.net/" + dto.id + ".gif";
                    ejercicio.setGifUrl(urlHack);
                    // --------------------------------------------------------

                    if (dto.instructions != null) {
                        ejercicio.setInstrucciones(String.join("\n", dto.instructions));
                    }

                    ejercicioDAO.save(ejercicio);
                    contador++;
                    
                    if (contador % 100 == 0) System.out.print("."); // Barra de progreso simple
                }
                System.out.println("\n🚀 ¡ÉXITO! " + contador + " ejercicios importados con GIFs generados.");
            }

        } catch (Exception e) {
            System.err.println("❌ ERROR: " + e.getMessage());
            System.err.println("👉 Consejo: Si es error 429, crea una cuenta nueva en RapidAPI y cambia la clave.");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static class EjercicioDTO {
        @JsonProperty("id") public String id;
        @JsonProperty("name") public String name;
        @JsonProperty("target") public String target;
        @JsonProperty("bodyPart") public String bodyPart;
        @JsonProperty("equipment") public String equipment;
        @JsonProperty("gifUrl") public String gifUrl; 
        @JsonProperty("instructions") public List<String> instructions;
    }
}