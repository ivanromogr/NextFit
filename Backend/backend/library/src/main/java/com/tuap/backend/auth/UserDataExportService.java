package com.tuap.backend.auth;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.MensajeDAO;
import com.tuap.backend.persistencia.ResenaDAO;
import com.tuap.backend.persistencia.UploadedFileDAO;
import com.tuap.backend.persistencia.UserConsentDAO;

@Service
public class UserDataExportService {
    private final ClienteDAO clientes;
    private final EntrenadorDAO entrenadores;
    private final MensajeDAO mensajes;
    private final ResenaDAO resenas;
    private final UploadedFileDAO uploads;
    @org.springframework.beans.factory.annotation.Autowired(required = false) private UserConsentDAO consents;

    public UserDataExportService(ClienteDAO clientes, EntrenadorDAO entrenadores, MensajeDAO mensajes,
            ResenaDAO resenas, UploadedFileDAO uploads) {
        this.clientes = clientes;
        this.entrenadores = entrenadores;
        this.mensajes = mensajes;
        this.resenas = resenas;
        this.uploads = uploads;
    }

    public UserDataExportResponse exportFor(AuthenticatedUser principal) {
        Map<String, Object> profile;
        Map<String, Object> relationships;
        List<?> reviews;
        if (principal.role() == Role.CLIENTE) {
            Cliente cliente = clientes.findById(principal.userId()).filter(Cliente::isActive)
                    .orElseThrow(InvalidRefreshTokenException::new);
            profile = clienteProfile(cliente);
            relationships = cliente.getEntrenador() == null ? Map.of()
                    : Map.of("entrenador", personReference(cliente.getEntrenador()));
            reviews = resenas.findAll().stream().filter(review -> review.getCliente() != null
                    && principal.userId().equals(review.getCliente().getId())).map(this::review).toList();
        } else {
            Entrenador entrenador = entrenadores.findById(principal.userId()).filter(Entrenador::isActive)
                    .orElseThrow(InvalidRefreshTokenException::new);
            profile = entrenadorProfile(entrenador);
            relationships = Map.of("clientes", clientes.findByEntrenadorId(principal.userId()).stream()
                    .map(this::personReference).toList());
            reviews = resenas.findByEntrenadorIdOrderByFechaDesc(principal.userId()).stream().map(this::review).toList();
        }
        List<?> messageExport = mensajes.findContactosIds(principal.userId()).stream()
                .flatMap(contact -> mensajes.findChatHistory(principal.userId(), contact).stream())
                .map(message -> Map.of("id", message.getId(), "timestamp", message.getFechaHora(), "content",
                        Optional.ofNullable(message.getContenido()).orElse(""), "senderId", message.getRemitenteId(),
                        "recipientId", message.getDestinatarioId(), "attachmentId",
                        message.getAttachmentId() == null ? "" : message.getAttachmentId().toString()))
                .toList();
        List<?> uploadExport = uploads.findByOwnerIdAndOwnerRole(principal.userId(), principal.role()).stream()
                .map(upload -> Map.of("id", upload.getId(), "purpose", upload.getPurpose(), "visibility", upload.getVisibility(),
                        "originalFilename", upload.getOriginalFilename(), "createdAt", upload.getCreatedAt()))
                .toList();
        List<?> consentExport = consents == null ? List.of() : consents.findByUserIdAndRole(principal.userId(), principal.role()).stream()
                .map(c -> Map.of("type", c.getType().name(), "version", c.getVersion(), "accepted", c.isAccepted(), "acceptedAt", c.getAcceptedAt() == null ? "" : c.getAcceptedAt().toString(), "withdrawnAt", c.getWithdrawnAt() == null ? "" : c.getWithdrawnAt().toString())).toList();
        return new UserDataExportResponse(Instant.now(), principal.role().name(), profile, relationships, messageExport,
                reviews, uploadExport, consentExport);
    }

    private Map<String, Object> clienteProfile(Cliente cliente) {
        Map<String, Object> profile = personReference(cliente);
        profile.put("email", cliente.getEmail());
        profile.put("peso", cliente.getPeso());
        profile.put("altura", cliente.getAltura());
        profile.put("edad", cliente.getEdad());
        profile.put("genero", cliente.getGenero());
        profile.put("objetivo", cliente.getObjetivo());
        profile.put("fotoPerfil", cliente.getFotoPerfil());
        profile.put("active", cliente.isActive());
        profile.put("deletedAt", cliente.getDeletedAt());
        return profile;
    }

    private Map<String, Object> entrenadorProfile(Entrenador entrenador) {
        Map<String, Object> profile = personReference(entrenador);
        profile.put("email", entrenador.getEmail());
        profile.put("especialidad", entrenador.getEspecialidad());
        profile.put("edad", entrenador.getEdad());
        profile.put("genero", entrenador.getGenero());
        profile.put("aniosExperiencia", entrenador.getAniosExperiencia());
        profile.put("formacion", entrenador.getFormacion());
        profile.put("descripcionPerfil", entrenador.getDescripcionPerfil());
        profile.put("modalidadTrabajo", entrenador.getModalidadTrabajo());
        profile.put("biografia", entrenador.getBiografia());
        profile.put("fotoPerfil", entrenador.getFotoPerfil());
        profile.put("tituloAcademico", entrenador.getTituloAcademico());
        profile.put("titulacion", entrenador.getTitulacion());
        profile.put("tarifaMensual", entrenador.getTarifaMensual());
        profile.put("perfilPublico", entrenador.isPerfilPublico());
        profile.put("active", entrenador.isActive());
        profile.put("deletedAt", entrenador.getDeletedAt());
        return profile;
    }

    private Map<String, Object> personReference(Cliente cliente) {
        return personReference(cliente.getId(), cliente.getNombre(), cliente.getApellido());
    }

    private Map<String, Object> personReference(Entrenador entrenador) {
        return personReference(entrenador.getId(), entrenador.getNombre(), entrenador.getApellido());
    }

    private Map<String, Object> personReference(UUID id, String nombre, String apellido) {
        Map<String, Object> reference = new LinkedHashMap<>();
        reference.put("id", id);
        reference.put("nombre", nombre);
        reference.put("apellido", apellido);
        return reference;
    }

    private Map<String, Object> review(Resena review) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", review.getId());
        result.put("stars", review.getEstrellas());
        result.put("comment", review.getComentario());
        result.put("createdAt", review.getFecha());
        return result;
    }
}
