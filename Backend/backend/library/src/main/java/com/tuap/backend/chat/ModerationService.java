package com.tuap.backend.chat;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.auth.AuthenticatedUser;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;

@Service
@Transactional(readOnly = true)
public class ModerationService {
    public record Item(UUID reporterId, UUID messageId, ChatReport.Reason reason, String status, Instant createdAt) {}
    public record Queue(List<Item> items, int page, int totalPages, long totalElements) {}
    public record Evidence(String senderName, String content, LocalDateTime sentAt, boolean hasAttachment) {}
    public record Audit(UUID id, UUID operatorId, String operatorRole, ModerationAudit.Action action, String note, Instant createdAt) {}
    public record Detail(UUID reporterId, UUID messageId, ChatReport.Reason reason, String status, Instant createdAt,
                         long version, Evidence evidence, boolean restricted, boolean canLiftRestriction, List<Audit> audit) {}
    public record Decision(ModerationAudit.Action action, String note, Long expectedVersion) {}
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final ModerationOperatorRepository operators;
    private final ChatReportRepository reports;
    private final ChatRestrictionRepository restrictions;
    private final ModerationAuditRepository audit;
    private final MensajeDAO messages;
    private final ClienteDAO clients;
    private final EntrenadorDAO trainers;
    private final UploadedFileDAO uploads;

