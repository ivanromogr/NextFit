package com.tuap.backend.chat;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.auth.OwnershipService;
import com.tuap.backend.persistencia.MensajeDAO;

@Service
@Transactional
public class ChatSafetyService {
    public record State(boolean blockedByMe, boolean canSend) {}
    private final ChatRestrictionRepository restrictions;
    private final ChatBlockRepository blocks;
    private final ChatReportRepository reports;
    private final MensajeDAO messages;
    private final OwnershipService ownership;
    public ChatSafetyService(ChatBlockRepository blocks, ChatReportRepository reports, MensajeDAO messages, OwnershipService ownership, ChatRestrictionRepository restrictions) {
        this.restrictions = restrictions;
        this.blocks = blocks; this.reports = reports; this.messages = messages; this.ownership = ownership;
    }
    public void requireCanSend(UUID sender, UUID recipient) {
        if (restrictions.existsByUserIdAndActiveTrue(sender) || restrictions.existsByUserIdAndActiveTrue(recipient) || blocks.existsById(new ChatBlock.Key(sender, recipient)) || blocks.existsById(new ChatBlock.Key(recipient, sender))) {
            throw new AccessDeniedException("No se pueden enviar mensajes en esta conversación");
        }
    }
    @Transactional(readOnly = true)
    public State state(AuthenticatedUser user, UUID other) {
        requireConversation(user, other);
        boolean mine = blocks.existsById(new ChatBlock.Key(user.userId(), other));
        boolean related = true;
        try { ownership.requireCanChatWith(user, other); } catch (AccessDeniedException denied) { related = false; }
        return new State(mine, related && !mine && !restrictions.existsByUserIdAndActiveTrue(user.userId()) && !restrictions.existsByUserIdAndActiveTrue(other) && !blocks.existsById(new ChatBlock.Key(other, user.userId())));
    }
    public State block(AuthenticatedUser user, UUID other) {
        requireConversation(user, other);
        ChatBlock.Key key = new ChatBlock.Key(user.userId(), other);
        if (!blocks.existsById(key)) blocks.save(new ChatBlock(user.userId(), other));
        return new State(true, false);
    }
    public State unblock(AuthenticatedUser user, UUID other) {
        requireConversation(user, other);
        blocks.deleteById(new ChatBlock.Key(user.userId(), other));
        return state(user, other);
    }
    public void report(AuthenticatedUser user, UUID messageId, ChatReport.Reason reason) {
        if (user == null) throw new AccessDeniedException("No autorizado");
        if (reason == null) throw new IllegalArgumentException("Selecciona un motivo");
        var message = messages.findById(messageId).orElseThrow(() -> new AccessDeniedException("Mensaje no disponible"));
        // Report only a message actually received by this account; third parties cannot probe it.
        if (!user.userId().equals(message.getDestinatarioId()) || user.userId().equals(message.getRemitenteId())) {
            throw new AccessDeniedException("Mensaje no disponible");
        }
        ChatReport.Key key = new ChatReport.Key(user.userId(), messageId);
        if (!reports.existsById(key)) reports.save(new ChatReport(user.userId(), messageId, message.getRemitenteId(), reason));
    }
    private void requireConversation(AuthenticatedUser user, UUID other) {
        if (user == null || other == null || user.userId().equals(other)) throw new AccessDeniedException("Conversación no disponible");
        try { ownership.requireCanChatWith(user, other); }
        catch (AccessDeniedException denied) {
            if (!messages.existsHistoryBetween(user.userId(), other)) throw denied;
        }
    }
}
