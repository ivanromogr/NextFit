package com.tuap.backend.chat;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import com.tuap.backend.auth.Role;
import com.tuap.backend.persistencia.ClienteDAO;
import com.tuap.backend.persistencia.EntrenadorDAO;

/** Temporary deployment-only bootstrap, disabled by default. Never callable over HTTP. */
@Component
@ConditionalOnProperty(name = "app.moderation.bootstrap.enabled", havingValue = "true")
public class ModerationBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(ModerationBootstrap.class);
    private record Candidate(UUID id, Role role) {}
    private final ClienteDAO clients;
    private final EntrenadorDAO trainers;
    private final ModerationOperatorRepository operators;
    private final String email;
    public ModerationBootstrap(ClienteDAO clients, EntrenadorDAO trainers, ModerationOperatorRepository operators,
            @Value("${app.moderation.bootstrap.email:}") String email) {
        this.clients = clients; this.trainers = trainers; this.operators = operators; this.email = email;
    }
    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        Candidate candidate = candidate();
        var key = new ModerationOperator.Key(candidate.id(), candidate.role());
        if (operators.findById(key).filter(ModerationOperator::isActive).isEmpty()) {
            operators.saveAndFlush(new ModerationOperator(candidate.id(), candidate.role()));
        }
        log.info("MODERATION_BOOTSTRAP_COMPLETE account={} role={}", candidate.id(), candidate.role());
    }
    @Transactional(readOnly = true)
    public boolean isConfigured() {
        Candidate candidate = candidate();
        return operators.findById(new ModerationOperator.Key(candidate.id(), candidate.role())).filter(ModerationOperator::isActive).isPresent();
    }
    private Candidate candidate() {
        if (email == null || email.isBlank()) throw new IllegalStateException("Moderation bootstrap requires an explicit account");
        List<Candidate> matches = new ArrayList<>();
        clients.findActiveForModerationBootstrap(email).forEach(c -> matches.add(new Candidate(c.getId(), Role.CLIENTE)));
        trainers.findActiveForModerationBootstrap(email).forEach(t -> matches.add(new Candidate(t.getId(), Role.ENTRENADOR)));
        if (matches.size() != 1) throw new IllegalStateException("Moderation bootstrap requires exactly one active account");
        return matches.getFirst();
    }
}
