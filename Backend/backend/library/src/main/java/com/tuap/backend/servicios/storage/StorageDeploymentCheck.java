package com.tuap.backend.servicios.storage;

import java.util.Arrays;
import java.util.Base64;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Opt-in runtime check, never exposed as an API and never touches user metadata. */
@Component
@ConditionalOnProperty(name = "app.storage.deployment-check.enabled", havingValue = "true")
public class StorageDeploymentCheck implements ApplicationRunner, HealthIndicator {
    private static final Logger log = LoggerFactory.getLogger(StorageDeploymentCheck.class);
    private static final byte[] PNG = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGBgAAAABQABpfZFQAAAAABJRU5ErkJggg==");
    private final CloudinaryFileStorage storage;
    private final String phase;
    private final String key;
    private volatile boolean ready;

    public StorageDeploymentCheck(CloudinaryFileStorage storage,
            @Value("${app.storage.deployment-check.phase:}") String phase,
            @Value("${app.storage.deployment-check.id:}") String id) {
        if (!"create".equals(phase) && !"verify-and-delete".equals(phase)) {
            throw new IllegalArgumentException("Invalid storage deployment check phase");
        }
        this.storage = storage;
        this.phase = phase;
        this.key = "cld_probe_" + UUID.fromString(id).toString() + ".png";
    }

    @Override public void run(ApplicationArguments arguments) {
        String stage = "UPLOAD";
        try {
            if ("create".equals(phase)) storage.store(key, PNG);
            stage = "DOWNLOAD";
            if (!Arrays.equals(PNG, storage.load(key).getContentAsByteArray())) {
                throw new StorageUnavailableException();
            }
            stage = "UNSIGNED_ACCESS";
            storage.verifyUnsignedAccessDenied(key);
            if ("verify-and-delete".equals(phase)) {
                stage = "DELETE";
                storage.delete(key);
            }
            ready = true;
            log.info("STORAGE_DEPLOYMENT_CHECK_COMPLETE phase={}", phase);
        } catch (Exception exception) {
            // Log only the stage, never a signed provider URL or credential.
            if ("create".equals(phase)) {
                try { storage.delete(key); } catch (RuntimeException cleanupFailure) {
                    log.warn("STORAGE_DEPLOYMENT_CHECK cleanup required");
                }
            }
            throw new IllegalStateException("STORAGE_DEPLOYMENT_CHECK_FAILED stage=" + stage);
        }
    }

    @Override public Health health() { return ready ? Health.up().build() : Health.down().build(); }
}