    public ModerationService(ModerationOperatorRepository operators, ChatReportRepository reports,
            ChatRestrictionRepository restrictions, ModerationAuditRepository audit, MensajeDAO messages,
            ClienteDAO clients, EntrenadorDAO trainers, UploadedFileDAO uploads) {
        this.operators = operators; this.reports = reports; this.restrictions = restrictions; this.audit = audit;
        this.messages = messages; this.clients = clients; this.trainers = trainers; this.uploads = uploads;
    }
    public boolean hasAccess(AuthenticatedUser user) {
        return user != null && operators.findById(new ModerationOperator.Key(user.userId(), user.role()))
                .filter(ModerationOperator::isActive).isPresent();
    }
    private void requireOperator(AuthenticatedUser user) {
        if (!hasAccess(user)) throw new AccessDeniedException("Acceso de moderación no autorizado");
    }
    public Queue queue(AuthenticatedUser user, String status, int page, int size) {
        requireOperator(user);
        if (!Set.of("PENDING", "CONFIRMED", "DISMISSED").contains(status) || page < 0 || size < 1 || size > 50) {
            throw new IllegalArgumentException("Filtro o paginación no válidos");
        }
        var result = reports.queue(status, user.userId(), PageRequest.of(page, size, Sort.by("createdAt", "reporterId", "messageId")));
        return new Queue(result.stream().map(r -> new Item(r.getReporterId(), r.getMessageId(), r.getReason(), r.getStatus(), r.getCreatedAt())).toList(),
                page, result.getTotalPages(), result.getTotalElements());
    }
    public Detail detail(AuthenticatedUser user, UUID reporter, UUID message) {
        requireOperator(user);
        ChatReport report = reports.findById(new ChatReport.Key(reporter, message)).orElseThrow(NotFound::new);
        return detailFor(user, report);
    }
    private void requireIndependentReviewer(AuthenticatedUser user, ChatReport report) {
        if (user.userId().equals(report.getReporterId()) || user.userId().equals(report.getReportedUserId())) {
            throw new AccessDeniedException("No puedes revisar denuncias en las que participas");
        }
    }
    private Detail detailFor(AuthenticatedUser user, ChatReport report) {
        requireIndependentReviewer(user, report);
        var message = messages.findById(report.getMessageId());
        Evidence evidence = message.map(m -> new Evidence(senderName(m.getRemitenteId()), m.getContenido(), m.getFechaHora(), m.getAttachmentId() != null)).orElse(null);
        var restriction = restrictions.findById(report.getReportedUserId()).filter(ChatRestriction::isActive);
        List<Audit> history = audit.findByReporterIdAndMessageIdOrderByCreatedAtAscIdAsc(report.getReporterId(), report.getMessageId()).stream()
                .map(a -> new Audit(a.getId(), a.getOperatorId(), a.getOperatorRole().name(), a.getAction(), a.getNote(), a.getCreatedAt())).toList();
        return new Detail(report.getReporterId(), report.getMessageId(), report.getReason(), report.getStatus(), report.getCreatedAt(),
                report.getVersion(), evidence, restriction.isPresent(), restriction.filter(r -> r.belongsTo(report)).isPresent(), history);
    }
    @Transactional
    public Detail decide(AuthenticatedUser user, UUID reporter, UUID message, Decision request) {
        requireOperator(user);
        if (request == null || request.action() == null || request.expectedVersion() == null || request.note() == null
                || request.note().isBlank() || request.note().strip().length() > 1000) {
            throw new IllegalArgumentException("La decisión requiere un motivo de hasta 1000 caracteres");
        }
        ChatReport report = reports.lockReport(reporter, message).orElseThrow(NotFound::new);
        requireIndependentReviewer(user, report);
        if (request.expectedVersion() != report.getVersion()) throw new Conflict();
        if (request.action() == ModerationAudit.Action.RESTRICT_CHAT || request.action() == ModerationAudit.Action.LIFT_RESTRICTION) {
            // Serializes restrictions from different reports about the same account, including a previously inactive row.
            Object target = entityManager.find(Cliente.class, report.getReportedUserId(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (target == null) target = entityManager.find(Entrenador.class, report.getReportedUserId(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (target == null) throw new NotFound();
        }
        if (request.action() == ModerationAudit.Action.LIFT_RESTRICTION) {
            var restriction = restrictions.findById(report.getReportedUserId()).filter(ChatRestriction::isActive)
                    .filter(r -> r.belongsTo(report)).orElseThrow(Conflict::new);
            if (!"CONFIRMED".equals(report.getStatus())) throw new Conflict();
            restriction.lift();
            report.recordActivity();
        } else {
            if (!"PENDING".equals(report.getStatus())) throw new Conflict();
            if (request.action() == ModerationAudit.Action.RESTRICT_CHAT) {
                // Preserve the original restriction's basis. Other confirmed reports can be closed without another restriction.
                if (restrictions.existsByUserIdAndActiveTrue(report.getReportedUserId())) throw new Conflict();
                restrictions.save(new ChatRestriction(report.getReportedUserId(), reporter, message));
            }
            report.resolve(request.action() != ModerationAudit.Action.DISMISS);
        }
        audit.save(new ModerationAudit(user, report, request.action(), request.note().strip()));
        reports.saveAndFlush(report);
        return detailFor(user, report);
    }
    public UploadedFile attachment(AuthenticatedUser user, UUID reporter, UUID messageId) {
        requireOperator(user);
        ChatReport report = reports.findById(new ChatReport.Key(reporter, messageId)).orElseThrow(NotFound::new);
        requireIndependentReviewer(user, report);
        UUID fileId = messages.findById(messageId).map(Mensaje::getAttachmentId).orElseThrow(NotFound::new);
        return uploads.findById(fileId).filter(file -> file.getVisibility() == UploadVisibility.PRIVATE
                && file.getPurpose() == UploadPurpose.CHAT_ATTACHMENT
                && Set.of("image/jpeg", "image/png", "image/webp").contains(file.getMimeType())).orElseThrow(NotFound::new);
    }
    private String senderName(UUID id) {
        return clients.findById(id).map(c -> c.getNombre()+" "+c.getApellido())
                .or(() -> trainers.findById(id).map(t -> t.getNombre()+" "+t.getApellido())).orElse("Cuenta no disponible");
    }
    public static class NotFound extends RuntimeException {}
    public static class Conflict extends RuntimeException {}
}
