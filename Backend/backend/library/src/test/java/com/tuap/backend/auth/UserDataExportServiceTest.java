package com.tuap.backend.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tuap.backend.dominio.entidades.Cliente;
import com.tuap.backend.dominio.entidades.Entrenador;
import com.tuap.backend.dominio.entidades.Mensaje;
import com.tuap.backend.dominio.entidades.Resena;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadVisibility;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;
import com.tuap.backend.persistencia.MensajeDAO;
import com.tuap.backend.persistencia.ResenaDAO;
import com.tuap.backend.persistencia.UploadedFileDAO;

class UserDataExportServiceTest {
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Test
    void cliente_NullablesSeConservanYElJsonNoExponeSecretos() throws Exception {
        ClienteDAO clientes = mock(ClienteDAO.class); MensajeDAO mensajes = mock(MensajeDAO.class);
        ResenaDAO resenas = mock(ResenaDAO.class); UploadedFileDAO uploads = mock(UploadedFileDAO.class);
        UUID id = UUID.randomUUID(); Cliente cliente = cliente(id, "Ana", "Propia", "ana@nextfit.test");
        when(clientes.findById(id)).thenReturn(Optional.of(cliente));
        when(mensajes.findContactosIds(id)).thenReturn(List.of()); when(resenas.findAll()).thenReturn(List.of());
        when(uploads.findByOwnerIdAndOwnerRole(id, Role.CLIENTE)).thenReturn(List.of());

        UserDataExportResponse result = service(clientes, mensajes, resenas, uploads).exportFor(user(id, Role.CLIENTE));
        JsonNode json = objectMapper.valueToTree(result);

        assertEquals("CLIENTE", result.accountType()); assertEquals("Ana", result.profile().get("nombre"));
        assertNull(result.profile().get("objetivo")); assertNull(result.profile().get("fotoPerfil"));
        assertNull(result.profile().get("deletedAt")); assertFalse(json.path("generatedAt").isMissingNode());
        assertNoForbiddenKeys(json);
    }

    @Test
    void entrenador_NullablesSeConservanYReferenciasDeClientesSonMinimas() throws Exception {
        ClienteDAO clientes = mock(ClienteDAO.class); EntrenadorDAO entrenadores = mock(EntrenadorDAO.class);
        MensajeDAO mensajes = mock(MensajeDAO.class); ResenaDAO resenas = mock(ResenaDAO.class);
        UploadedFileDAO uploads = mock(UploadedFileDAO.class); UUID entrenadorId = UUID.randomUUID();
        Entrenador entrenador = entrenador(entrenadorId); Cliente relacionado = cliente(UUID.randomUUID(), "Bea", "Relacion", "bea@privado.test");
        when(entrenadores.findById(entrenadorId)).thenReturn(Optional.of(entrenador));
        when(clientes.findByEntrenadorId(entrenadorId)).thenReturn(List.of(relacionado));
        when(mensajes.findContactosIds(entrenadorId)).thenReturn(List.of());
        when(resenas.findByEntrenadorIdOrderByFechaDesc(entrenadorId)).thenReturn(List.of());
        when(uploads.findByOwnerIdAndOwnerRole(entrenadorId, Role.ENTRENADOR)).thenReturn(List.of());

        UserDataExportResponse result = service(clientes, entrenadores, mensajes, resenas, uploads).exportFor(user(entrenadorId, Role.ENTRENADOR));
        JsonNode json = objectMapper.valueToTree(result);

        assertNull(result.profile().get("biografia")); assertNull(result.profile().get("fotoPerfil"));
        assertEquals(Map.of("id", relacionado.getId(), "nombre", "Bea", "apellido", "Relacion"), ((List<?>) result.relationships().get("clientes")).getFirst());
        assertFalse(json.toString().contains("bea@privado.test")); assertNoForbiddenKeys(json);
    }

