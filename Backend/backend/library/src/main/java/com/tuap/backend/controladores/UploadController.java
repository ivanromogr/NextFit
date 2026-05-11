package com.tuap.backend.controladores;

import java.io.IOException;
import java.io.UncheckedIOException; 
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
public class UploadController {

    private final Path rootLocation; 

    public UploadController(@Value("${app.upload.dir:uploads/}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
           
            throw new UncheckedIOException("No se pudo crear la carpeta de archivos", e);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }

            String cleanName = StringUtils.cleanPath(originalName);
            Path fileNamePath = Paths.get(cleanName).getFileName();
            if (fileNamePath == null) {
                return ResponseEntity.badRequest().build();
            }

            String finalName = UUID.randomUUID().toString() + "_" + fileNamePath.toString().replace(" ", "_");
            Path destinationFile = this.rootLocation.resolve(finalName).normalize();

            if (!destinationFile.getParent().equals(this.rootLocation)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Files.copy(file.getInputStream(), destinationFile);

            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/upload/files/")
                    .path(finalName)
                    .toUriString();

            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/files/{filename:.+}")
  
    public ResponseEntity<Resource> serveFile(@PathVariable String filename) {
        try {
            Path file = this.rootLocation.resolve(filename).normalize();
            if (!file.getParent().equals(this.rootLocation)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }

            Resource resource = new UrlResource(file.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = Files.probeContentType(file);
                if (contentType == null) {
                    contentType = "application/octet-stream";
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
