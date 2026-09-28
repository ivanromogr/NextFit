package com.tuap.backend.auth;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty; import org.springframework.stereotype.Component;

/** Deliberately does not log or expose reset tokens. */
@Component @ConditionalOnProperty(prefix="app.email",name="enabled",havingValue="false",matchIfMissing=true)
public class NoopPasswordResetNotifier implements PasswordResetNotifier {
    @Override public void notifyReset(AuthenticatedUser user, String rawToken) { }
}
