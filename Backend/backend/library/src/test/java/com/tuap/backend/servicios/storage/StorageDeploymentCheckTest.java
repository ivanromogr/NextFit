package com.tuap.backend.servicios.storage;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.ByteArrayResource;

class StorageDeploymentCheckTest {
    private static final String ID = "11111111-1111-4111-8111-111111111111";
    private static final String KEY = "cld_probe_" + ID + ".png";
    private final CloudinaryFileStorage storage = mock(CloudinaryFileStorage.class);

    @Test void absentByDefault() {
        new ApplicationContextRunner().withUserConfiguration(StorageDeploymentCheck.class)
                .withBean(CloudinaryFileStorage.class, () -> storage)
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertTrue(context.getBeansOfType(StorageDeploymentCheck.class).isEmpty());
                    verifyNoInteractions(storage);
                });
    }
    @Test void independentRestartReadsPersistedBytesWithoutRewritingAndThenDeletes() throws Exception {
        AtomicReference<byte[]> persisted = new AtomicReference<>();
        doAnswer(invocation -> { persisted.set(invocation.getArgument(1)); return null; })
                .when(storage).store(eq(KEY), any());
        when(storage.load(KEY)).thenAnswer(invocation -> new ByteArrayResource(persisted.get()));
        doAnswer(invocation -> { persisted.set(null); return null; }).when(storage).delete(KEY);
        var first = new StorageDeploymentCheck(storage, "create", ID);
        assertEquals(Status.DOWN, first.health().getStatus());
        first.run(null);
        assertEquals(Status.UP, first.health().getStatus());
        assertNotNull(persisted.get());
        var restart = new StorageDeploymentCheck(storage, "verify-and-delete", ID);
        assertEquals(Status.DOWN, restart.health().getStatus());
        restart.run(null);
        assertEquals(Status.UP, restart.health().getStatus());
        assertNull(persisted.get());
        verify(storage, times(1)).store(eq(KEY), any());
        verify(storage, times(2)).load(KEY);
        verify(storage, times(2)).verifyUnsignedAccessDenied(KEY);
        verify(storage, times(1)).delete(KEY);
    }
    @Test void missingRemoteBytesKeepHealthDownAndDoNotRecreateTheFixture() {
        when(storage.load(KEY)).thenThrow(new StoredFileNotFoundException("fixture missing"));
        var restart = new StorageDeploymentCheck(storage, "verify-and-delete", ID);
        var error = assertThrows(IllegalStateException.class, () -> restart.run(null));
        assertEquals("STORAGE_DEPLOYMENT_CHECK_FAILED stage=DOWNLOAD", error.getMessage());
        assertNull(error.getCause());
        assertEquals(Status.DOWN, restart.health().getStatus());
        verify(storage, never()).store(anyString(), any());
    }
    @Test void brokenUploadsCannotPassAndCreationIsCleanedUp() {
        doThrow(new StorageUnavailableException()).when(storage).store(eq(KEY), any());
        var check = new StorageDeploymentCheck(storage, "create", ID);
        var error = assertThrows(IllegalStateException.class, () -> check.run(null));
        assertEquals("STORAGE_DEPLOYMENT_CHECK_FAILED stage=UPLOAD", error.getMessage());
        assertEquals(Status.DOWN, check.health().getStatus());
        verify(storage).delete(KEY);
    }
    @Test void unsignedAccessFailureKeepsHealthDownAndCleansUpTheProbe() {
        AtomicReference<byte[]> bytes = new AtomicReference<>();
        doAnswer(invocation -> { bytes.set(invocation.getArgument(1)); return null; }).when(storage).store(eq(KEY), any());
        when(storage.load(KEY)).thenAnswer(invocation -> new ByteArrayResource(bytes.get()));
        doThrow(new StorageUnavailableException()).when(storage).verifyUnsignedAccessDenied(KEY);
        var check = new StorageDeploymentCheck(storage, "create", ID);
        var error = assertThrows(IllegalStateException.class, () -> check.run(null));
        assertEquals("STORAGE_DEPLOYMENT_CHECK_FAILED stage=UNSIGNED_ACCESS", error.getMessage());
        assertEquals(Status.DOWN, check.health().getStatus());
        verify(storage).delete(KEY);
    }
    @Test void invalidConfigurationNeverTouchesAnyAsset() {
        assertThrows(IllegalArgumentException.class, () -> new StorageDeploymentCheck(storage, "delete-all", ID));
        assertThrows(IllegalArgumentException.class, () -> new StorageDeploymentCheck(storage, "create", "../user-image"));
        verifyNoInteractions(storage);
    }
}