    @Test
    void exportacion_AislaMensajesUploadsYReviewsDelUsuario() throws Exception {
        ClienteDAO clientes = mock(ClienteDAO.class); MensajeDAO mensajes = mock(MensajeDAO.class);
        ResenaDAO resenas = mock(ResenaDAO.class); UploadedFileDAO uploads = mock(UploadedFileDAO.class);
        UUID a = UUID.randomUUID(), b = UUID.randomUUID(), c = UUID.randomUUID(); Cliente clienteA = cliente(a, "A", "Uno", "a@test");
        Mensaje mensajeAB = new Mensaje(a, b, "solo A-B"); mensajeAB.setId(UUID.randomUUID()); mensajeAB.setAttachmentId(UUID.randomUUID());
        Resena propia = new Resena(); propia.setCliente(clienteA); propia.setComentario("propia");
        Resena ajena = new Resena(); ajena.setCliente(cliente(c, "C", "Tres", "c@privado.test")); ajena.setComentario("ajena");
        when(clientes.findById(a)).thenReturn(Optional.of(clienteA)); when(mensajes.findContactosIds(a)).thenReturn(List.of(b));
        UploadedFile uploadA = upload(UUID.randomUUID(), "a.jpg");
        when(mensajes.findChatHistory(a, b)).thenReturn(List.of(mensajeAB)); when(resenas.findAll()).thenReturn(List.of(propia, ajena));
        when(uploads.findByOwnerIdAndOwnerRole(a, Role.CLIENTE)).thenReturn(List.of(uploadA));

        UserDataExportResponse result = service(clientes, mensajes, resenas, uploads).exportFor(user(a, Role.CLIENTE));
        JsonNode json = objectMapper.valueToTree(result);
        assertEquals(1, result.messages().size()); assertEquals(1, result.uploads().size()); assertEquals(1, result.reviews().size());
        assertFalse(json.toString().contains("ajena")); assertFalse(json.toString().contains("storage-key-private"));
        assertNoForbiddenKeys(json); verify(uploads).findByOwnerIdAndOwnerRole(a, Role.CLIENTE);
    }

    @Test
    void cuentaInactiva_NoSeExporta() {
        ClienteDAO clientes = mock(ClienteDAO.class); UUID id = UUID.randomUUID(); Cliente inactive = cliente(id, "Inactiva", "No", "inactive@test"); inactive.setActive(false);
        when(clientes.findById(id)).thenReturn(Optional.of(inactive));
        assertThrows(InvalidRefreshTokenException.class, () -> service(clientes, mock(MensajeDAO.class), mock(ResenaDAO.class), mock(UploadedFileDAO.class)).exportFor(user(id, Role.CLIENTE)));
    }

    private UserDataExportService service(ClienteDAO c, MensajeDAO m, ResenaDAO r, UploadedFileDAO u) { return service(c, mock(EntrenadorDAO.class), m, r, u); }
    private UserDataExportService service(ClienteDAO c, EntrenadorDAO e, MensajeDAO m, ResenaDAO r, UploadedFileDAO u) { return new UserDataExportService(c, e, m, r, u, mock(TrainingDataExportService.class)); }
    private AuthenticatedUser user(UUID id, Role role) { return new AuthenticatedUser(id, "owner@nextfit.test", role); }
    private Cliente cliente(UUID id, String nombre, String apellido, String email) { Cliente c = new Cliente(); c.setId(id); c.setNombre(nombre); c.setApellido(apellido); c.setEmail(email); c.setRol("CLIENTE"); c.setGenero("NO_DECIR"); return c; }
    private Entrenador entrenador(UUID id) { Entrenador e = new Entrenador(); e.setId(id); e.setNombre("Toni"); e.setApellido("Propio"); e.setEmail("toni@nextfit.test"); e.setRol("ENTRENADOR"); return e; }
    private UploadedFile upload(UUID id, String filename) { UploadedFile u = mock(UploadedFile.class); when(u.getId()).thenReturn(id); when(u.getPurpose()).thenReturn(UploadPurpose.CHAT_ATTACHMENT); when(u.getVisibility()).thenReturn(UploadVisibility.PRIVATE); when(u.getOriginalFilename()).thenReturn(filename); when(u.getCreatedAt()).thenReturn(java.time.Instant.parse("2026-01-01T00:00:00Z")); when(u.getStorageKey()).thenReturn("storage-key-private"); return u; }
    private void assertNoForbiddenKeys(JsonNode node) { if (node.isObject()) node.fieldNames().forEachRemaining(key -> { assertFalse(List.of("password", "contrasena", "passwordHash", "tokenHash", "refreshToken", "resetToken", "passwordResetToken", "secret", "storagePath", "storageKey").contains(key)); assertNoForbiddenKeys(node.get(key)); }); else if (node.isArray()) node.forEach(this::assertNoForbiddenKeys); }
}
