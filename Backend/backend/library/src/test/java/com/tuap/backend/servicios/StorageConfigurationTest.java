package com.tuap.backend.servicios;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.autoconfigure.context.ConfigurationPropertiesAutoConfiguration;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import com.tuap.backend.config.UploadProperties;
import com.tuap.backend.servicios.storage.CloudinaryFileStorage;
import java.nio.file.Path;

class StorageConfigurationTest {
    @TempDir Path directory;
    private ApplicationContextRunner context() {
        return new ApplicationContextRunner()
                .withConfiguration(AutoConfigurations.of(ConfigurationPropertiesAutoConfiguration.class))
                .withUserConfiguration(UploadProperties.class, FileStorageService.class, CloudinaryFileStorage.class)
                .withPropertyValues("upload.storage-directory=" + directory);
    }
    @Test void cloudinaryConfigurationCreatesTheRemoteBackendWithoutMakingNetworkCalls() {
        context().withPropertyValues("upload.provider=cloudinary", "cloudinary.cloud-name=fixture",
                "cloudinary.api-key=fixture", "cloudinary.api-secret=fixture")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertNotNull(context.getBean(CloudinaryFileStorage.class));
                    assertNotNull(context.getBean(FileStorageService.class));
                    assertEquals("cloudinary", context.getBean(UploadProperties.class).getProvider());
                });
    }
    @Test void missingCloudinaryCredentialsFailStartupInsteadOfFallingBackToTemporaryDisk() {
        context().withPropertyValues("upload.provider=cloudinary")
                .run(context -> assertNotNull(context.getStartupFailure()));
    }
    @Test void localDevelopmentDoesNotRequireRemoteCredentials() {
        context().run(context -> {
            assertNull(context.getStartupFailure());
            assertNotNull(context.getBean(FileStorageService.class));
            assertTrue(context.getBeansOfType(CloudinaryFileStorage.class).isEmpty());
        });
    }
}
