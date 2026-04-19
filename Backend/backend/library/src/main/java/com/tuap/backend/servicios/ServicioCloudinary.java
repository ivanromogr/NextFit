package com.tuap.backend.servicios;


import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@Service
public class ServicioCloudinary {

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    public String subirGifDesdeUrl(String gifUrl, String publicId) {
        try {
            if (cloudName == null || cloudName.isBlank()
                    || apiKey == null || apiKey.isBlank()
                    || apiSecret == null || apiSecret.isBlank()) {
                throw new IllegalStateException("Cloudinary no está configurado.");
            }

            Cloudinary cloudinary = new Cloudinary(ObjectUtils.asMap(
                    "cloud_name", cloudName,
                    "api_key", apiKey,
                    "api_secret", apiSecret,
                    "secure", true
            ));

            byte[] archivoBytes = descargarArchivo(gifUrl);

            Map<String, Object> options = new HashMap<>();
            options.put("public_id", "ejercicios/" + publicId);
            options.put("resource_type", "image");
            options.put("overwrite", true);

            Map<?, ?> resultado = cloudinary.uploader().upload(archivoBytes, options);

            Object secureUrl = resultado.get("secure_url");
            if (secureUrl == null) {
                throw new RuntimeException("Cloudinary no devolvió secure_url.");
            }

            return secureUrl.toString();

        } catch (Exception e) {
            throw new RuntimeException("Error subiendo GIF a Cloudinary", e);
        }
    }

    private byte[] descargarArchivo(String archivoUrl) throws Exception {
        URL url = new URL(archivoUrl);

        try (InputStream inputStream = url.openStream();
             ByteArrayOutputStream buffer = new ByteArrayOutputStream()) {

            byte[] data = new byte[8192];
            int nRead;

            while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }

            buffer.flush();
            return buffer.toByteArray();
        }
    }
}
