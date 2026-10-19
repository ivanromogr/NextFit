package com.tuap.backend.servicios.storage;

import java.io.InputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import com.cloudinary.Cloudinary;
import com.tuap.backend.config.UploadProperties;

/** Original images stay authenticated at the provider. Only our authorized API serves bytes. */
@Component
@ConditionalOnProperty(name = "upload.provider", havingValue = "cloudinary")
public class CloudinaryFileStorage {
    private static final Pattern KEY = Pattern.compile("cld_[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\\.(jpg|png|webp)");
    private static final String FOLDER = "nextfit/private-uploads/";
    private final Cloudinary cloudinary;
    @FunctionalInterface interface ConnectionFactory { HttpURLConnection open(URI uri) throws IOException; }
    private final ConnectionFactory connections;
    private final long maximumBytes;

    @Autowired
    public CloudinaryFileStorage(@Value("${cloudinary.cloud-name:}") String cloudName,
            @Value("${cloudinary.api-key:}") String apiKey,
            @Value("${cloudinary.api-secret:}") String apiSecret, UploadProperties properties) {
        this(configure(cloudName, apiKey, apiSecret), uri -> (HttpURLConnection) uri.toURL().openConnection(),
                Math.max(properties.getProfileImageMaxBytes(), properties.getChatAttachmentMaxBytes()));
    }

    CloudinaryFileStorage(Cloudinary cloudinary, ConnectionFactory connections, long maximumBytes) {
        this.cloudinary = cloudinary;
        this.connections = connections;
        this.maximumBytes = maximumBytes;
    }

    private static Cloudinary configure(String name, String key, String secret) {
        if (name.isBlank() || key.isBlank() || secret.isBlank()) {
            throw new IllegalStateException("El almacenamiento Cloudinary requiere configuración completa");
        }
        return new Cloudinary(Map.of("cloud_name", name, "api_key", key, "api_secret", secret, "secure", true));
    }

    public static boolean isRemoteKey(String key) { return key != null && key.startsWith("cld_"); }

    private static String publicId(String key) {
        if (key == null || !KEY.matcher(key).matches()) throw new InvalidFileException("Storage key inválida");
        return FOLDER + key.substring(4, key.lastIndexOf('.'));
    }

    public void store(String key, byte[] content) {
        String id = publicId(key);
        try {
            Map<?, ?> result = cloudinary.uploader().upload(content, Map.of("public_id", id,
                    "resource_type", "image", "type", "authenticated", "overwrite", false,
                    "unique_filename", false, "timeout", 30000));
            if (!id.equals(result.get("public_id")) || !"authenticated".equals(result.get("type"))) {
                throw new StorageUnavailableException();
            }
        } catch (Exception exception) {
            throw new StorageUnavailableException();
        }
    }

    public Resource load(String key) {
        String id = publicId(key);
        HttpURLConnection connection = null;
        try {
            String url = cloudinary.privateDownload(id, key.substring(key.lastIndexOf('.') + 1),
                    Map.of("resource_type", "image", "type", "authenticated", "attachment", false,
                            "expires_at", Instant.now().plusSeconds(60).getEpochSecond()));
            URI uri = URI.create(url);
            // Do not follow provider redirects or arbitrary URLs, even on a malformed configuration.
            if (!"https".equals(uri.getScheme()) || !"api.cloudinary.com".equals(uri.getHost())
                    || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)) {
                throw new StorageUnavailableException();
            }
            connection = connections.open(uri);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);
            connection.setRequestMethod("GET");
            int status = connection.getResponseCode();
            if (status == 404) throw new StoredFileNotFoundException("Archivo no encontrado");
            if (status != 200) throw new StorageUnavailableException();
            try (InputStream input = connection.getInputStream()) {
                byte[] content = input.readNBytes(Math.toIntExact(maximumBytes + 1));
                if (content.length == 0 || content.length > maximumBytes) throw new StorageUnavailableException();
                return new ByteArrayResource(content);
            }
        } catch (StoredFileNotFoundException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new StorageUnavailableException();
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    public void delete(String key) {
        String id = publicId(key);
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(id,
                    Map.of("resource_type", "image", "type", "authenticated", "invalidate", true, "timeout", 30000));
            if (!"ok".equals(result.get("result")) && !"not found".equals(result.get("result"))) {
                throw new StorageUnavailableException();
            }
        } catch (Exception exception) {
            throw new StorageUnavailableException();
        }
    }
}
