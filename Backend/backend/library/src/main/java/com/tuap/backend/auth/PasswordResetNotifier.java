package com.tuap.backend.auth;

/** Delivery boundary. Production must replace the default no-op implementation with an email provider. */
public interface PasswordResetNotifier {
    void notifyReset(AuthenticatedUser user, String rawToken);
}
