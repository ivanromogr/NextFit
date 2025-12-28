package com.tuap.backend.servicios;

import java.io.InputStream;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

@Component
public class EjercicioSeeder implements CommandLineRunner {

    @Autowired private EjercicioDAO ejercicioDAO;

    @Override
    public void run(String... args) throws Exception {
        if (ejercicioDAO.count() == 0) {
            System.out.println("📂 Base de datos vacía. Cargando ejercicios desde JSON...");
            try {
                ObjectMapper mapper = new ObjectMapper();
                InputStream inputStream = TypeReference.class.getResourceAsStream("/ejercicios.json");
                
                if(inputStream != null) {
                    List<Ejercicio> ejercicios = mapper.readValue(inputStream, new TypeReference<List<Ejercicio>>(){});
                    ejercicioDAO.saveAll(ejercicios);
                    System.out.println("✅ ¡Catálogo cargado! " + ejercicios.size() + " ejercicios.");
                }
            } catch (Exception e) {
                System.out.println("❌ Error JSON: " + e.getMessage());
            }
        }
    }
}