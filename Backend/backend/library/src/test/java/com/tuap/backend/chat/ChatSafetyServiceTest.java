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
import com.tuap.backend.dominio.entidades.Mensaje;
import com.tuap.backend.persistencia.MensajeDAO;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@DataJpaTest
@Import(ChatSafetyService.class)
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
class ChatSafetyServiceTest {
    @Autowired ChatSafetyService safety;
    @Autowired ChatBlockRepository blocks;
    @Autowired ChatReportRepository reports;
    @Autowired MensajeDAO messages;
    @MockBean OwnershipService ownership;
    UUID alice = UUID.randomUUID(), bob = UUID.randomUUID(), stranger = UUID.randomUUID();
    AuthenticatedUser a = new AuthenticatedUser(alice, "alice@test.local", Role.CLIENTE);
    AuthenticatedUser b = new AuthenticatedUser(bob, "bob@test.local", Role.ENTRENADOR);
    Mensaje received;
    @BeforeEach void setup() { received = messages.saveAndFlush(new Mensaje(bob, alice, "Original message")); }

    @Test void blockPersistsAndStopsBothDirectionsWithoutDeletingHistory() {
        safety.block(a, bob); blocks.flush();
        assertEquals(1, blocks.count());
        assertThrows(AccessDeniedException.class, () -> safety.requireCanSend(alice, bob));
        assertThrows(AccessDeniedException.class, () -> safety.requireCanSend(bob, alice));
        assertTrue(safety.state(a, bob).blockedByMe());
        assertFalse(safety.state(b, alice).blockedByMe());
        assertFalse(safety.state(b, alice).canSend());
        assertEquals(1, messages.findChatHistory(alice, bob).size());
    }
    @Test void blockAndUnblockAreIdempotent() {
        safety.block(a, bob); safety.block(a, bob); blocks.flush();
        assertEquals(1, blocks.count());
        safety.unblock(a, bob); safety.unblock(a, bob); blocks.flush();
        assertEquals(0, blocks.count());
        assertTrue(safety.state(a, bob).canSend());
    }
    @Test void unblockingCannotRemoveOtherPersonsBlock() {
        safety.block(b, alice); safety.block(a, bob);
        assertFalse(safety.unblock(a, bob).canSend());
        assertTrue(blocks.existsById(new ChatBlock.Key(bob, alice)));
    }
    @Test void unrelatedAccountCannotBlockOrInspect() {
        doThrow(new AccessDeniedException("denied")).when(ownership).requireCanChatWith(a, stranger);
        assertThrows(AccessDeniedException.class, () -> safety.block(a, stranger));
        assertThrows(AccessDeniedException.class, () -> safety.state(a, stranger));
        assertEquals(0, blocks.count());
    }
    @Test void detachedConversationAllowsSafetyButNotSending() {
        doThrow(new AccessDeniedException("detached")).when(ownership).requireCanChatWith(a, bob);
        assertFalse(safety.state(a, bob).canSend());
        safety.block(a, bob);
        assertFalse(safety.unblock(a, bob).canSend());
    }
    @Test void receivedMessageReportIsPersistentAndDuplicateDoesNotReplaceEvidence() {
        safety.report(a, received.getId(), ChatReport.Reason.HARASSMENT);
        safety.report(a, received.getId(), ChatReport.Reason.SPAM);
        reports.flush();
        assertEquals(1, reports.count());
        ChatReport report = reports.findById(new ChatReport.Key(alice, received.getId())).orElseThrow();
        assertEquals("PENDING", report.getStatus());
        assertEquals(ChatReport.Reason.HARASSMENT, report.getReason());
        assertEquals("Original message", messages.findById(received.getId()).orElseThrow().getContenido());
    }
    @Test void senderAndThirdPartyCannotReportMessage() {
        assertThrows(AccessDeniedException.class, () -> safety.report(b, received.getId(), ChatReport.Reason.OTHER));
        AuthenticatedUser third = new AuthenticatedUser(stranger, "third@test.local", Role.CLIENTE);
        assertThrows(AccessDeniedException.class, () -> safety.report(third, received.getId(), ChatReport.Reason.OTHER));
        assertThrows(AccessDeniedException.class, () -> safety.report(a, UUID.randomUUID(), ChatReport.Reason.OTHER));
        assertEquals(0, reports.count());
    }
    @Test void reasonRequiredAndSelfBlockForbidden() {
        assertThrows(IllegalArgumentException.class, () -> safety.report(a, received.getId(), null));
        assertThrows(AccessDeniedException.class, () -> safety.block(a, alice));
        assertEquals(0, reports.count());
        assertEquals(0, blocks.count());
    }
}
