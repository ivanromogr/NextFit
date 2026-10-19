package com.tuap.backend.chat;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** While bootstrapping, readiness also requires the persisted operator grant. No identity details are exposed. */
@Component
@ConditionalOnProperty(name = "app.moderation.bootstrap.enabled", havingValue = "true")
public class ModerationBootstrapHealth implements HealthIndicator {
    private final ModerationBootstrap bootstrap;
    public ModerationBootstrapHealth(ModerationBootstrap bootstrap) { this.bootstrap = bootstrap; }
    @Override public Health health() {
        try { return bootstrap.isConfigured() ? Health.up().build() : Health.down().build(); }
        catch (RuntimeException exception) { return Health.down().build(); }
    }
}
