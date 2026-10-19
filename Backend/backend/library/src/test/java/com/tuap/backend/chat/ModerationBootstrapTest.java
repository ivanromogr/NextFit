package com.tuap.backend.chat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import com.tuap.backend.auth.Role;
import com.tuap.backend.dominio.entidades.*;
import com.tuap.backend.persistencia.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@TestPropertySource(properties = {"spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect"})
class ModerationBootstrapTest {
    ModerationBootstrap bootstrap;
    ModerationBootstrapHealth health;
    @Autowired ClienteDAO clients;
    @Autowired EntrenadorDAO trainers;
    @Autowired ModerationOperatorRepository operators;
    @BeforeEach void setup() { bootstrap = new ModerationBootstrap(clients, trainers, operators, "Chosen@nextfit.test"); health = new ModerationBootstrapHealth(bootstrap); }
    private Cliente client(String email) { return clients.saveAndFlush(new Cliente("Chosen", "Account", email, null, "CLIENTE", 0, 0, 0, "", "", "")); }
    @Test void onlyTheDesignatedAccountIsGrantedAndRerunsAreIdempotent() {
        Cliente chosen = client(" chosen@nextfit.test "); client("other@nextfit.test");
        assertFalse(bootstrap.isConfigured()); assertEquals("DOWN", health.health().getStatus().getCode());
        bootstrap.run(new DefaultApplicationArguments()); bootstrap.run(new DefaultApplicationArguments());
        assertEquals(1, operators.count());
        assertTrue(operators.findById(new ModerationOperator.Key(chosen.getId(), Role.CLIENTE)).orElseThrow().isActive());
        assertTrue(bootstrap.isConfigured()); assertEquals("UP", health.health().getStatus().getCode());
    }
    @Test void missingAccountFailsWithoutGrantingAnyone() {
        client("other@nextfit.test");
        assertThrows(IllegalStateException.class, () -> bootstrap.run(new DefaultApplicationArguments()));
        assertEquals(0, operators.count()); assertEquals("DOWN", health.health().getStatus().getCode());
    }
    @Test void ambiguousAccountsFailWithoutPartialGrants() {
        client("chosen@nextfit.test");
        trainers.saveAndFlush(new Entrenador("Chosen", "Trainer", "CHOSEN@nextfit.test", null, "ENTRENADOR", "Fitness", 0, "", 0, "", "", "ONLINE", null));
        assertThrows(IllegalStateException.class, () -> bootstrap.run(new DefaultApplicationArguments()));
        assertEquals(0, operators.count());
    }
    @Test void disabledBootstrapDoesNotExist() {
        new ApplicationContextRunner().withUserConfiguration(ModerationBootstrap.class, ModerationBootstrapHealth.class)
                .run(context -> { assertEquals(0, context.getBeansOfType(ModerationBootstrap.class).size()); assertEquals(0, context.getBeansOfType(ModerationBootstrapHealth.class).size()); });
    }
}
