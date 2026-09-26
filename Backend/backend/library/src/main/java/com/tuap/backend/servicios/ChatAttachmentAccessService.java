package com.tuap.backend.servicios;

import java.util.UUID;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.dominio.entidades.UploadPurpose;
import com.tuap.backend.dominio.entidades.UploadVisibility;
import com.tuap.backend.dominio.entidades.UploadedFile;
import com.tuap.backend.persistencia.MensajeDAO;
import com.tuap.backend.persistencia.UploadedFileDAO;
import com.tuap.backend.servicios.storage.StoredFileNotFoundException;

@Service
public class ChatAttachmentAccessService {
    private final UploadedFileDAO uploadedFileDAO;
    private final MensajeDAO mensajeDAO;

    public ChatAttachmentAccessService(UploadedFileDAO uploadedFileDAO, MensajeDAO mensajeDAO) {
        this.uploadedFileDAO = uploadedFileDAO;
        this.mensajeDAO = mensajeDAO;
    }

    public void validateForMessage(UUID attachmentId, AuthenticatedUser sender) {
        UploadedFile file = uploadedFileDAO.findById(attachmentId)
                .orElseThrow(() -> new StoredFileNotFoundException("Adjunto no encontrado"));
        if (file.getPurpose() != UploadPurpose.CHAT_ATTACHMENT || file.getVisibility() != UploadVisibility.PRIVATE) {
            throw new IllegalArgumentException("El archivo no es un adjunto de chat privado");
        }
        if (!file.getOwnerId().equals(sender.userId()) || file.getOwnerRole() != sender.role()) {
            throw new AccessDeniedException("No puedes adjuntar un archivo ajeno");
        }
        if (mensajeDAO.existsByAttachmentId(attachmentId)) {
            throw new IllegalStateException("El adjunto ya está asociado a un mensaje");
        }
    }

    public boolean canAccessAsMessageParticipant(UploadedFile file, AuthenticatedUser principal) {
        return principal != null
                && file.getPurpose() == UploadPurpose.CHAT_ATTACHMENT
                && file.getVisibility() == UploadVisibility.PRIVATE
                && mensajeDAO.existsAttachmentForParticipant(file.getId(), principal.userId());
    }
}
