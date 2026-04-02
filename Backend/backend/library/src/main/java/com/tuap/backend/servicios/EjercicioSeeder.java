package com.tuap.backend.servicios;

import java.io.InputStream;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Ejercicio;
import com.tuap.backend.persistencia.EjercicioDAO;

//@Component
public class EjercicioSeeder implements CommandLineRunner {

    // 🧹 SOLUCIÓN SONARQUBE: Definición de un Logger profesional
    private static final Logger log = LoggerFactory.getLogger(EjercicioSeeder.class);

    // 🧹 SOLUCIÓN SONARQUBE: Campo final para inyección por constructor
    private final EjercicioDAO ejercicioDAO;

    public EjercicioSeeder(EjercicioDAO ejercicioDAO) {
        this.ejercicioDAO = ejercicioDAO;
    }

    @Override
    public void run(String... args) {
        if (ejercicioDAO.count() == 0) {
            log.info("Base de datos vacía. Cargando ejercicios desde JSON...");
            cargarDatosDesdeJson();
        }
    }

    private void cargarDatosDesdeJson() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            // 🛡️ Nota: Asegúrate de que el archivo esté en src/main/resources/ejercicios.json
            InputStream inputStream = getClass().getResourceAsStream("/ejercicios.json");
            
            if (inputStream != null) {
                List<Ejercicio> ejercicios = mapper.readValue(inputStream, new TypeReference<List<Ejercicio>>(){});
                ejercicioDAO.saveAll(ejercicios);
                log.info("¡Catálogo cargado! {} ejercicios guardados correctamente.", ejercicios.size());
            } else {
                log.warn("No se pudo encontrar el archivo ejercicios.json en el classpath.");
            }
        } catch (Exception e) {
            log.error("Error crítico al procesar el JSON de ejercicios: {}", e.getMessage(), e);
        }
    }
}