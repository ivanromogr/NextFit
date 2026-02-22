package com.tuap.backend.controladores;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/upload")
public class UploadController {

    private final String UPLOAD_DIR = "uploads/";

    public UploadController() {
        // Al arrancar, crea la carpeta 'uploads' si no existe
        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("No se pudo crear la carpeta de archivos");
        }
    }

    // 1. ENDPOINT PARA SUBIR EL ARCHIVO
    @PostMapping
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            // Generamos un nombre único para que no se sobreescriban fotos con el mismo nombre
            String fileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename().replaceAll(" ", "_");
            Path path = Paths.get(UPLOAD_DIR + fileName);
            
            // Guardamos el archivo en el disco duro
            Files.copy(file.getInputStream(), path);

            // Devolvemos la URL pública donde se podrá ver
            Map<String, String> response = new HashMap<>();
            // ⚠️ Asegúrate de que tu backend corre en el puerto 8080
            response.put("url", "http://localhost:8080/api/upload/files/" + fileName); 
            
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // 2. ENDPOINT PARA VER EL ARCHIVO DESDE REACT
    @GetMapping("/files/{filename:.+}")
    @ResponseBody
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) throws MalformedURLException {
        Path file = Paths.get(UPLOAD_DIR).resolve(filename);
        Resource resource = new UrlResource(file.toUri());

        if (resource.exists() || resource.isReadable()) {
            return ResponseEntity.ok().body(resource);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}