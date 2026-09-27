package com.tuap.backend.servicios;

import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.UploadedFileDAO;

@Service
public class ProfileImageService {
    private final ClienteDAO clientes;
    private final EntrenadorDAO entrenadores;
    private final UploadedFileDAO uploads;
    private final FileStorageService storage;

    public ProfileImageService(ClienteDAO clientes, EntrenadorDAO entrenadores, UploadedFileDAO uploads,
            FileStorageService storage) {
        this.clientes = clientes;
        this.entrenadores = entrenadores;
        this.uploads = uploads;
        this.storage = storage;
    }

    @Transactional
    public String assign(AuthenticatedUser user, UUID fileId) {
        UploadedFile file = uploads.findById(fileId).filter(candidate -> candidate.getOwnerId().equals(user.userId())
                && candidate.getOwnerRole() == user.role() && candidate.getPurpose() == UploadPurpose.PROFILE_IMAGE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Foto no autorizada"));
        String previous = replaceProfileImage(user, url(fileId));
        deleteManagedImage(previous, fileId);
        return url(fileId);
    }

    @Transactional
    public void remove(AuthenticatedUser user) {
        String previous = replaceProfileImage(user, null);
        deleteManagedImage(previous, null);
    }

    /** Used by account deletion before anonymisation; legacy values are only de-referenced. */
    @Transactional
    public void removeForAccountDeletion(AuthenticatedUser user) {
        String previous = replaceProfileImageForDeletion(user);
        deleteManagedImage(previous, null);
    }

    private String replaceProfileImage(AuthenticatedUser user, String imageUrl) {
        if (user.role() == Role.CLIENTE) {
            Cliente cliente = clientes.findById(user.userId()).filter(Cliente::isActive)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            String previous = cliente.getFotoPerfil();
            cliente.setFotoPerfil(imageUrl);
            clientes.save(cliente);
            return previous;
        }
        Entrenador entrenador = entrenadores.findById(user.userId()).filter(Entrenador::isActive)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String previous = entrenador.getFotoPerfil();
        entrenador.setFotoPerfil(imageUrl);
        entrenadores.save(entrenador);
        return previous;
    }

    private String replaceProfileImageForDeletion(AuthenticatedUser user) {
        if (user.role() == Role.CLIENTE) {
            Cliente cliente = clientes.findById(user.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            String previous = cliente.getFotoPerfil();
            cliente.setFotoPerfil(null);
            clientes.save(cliente);
            return previous;
        }
        Entrenador entrenador = entrenadores.findById(user.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String previous = entrenador.getFotoPerfil();
        entrenador.setFotoPerfil(null);
        entrenadores.save(entrenador);
        return previous;
    }

    private void deleteManagedImage(String value, UUID replacementId) {
        Optional<UUID> id = idFromUrl(value);
        if (id.isEmpty() || id.get().equals(replacementId)) return;
        uploads.findById(id.get()).filter(file -> file.getPurpose() == UploadPurpose.PROFILE_IMAGE).ifPresent(file -> {
            storage.delete(file.getStorageKey());
            uploads.delete(file);
        });
    }

    private Optional<UUID> idFromUrl(String value) {
        if (value == null || !value.startsWith("/api/upload/files/")) return Optional.empty();
        try { return Optional.of(UUID.fromString(value.substring("/api/upload/files/".length()))); }
        catch (IllegalArgumentException exception) { return Optional.empty(); }
    }

    private String url(UUID id) { return "/api/upload/files/" + id; }
}
