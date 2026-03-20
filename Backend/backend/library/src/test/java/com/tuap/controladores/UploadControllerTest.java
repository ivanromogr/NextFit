package com.tuap.controladores;


import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockMultipartFile;

import com.tuap.backend.controladores.UploadController;

class UploadControllerTest {

    private UploadController uploadController;

    @TempDir
    Path tempDir; 

    @BeforeEach
    void setUp() {
        
        uploadController = new UploadController(tempDir.toString() + File.separator);
    }

    @Test
    void uploadFile_ArchivoValido_GuardaYDevuelveUrl() {
        MockMultipartFile fileFalso = new MockMultipartFile(
            "file", 
            "foto_perfil.jpg", 
            "image/jpeg", 
            "bytes_de_una_imagen_falsa".getBytes()
        );

        ResponseEntity<Map<String, String>> respuesta = uploadController.uploadFile(fileFalso);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        
        String urlDevuelta = respuesta.getBody().get("url");
        assertTrue(urlDevuelta.contains("/api/upload/files/"));
        assertTrue(urlDevuelta.contains("foto_perfil.jpg"));
    }

    @Test
    void serveFile_ArchivoExiste_DevuelveElArchivo() throws IOException {
        String nombreArchivo = "test_imagen.png";
        Path archivoPrueba = tempDir.resolve(nombreArchivo);
        Files.write(archivoPrueba, "datos_falsos".getBytes());

        ResponseEntity<Resource> respuesta = uploadController.serveFile(nombreArchivo);

        assertEquals(HttpStatus.OK, respuesta.getStatusCode());
        assertNotNull(respuesta.getBody());
        assertEquals(nombreArchivo, respuesta.getBody().getFilename());
    }

    @Test
    void serveFile_ArchivoNoExiste_Devuelve404() {
        ResponseEntity<Resource> respuesta = uploadController.serveFile("archivo_fantasma.jpg");
        assertEquals(HttpStatus.NOT_FOUND, respuesta.getStatusCode());
    }
}