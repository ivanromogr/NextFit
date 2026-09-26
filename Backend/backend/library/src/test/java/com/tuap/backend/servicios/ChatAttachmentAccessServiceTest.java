package com.tuap.backend.servicios;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadVisibility;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.persistencia.MensajeDAO;
import com.tuap.backend.persistencia.UploadedFileDAO;

class ChatAttachmentAccessServiceTest {
    private UploadedFileDAO fileDAO;
    private MensajeDAO mensajeDAO;
    private ChatAttachmentAccessService service;
    private UUID ownerId;
    private UUID attachmentId;

    @BeforeEach void setUp() {
        fileDAO = Mockito.mock(UploadedFileDAO.class);
        mensajeDAO = Mockito.mock(MensajeDAO.class);
        service = new ChatAttachmentAccessService(fileDAO, mensajeDAO);
        ownerId = UUID.randomUUID();
        attachmentId = UUID.randomUUID();
    }

    @Test void validatesOnlyOwnerPrivateChatAttachmentAndRejectsReuse() {
        when(fileDAO.findById(attachmentId)).thenReturn(Optional.of(file(UploadPurpose.CHAT_ATTACHMENT, UploadVisibility.PRIVATE)));
        service.validateForMessage(attachmentId, owner());
        when(mensajeDAO.existsByAttachmentId(attachmentId)).thenReturn(true);
        assertThrows(IllegalStateException.class, () -> service.validateForMessage(attachmentId, owner()));
    }

    @Test void rejectsForeignOrWrongPurposeAttachment() {
        when(fileDAO.findById(attachmentId)).thenReturn(Optional.of(file(UploadPurpose.CHAT_ATTACHMENT, UploadVisibility.PRIVATE)));
        assertThrows(AccessDeniedException.class, () -> service.validateForMessage(attachmentId,
                new AuthenticatedUser(UUID.randomUUID(), "other@test", Role.CLIENTE)));
        when(fileDAO.findById(attachmentId)).thenReturn(Optional.of(file(UploadPurpose.PROFILE_IMAGE, UploadVisibility.PUBLIC)));
        assertThrows(IllegalArgumentException.class, () -> service.validateForMessage(attachmentId, owner()));
    }

    @Test void participantAccessRequiresPersistedMessageReference() {
        UploadedFile attachment = file(UploadPurpose.CHAT_ATTACHMENT, UploadVisibility.PRIVATE);
        AuthenticatedUser recipient = new AuthenticatedUser(UUID.randomUUID(), "recipient@test", Role.ENTRENADOR);
        assertFalse(service.canAccessAsMessageParticipant(attachment, recipient));
        when(mensajeDAO.existsAttachmentForParticipant(attachment.getId(), recipient.userId())).thenReturn(true);
        assertTrue(service.canAccessAsMessageParticipant(attachment, recipient));
    }

    private UploadedFile file(UploadPurpose purpose, UploadVisibility visibility) {
        UploadedFile file = new UploadedFile(ownerId, Role.CLIENTE, purpose, visibility,
                "physical.webp", "attachment.webp", "image/webp", 1);
        try {
            var id = UploadedFile.class.getDeclaredField("id");
            id.setAccessible(true);
            id.set(file, attachmentId);
        } catch (ReflectiveOperationException exception) { throw new AssertionError(exception); }
        return file;
    }

    private AuthenticatedUser owner() { return new AuthenticatedUser(ownerId, "owner@test", Role.CLIENTE); }
}
