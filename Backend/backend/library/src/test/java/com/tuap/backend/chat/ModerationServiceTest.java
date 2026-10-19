package com.tuap.backend.chat;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.TestPropertySource;
import com.tuap.backend.auth.*;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Import({ModerationService.class, ChatSafetyService.class})
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
class ModerationServiceTest {
    @Autowired ModerationService moderation;
    @Autowired ChatSafetyService safety;
    @Autowired ModerationOperatorRepository operators;
    @Autowired ChatRestrictionRepository restrictions;
    @Autowired ModerationAuditRepository audit;
    @Autowired ChatReportRepository reports;
    @Autowired MensajeDAO messages;
    @Autowired ClienteDAO clients;
    @Autowired UploadedFileDAO uploads;
    @MockBean OwnershipService ownership;
    @Autowired jakarta.persistence.EntityManager em;
    UUID reviewerId = UUID.randomUUID(), reporter = UUID.randomUUID(), target;
    AuthenticatedUser reviewer = new AuthenticatedUser(reviewerId, "reviewer@nextfit.test", Role.ENTRENADOR);
    ChatReport report;
    Mensaje message;

    @BeforeEach void setup() {
        target = clients.saveAndFlush(new Cliente("Reported", "Account", UUID.randomUUID()+"@test.local", null, "CLIENTE", 0, 0, 0, "", "", "")).getId();
        message = messages.saveAndFlush(new Mensaje(target, reporter, "Reported content"));
        report = reports.saveAndFlush(new ChatReport(reporter, message.getId(), target, ChatReport.Reason.HARASSMENT));
        operators.saveAndFlush(new ModerationOperator(reviewerId, Role.ENTRENADOR));
    }
    private ModerationService.Decision decision(ModerationAudit.Action action, long version) {
        return new ModerationService.Decision(action, " Reviewed evidence and recorded a reason. ", version);
    }
    @Test void normalUsersAndOtherRolesCannotObtainOperatorAccess() {
        var user = new AuthenticatedUser(reporter, "normal@test.local", Role.CLIENTE);
        assertFalse(moderation.hasAccess(user));
        assertFalse(moderation.hasAccess(new AuthenticatedUser(reviewerId, reviewer.email(), Role.CLIENTE)));
        assertThrows(AccessDeniedException.class, () -> moderation.queue(user, "PENDING", 0, 20));
        assertThrows(AccessDeniedException.class, () -> moderation.detail(user, reporter, message.getId()));
        assertThrows(AccessDeniedException.class, () -> moderation.decide(user, reporter, message.getId(), decision(ModerationAudit.Action.DISMISS, 0)));
        assertEquals(0, audit.count());
    }
    @Test void revocationTakesEffectWithoutIssuingAnotherJwt() {
        em.createQuery("update ModerationOperator o set o.active=false where o.userId=:id").setParameter("id", reviewerId).executeUpdate();
        em.clear();
        assertFalse(moderation.hasAccess(reviewer));
        assertThrows(AccessDeniedException.class, () -> moderation.detail(reviewer, reporter, message.getId()));
    }
    @Test void queueIsFilteredPagedAndDoesNotExposeMessageText() {
        var queue = moderation.queue(reviewer, "PENDING", 0, 1);
        assertEquals(1, queue.totalElements());
        assertEquals(1, queue.items().size());
        assertEquals(message.getId(), queue.items().getFirst().messageId());
        assertThrows(IllegalArgumentException.class, () -> moderation.queue(reviewer, "PENDING", 0, 51));
        assertThrows(IllegalArgumentException.class, () -> moderation.queue(reviewer, "UNKNOWN", 0, 20));
    }
    @Test void anOperatorCannotReviewTheirOwnReportOrAMessageAboutThem() {
        var own = reports.saveAndFlush(new ChatReport(reviewerId, message.getId(), target, ChatReport.Reason.SPAM));
        var against = reports.saveAndFlush(new ChatReport(reporter, UUID.randomUUID(), reviewerId, ChatReport.Reason.OTHER));
        assertEquals(1, moderation.queue(reviewer, "PENDING", 0, 20).totalElements());
        assertThrows(AccessDeniedException.class, () -> moderation.detail(reviewer, own.getReporterId(), own.getMessageId()));
        assertThrows(AccessDeniedException.class, () -> moderation.decide(reviewer, against.getReporterId(), against.getMessageId(), decision(ModerationAudit.Action.DISMISS, 0)));
    }
    @Test void dismissalIsAuditedAndCannotBeOverwritten() {
        long initialVersion = report.getVersion();
        var detail = moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.DISMISS, initialVersion));
        assertEquals("DISMISSED", detail.status());
        assertEquals(1, detail.audit().size());
        assertEquals(reviewerId, detail.audit().getFirst().operatorId());
        assertEquals("Reviewed evidence and recorded a reason.", detail.audit().getFirst().note());
        assertEquals(initialVersion + 1, detail.version());
        assertThrows(ModerationService.Conflict.class, () -> moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.CONFIRM, detail.version())));
        assertEquals(1, audit.count());
    }
    @Test void confirmationWithoutRestrictionDoesNotBanTheAccount() {
        var detail = moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.CONFIRM, report.getVersion()));
        assertEquals("CONFIRMED", detail.status());
        assertFalse(detail.restricted());
        assertDoesNotThrow(() -> safety.requireCanSend(target, reporter));
    }
    @Test void restrictionAndItsReversalAreAuditedAndPersonalBlocksSurvive() {
        long initialVersion = report.getVersion();
        var detail = moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.RESTRICT_CHAT, initialVersion));
        assertTrue(detail.restricted()); assertTrue(detail.canLiftRestriction());
        assertTrue(detail.version() > initialVersion);
        assertThrows(AccessDeniedException.class, () -> safety.requireCanSend(target, reporter));
        assertThrows(AccessDeniedException.class, () -> safety.requireCanSend(reporter, target));
        var normal = new AuthenticatedUser(reporter, "normal@test.local", Role.CLIENTE);
        safety.block(normal, target);
        var lifted = moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.LIFT_RESTRICTION, detail.version()));
        assertFalse(lifted.restricted()); assertFalse(lifted.canLiftRestriction());
        assertEquals(2, lifted.audit().size()); assertTrue(lifted.version() > detail.version());
        assertThrows(AccessDeniedException.class, () -> safety.requireCanSend(target, reporter));
        safety.unblock(normal, target);
        assertDoesNotThrow(() -> safety.requireCanSend(target, reporter));
    }
    @Test void staleVersionAndInvalidNotesDoNotProduceDecisions() {
        assertThrows(ModerationService.Conflict.class, () -> moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.DISMISS, 99)));
        assertThrows(IllegalArgumentException.class, () -> moderation.decide(reviewer, reporter, message.getId(), new ModerationService.Decision(ModerationAudit.Action.DISMISS, " ", 0L)));
        assertThrows(IllegalArgumentException.class, () -> moderation.decide(reviewer, reporter, message.getId(), new ModerationService.Decision(ModerationAudit.Action.DISMISS, "x".repeat(1001), 0L)));
        assertEquals(0, audit.count()); assertEquals("PENDING", reports.findById(new ChatReport.Key(reporter, message.getId())).orElseThrow().getStatus());
    }
    @Test void onlyTheReportThatCreatedARestrictionCanLiftIt() {
        moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.RESTRICT_CHAT, report.getVersion()));
        Mensaje secondMessage = messages.saveAndFlush(new Mensaje(target, reporter, "Another message"));
        ChatReport second = reports.saveAndFlush(new ChatReport(reporter, secondMessage.getId(), target, ChatReport.Reason.SPAM));
        assertThrows(ModerationService.Conflict.class, () -> moderation.decide(reviewer, reporter, secondMessage.getId(), decision(ModerationAudit.Action.RESTRICT_CHAT, second.getVersion())));
        var confirmed = moderation.decide(reviewer, reporter, secondMessage.getId(), decision(ModerationAudit.Action.CONFIRM, second.getVersion()));
        assertTrue(confirmed.restricted()); assertFalse(confirmed.canLiftRestriction());
        assertThrows(ModerationService.Conflict.class, () -> moderation.decide(reviewer, reporter, secondMessage.getId(), decision(ModerationAudit.Action.LIFT_RESTRICTION, confirmed.version())));
    }
    @Test void attachmentAccessIsLimitedToTheReportedMessage() {
        UploadedFile file = uploads.saveAndFlush(new UploadedFile(target, Role.CLIENTE, UploadPurpose.CHAT_ATTACHMENT, UploadVisibility.PRIVATE,
                UUID.randomUUID()+".png", "private.png", "image/png", 10));
        message.setAttachmentId(file.getId()); messages.saveAndFlush(message);
        assertEquals(file.getId(), moderation.attachment(reviewer, reporter, message.getId()).getId());
        assertThrows(ModerationService.NotFound.class, () -> moderation.attachment(reviewer, reporter, UUID.randomUUID()));
        assertThrows(AccessDeniedException.class, () -> moderation.attachment(new AuthenticatedUser(reporter, "normal@test.local", Role.CLIENTE), reporter, message.getId()));
    }
    @Test void repeatedUserReportCannotReopenAResolvedCase() {
        moderation.decide(reviewer, reporter, message.getId(), decision(ModerationAudit.Action.DISMISS, report.getVersion()));
        safety.report(new AuthenticatedUser(reporter, "reporter@test.local", Role.CLIENTE), message.getId(), ChatReport.Reason.OTHER);
        assertEquals("DISMISSED", reports.findById(new ChatReport.Key(reporter, message.getId())).orElseThrow().getStatus());
        assertEquals(1, audit.count());
    }

}
