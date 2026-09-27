package com.tuap.backend.servicios;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.UploadedFileDAO;

class ProfileImageServiceTest {
    @Test void rechazaFotoDeOtroPropietario() {
        UUID owner = UUID.randomUUID(); UploadedFile file = mock(UploadedFile.class);
        when(file.getOwnerId()).thenReturn(UUID.randomUUID()); when(file.getOwnerRole()).thenReturn(Role.CLIENTE);
        when(file.getPurpose()).thenReturn(UploadPurpose.PROFILE_IMAGE);
        UploadedFileDAO uploads = mock(UploadedFileDAO.class); when(uploads.findById(any())).thenReturn(Optional.of(file));
        assertThrows(ResponseStatusException.class, () -> service(mock(ClienteDAO.class), uploads).assign(user(owner), UUID.randomUUID()));
    }
    @Test void asignaPropiaYEliminaLaAnteriorGestionada() {
        UUID owner = UUID.randomUUID(), oldId = UUID.randomUUID(), newId = UUID.randomUUID();
        Cliente client = new Cliente(); client.setId(owner); client.setActive(true); client.setFotoPerfil("/api/upload/files/" + oldId);
        UploadedFile next = file(owner, "new-key"); UploadedFile old = file(owner, "old-key");
        ClienteDAO clients = mock(ClienteDAO.class); when(clients.findById(owner)).thenReturn(Optional.of(client));
        UploadedFileDAO uploads = mock(UploadedFileDAO.class); when(uploads.findById(newId)).thenReturn(Optional.of(next)); when(uploads.findById(oldId)).thenReturn(Optional.of(old));
        FileStorageService storage = mock(FileStorageService.class);
        String result = new ProfileImageService(clients, mock(EntrenadorDAO.class), uploads, storage).assign(user(owner), newId);
        assertEquals("/api/upload/files/" + newId, result); assertEquals(result, client.getFotoPerfil());
        verify(storage).delete("old-key"); verify(uploads).delete(old);
    }
    @Test void eliminaFotoYMetadataGestionadas() {
        UUID owner = UUID.randomUUID(), imageId = UUID.randomUUID(); Cliente client = new Cliente(); client.setId(owner); client.setActive(true); client.setFotoPerfil("/api/upload/files/" + imageId);
        ClienteDAO clients = mock(ClienteDAO.class); when(clients.findById(owner)).thenReturn(Optional.of(client)); UploadedFile old = file(owner, "old-key"); UploadedFileDAO uploads = mock(UploadedFileDAO.class); when(uploads.findById(imageId)).thenReturn(Optional.of(old)); FileStorageService storage = mock(FileStorageService.class);
        new ProfileImageService(clients, mock(EntrenadorDAO.class), uploads, storage).remove(user(owner));
        assertNull(client.getFotoPerfil()); verify(storage).delete("old-key"); verify(uploads).delete(old);
    }
    private ProfileImageService service(ClienteDAO clients, UploadedFileDAO uploads) { return new ProfileImageService(clients, mock(EntrenadorDAO.class), uploads, mock(FileStorageService.class)); }
    private AuthenticatedUser user(UUID id) { return new AuthenticatedUser(id, "a@test", Role.CLIENTE); }
    private UploadedFile file(UUID owner, String key) { UploadedFile f = mock(UploadedFile.class); when(f.getOwnerId()).thenReturn(owner); when(f.getOwnerRole()).thenReturn(Role.CLIENTE); when(f.getPurpose()).thenReturn(UploadPurpose.PROFILE_IMAGE); when(f.getStorageKey()).thenReturn(key); return f; }
}
