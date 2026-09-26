package com.tuap.controladores;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.lang.reflect.Field;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;
import com.tuap.backend.controladores.UploadController;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadVisibility;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.dto.UploadedFileResponse;
import com.tuap.backend.persistencia.UploadedFileDAO;
import com.tuap.backend.servicios.FileStorageService;
import com.tuap.backend.servicios.storage.StoredFile;

class UploadControllerTest {
    private FileStorageService storage;
    private UploadedFileDAO dao;
    private com.tuap.backend.servicios.ChatAttachmentAccessService chatAttachmentAccessService;
    private UploadController controller;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        storage = Mockito.mock(FileStorageService.class);
        dao = Mockito.mock(UploadedFileDAO.class);
        chatAttachmentAccessService = Mockito.mock(com.tuap.backend.servicios.ChatAttachmentAccessService.class);
        controller = new UploadController(storage, dao, chatAttachmentAccessService);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new com.tuap.backend.controladores.UploadExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
    }

    @Test void clienteProfileImage_PersistsPrincipalAndReturnsSafeResponse() throws Exception {
        UUID ownerId = UUID.randomUUID();
        UUID uploadId = UUID.randomUUID();
        when(storage.store(any(), eq(UploadPurpose.PROFILE_IMAGE)))
                .thenReturn(new StoredFile("physical.jpg", "image/jpeg", "jpg", 4, "photo.jpg"));
        when(dao.saveAndFlush(any(UploadedFile.class))).thenAnswer(invocation -> withId(invocation.getArgument(0), uploadId));

        ResponseEntity<UploadedFileResponse> response = controller.uploadFile(file(), UploadPurpose.PROFILE_IMAGE,
                new AuthenticatedUser(ownerId, "cliente@test", Role.CLIENTE));

        UploadedFile persisted = capturePersisted();
        assertEquals(ownerId, persisted.getOwnerId());
        assertEquals(Role.CLIENTE, persisted.getOwnerRole());
        assertEquals(UploadVisibility.PUBLIC, persisted.getVisibility());
        assertEquals(uploadId, response.getBody().id());
        assertEquals("/api/upload/files/" + uploadId, response.getBody().url());
        assertFalse(response.getBody().toString().contains("physical.jpg"));
    }

    @Test void entrenadorChatAttachment_IsAlwaysPrivate() throws Exception {
        UUID uploadId = UUID.randomUUID();
        when(storage.store(any(), eq(UploadPurpose.CHAT_ATTACHMENT)))
                .thenReturn(new StoredFile("physical.webp", "image/webp", "webp", 12, "attachment.webp"));
        when(dao.saveAndFlush(any(UploadedFile.class))).thenAnswer(invocation -> withId(invocation.getArgument(0), uploadId));

        controller.uploadFile(file(), UploadPurpose.CHAT_ATTACHMENT,
                new AuthenticatedUser(UUID.randomUUID(), "trainer@test", Role.ENTRENADOR));

        UploadedFile persisted = capturePersisted();
        assertEquals(Role.ENTRENADOR, persisted.getOwnerRole());
        assertEquals(UploadVisibility.PRIVATE, persisted.getVisibility());
    }

    @Test void persistenceFailure_DeletesJustStoredPhysicalFile() {
        when(storage.store(any(), any())).thenReturn(new StoredFile("rollback.png", "image/png", "png", 8, "x.png"));
        when(dao.saveAndFlush(any(UploadedFile.class))).thenThrow(new IllegalStateException("database unavailable"));

        assertThrows(UploadController.UploadPersistenceException.class,
                () -> controller.uploadFile(file(), UploadPurpose.PROFILE_IMAGE, principal()));
        verify(storage).delete("rollback.png");
    }

    @Test void publicFile_AllowsAnonymousAndAuthenticatedReaders() throws Exception {
        UUID id = UUID.randomUUID();
        UploadedFile metadata = metadata(id, UploadVisibility.PUBLIC, Role.CLIENTE, UUID.randomUUID(), "image/png");
        when(dao.findById(id)).thenReturn(Optional.of(metadata));
        when(storage.load("physical.png")).thenReturn(new ByteArrayResource(new byte[] {1, 2}));

        ResponseEntity<org.springframework.core.io.Resource> anonymous = controller.getFile(id, null);
        ResponseEntity<org.springframework.core.io.Resource> authenticated = controller.getFile(id,
                new AuthenticatedUser(UUID.randomUUID(), "other@test", Role.ENTRENADOR));

        assertEquals(200, anonymous.getStatusCode().value());
        assertEquals("image/png", anonymous.getHeaders().getContentType().toString());
        assertEquals(200, authenticated.getStatusCode().value());
    }

    @Test void privateFile_AllowsOnlyMatchingOwnerAndRole() throws Exception {
        UUID id = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        UploadedFile metadata = metadata(id, UploadVisibility.PRIVATE, Role.CLIENTE, ownerId, "image/jpeg");
        when(dao.findById(id)).thenReturn(Optional.of(metadata));
        when(storage.load("physical.png")).thenReturn(new ByteArrayResource(new byte[] {1}));

        ResponseEntity<org.springframework.core.io.Resource> allowed = controller.getFile(id,
                new AuthenticatedUser(ownerId, "owner@test", Role.CLIENTE));
        assertEquals(200, allowed.getStatusCode().value());
        assertTrue(allowed.getHeaders().getCacheControl().contains("no-store"));
        assertThrows(UploadController.UploadAccessDeniedException.class, () -> controller.getFile(id, null));
        assertThrows(UploadController.UploadAccessDeniedException.class,
                () -> controller.getFile(id, new AuthenticatedUser(UUID.randomUUID(), "other@test", Role.CLIENTE)));
        assertThrows(UploadController.UploadAccessDeniedException.class,
                () -> controller.getFile(id, new AuthenticatedUser(ownerId, "wrongrole@test", Role.ENTRENADOR)));
    }

    @Test void privateChatAttachment_AllowsOnlyARealMessageParticipant() throws Exception {
        UUID id = UUID.randomUUID();
        UploadedFile metadata = metadata(id, UploadVisibility.PRIVATE, Role.CLIENTE, UUID.randomUUID(), "image/jpeg");
        when(dao.findById(id)).thenReturn(Optional.of(metadata));
        when(storage.load("physical.png")).thenReturn(new ByteArrayResource(new byte[] {1}));
        AuthenticatedUser recipient = new AuthenticatedUser(UUID.randomUUID(), "recipient@test", Role.ENTRENADOR);
        when(chatAttachmentAccessService.canAccessAsMessageParticipant(metadata, recipient)).thenReturn(true);

        assertEquals(200, controller.getFile(id, recipient).getStatusCode().value());
        verify(chatAttachmentAccessService).canAccessAsMessageParticipant(metadata, recipient);
    }

    @Test void missingMetadataOrPhysicalFile_IsNotFound() throws Exception {
        UUID missing = UUID.randomUUID();
        when(dao.findById(missing)).thenReturn(Optional.empty());
        assertThrows(com.tuap.backend.servicios.storage.StoredFileNotFoundException.class,
                () -> controller.getFile(missing, null));

        UUID id = UUID.randomUUID();
        when(dao.findById(id)).thenReturn(Optional.of(metadata(id, UploadVisibility.PUBLIC, Role.CLIENTE, UUID.randomUUID(), "image/webp")));
        when(storage.load("physical.png")).thenThrow(new com.tuap.backend.servicios.storage.StoredFileNotFoundException("missing"));
        assertThrows(com.tuap.backend.servicios.storage.StoredFileNotFoundException.class,
                () -> controller.getFile(id, null));
    }

    @Test void httpResponse_HidesStorageAndMapsStorageErrors() throws Exception {
        UUID uploadId = UUID.randomUUID();
        when(storage.store(any(), eq(UploadPurpose.PROFILE_IMAGE)))
                .thenReturn(new StoredFile("secret.jpg", "image/jpeg", "jpg", 4, "visible.jpg"));
        when(dao.saveAndFlush(any(UploadedFile.class))).thenAnswer(invocation -> withId(invocation.getArgument(0), uploadId));

        SecurityContextHolder.getContext().setAuthentication(authenticationFor(principal()));
        try {
            mockMvc.perform(multipart("/api/upload").file(file()).param("purpose", "PROFILE_IMAGE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(uploadId.toString()))
                    .andExpect(jsonPath("$.url").value("/api/upload/files/" + uploadId))
                    .andExpect(jsonPath("$.storageKey").doesNotExist())
                    .andExpect(jsonPath("$.ownerId").doesNotExist())
                    .andExpect(jsonPath("$.ownerRole").doesNotExist());

            when(storage.store(any(), eq(UploadPurpose.PROFILE_IMAGE)))
                    .thenThrow(new com.tuap.backend.servicios.storage.FileTooLargeException("limit"));
            mockMvc.perform(multipart("/api/upload").file(file()).param("purpose", "PROFILE_IMAGE"))
                    .andExpect(status().isPayloadTooLarge())
                    .andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
        } finally {
            SecurityContextHolder.clearContext();
        }
    }

    private UploadedFile capturePersisted() {
        ArgumentCaptor<UploadedFile> captor = ArgumentCaptor.forClass(UploadedFile.class);
        verify(dao).saveAndFlush(captor.capture());
        return captor.getValue();
    }

    private UploadedFile withId(UploadedFile uploadedFile, UUID id) throws Exception {
        Field field = UploadedFile.class.getDeclaredField("id");
        field.setAccessible(true);
        field.set(uploadedFile, id);
        return uploadedFile;
    }

    private MockMultipartFile file() {
        return new MockMultipartFile("file", "ignored.exe", "image/jpeg", new byte[] {1, 2, 3, 4});
    }

    private AuthenticatedUser principal() {
        return new AuthenticatedUser(UUID.randomUUID(), "user@test", Role.CLIENTE);
    }

    private UploadedFile metadata(UUID id, UploadVisibility visibility, Role role, UUID owner, String mimeType) throws Exception {
        UploadedFile file = new UploadedFile(owner, role, UploadPurpose.PROFILE_IMAGE, visibility,
                "physical.png", "visible.png", mimeType, 2);
        return withId(file, id);
    }

    private UsernamePasswordAuthenticationToken authenticationFor(AuthenticatedUser principal) {
        return new UsernamePasswordAuthenticationToken(principal, null,
                java.util.List.of(new SimpleGrantedAuthority(principal.role().toAuthority())));
    }
}
