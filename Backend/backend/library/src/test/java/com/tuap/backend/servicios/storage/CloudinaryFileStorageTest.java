package com.tuap.backend.servicios.storage;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import com.cloudinary.Cloudinary;
import com.cloudinary.Uploader;

class CloudinaryFileStorageTest {
    private static final String KEY = "cld_11111111-1111-4111-8111-111111111111.png";
    private static final String ID = "nextfit/private-uploads/11111111-1111-4111-8111-111111111111";
    private final Cloudinary cloudinary = mock(Cloudinary.class);
    private final Uploader uploader = mock(Uploader.class);
    private final CloudinaryFileStorage.ConnectionFactory connections = mock(CloudinaryFileStorage.ConnectionFactory.class);
    private final CloudinaryFileStorage storage = new CloudinaryFileStorage(cloudinary, connections, 16);
    private HttpURLConnection connection;

    @BeforeEach void setUp() { when(cloudinary.uploader()).thenReturn(uploader); }

    @Test void storesOnlyAuthenticatedOriginalWithoutOverwrite() throws Exception {
        byte[] bytes = {1, 2, 3};
        when(uploader.upload(eq(bytes), anyMap())).thenReturn(Map.of("public_id", ID, "type", "authenticated"));
        storage.store(KEY, bytes);
        ArgumentCaptor<Map> options = ArgumentCaptor.forClass(Map.class);
        verify(uploader).upload(eq(bytes), options.capture());
        assertEquals("authenticated", options.getValue().get("type"));
        assertEquals(ID, options.getValue().get("public_id"));
        assertEquals(false, options.getValue().get("overwrite"));
        assertEquals("image", options.getValue().get("resource_type"));
    }

    @Test void readsOriginalThroughShortLivedServerOnlyUrl() throws Exception {
        when(cloudinary.privateDownload(eq(ID), eq("png"), anyMap()))
                .thenReturn("https://api.cloudinary.com/v1_1/fixture/image/download?signature=fixture");
        response(200, new byte[] {4, 5});
        assertArrayEquals(new byte[] {4, 5}, storage.load(KEY).getContentAsByteArray());
        ArgumentCaptor<Map<String, Object>> options = ArgumentCaptor.forClass(Map.class);
        verify(cloudinary).privateDownload(eq(ID), eq("png"), options.capture());
        long expiry = ((Number) options.getValue().get("expires_at")).longValue();
        long now = java.time.Instant.now().getEpochSecond();
        assertTrue(expiry >= now + 55 && expiry <= now + 60);
        assertEquals("authenticated", options.getValue().get("type"));
        verify(connection).setConnectTimeout(10000);
        verify(connection).setReadTimeout(30000);
        verify(connection).setInstanceFollowRedirects(false);
        verify(connection).disconnect();
    }

    @Test void refusesRedirectsOversizedResponsesAndProviderFailures() throws Exception {
        when(cloudinary.privateDownload(eq(ID), eq("png"), anyMap())).thenReturn("https://api.cloudinary.com/download");
        response(302, new byte[] {1});
        assertThrows(StorageUnavailableException.class, () -> storage.load(KEY));
        response(200, new byte[17]);
        assertThrows(StorageUnavailableException.class, () -> storage.load(KEY));
        response(404, new byte[] {1});
        assertThrows(StoredFileNotFoundException.class, () -> storage.load(KEY));
        when(uploader.upload(any(), anyMap())).thenThrow(new IOException("sensitive provider details"));
        var error = assertThrows(StorageUnavailableException.class, () -> storage.store(KEY, new byte[] {1}));
        assertFalse(error.getMessage().contains("sensitive"));
        assertNull(error.getCause());
    }

    @Test void rejectsArbitraryProviderUrlsAndKeysBeforeAnyRequest() throws Exception {
        for (String url : new String[] {"http://api.cloudinary.com/download", "https://evil.test/download",
                "https://api.cloudinary.com:444/download", "https://user@api.cloudinary.com/download"}) {
            when(cloudinary.privateDownload(eq(ID), eq("png"), anyMap())).thenReturn(url);
            assertThrows(StorageUnavailableException.class, () -> storage.load(KEY));
        }
        for (String key : new String[] {"cld_../secret.png", "cld_../../exercise.jpg", "cld_file.svg"}) {
            assertThrows(InvalidFileException.class, () -> storage.delete(key));
            assertThrows(InvalidFileException.class, () -> storage.load(key));
        }
        verifyNoInteractions(connections);
        verifyNoInteractions(uploader);
    }

    @Test void deletionIsScopedAndIdempotent() throws Exception {
        when(uploader.destroy(eq(ID), anyMap())).thenReturn(Map.of("result", "ok"), Map.of("result", "not found"));
        storage.delete(KEY);
        storage.delete(KEY);
        verify(uploader, times(2)).destroy(ID, Map.of("resource_type", "image", "type", "authenticated", "invalidate", true, "timeout", 30000));
    }

    private void response(int status, byte[] bytes) throws Exception {
        connection = mock(HttpURLConnection.class);
        when(connection.getResponseCode()).thenReturn(status);
        when(connection.getInputStream()).thenReturn(new ByteArrayInputStream(bytes));
        when(connections.open(any())).thenReturn(connection);
    }
}
