package com.tuap.backend.auth;

import org.springframework.stereotype.Component;

/** Deliberately does not log or expose reset tokens. */
@Component
public class NoopPasswordResetNotifier implements PasswordResetNotifier {
    @Override public void notifyReset(AuthenticatedUser user, String rawToken) { }
}
