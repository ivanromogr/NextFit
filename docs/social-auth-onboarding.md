# Social onboarding provider-agnostic

`SocialOnboardingService` completes new Google and Apple accounts inside one transaction. The client supplies only profile data, role and consent choices; provider, provider subject and verified email come only from the server-issued `PendingSocialAuth` record.

Google keeps `POST /api/auth/google/onboarding` and delegates through its compatibility service. Apple uses `POST /api/auth/apple/onboarding` and the same common service. Both endpoints return the normal NextFit session contract.

The pending record is validated before provider comparison and is consumed only after the account, external identity and consents have been created. A provider mismatch therefore leaves a valid pending record usable through its correct endpoint. Any later exception rolls back the transaction, including the pending consumption.

Before account creation the service rechecks the external `(provider, providerSubject)` pair and the email in both account repositories. Existing email is never auto-linked; it returns `EMAIL_ALREADY_IN_USE`. A linked external identity returns `SOCIAL_IDENTITY_ALREADY_LINKED`. Reused or expired pending tokens return `INVALID_PENDING_SOCIAL_AUTH`.

Apple onboarding requires an email because both persisted account types require one. Missing Apple email returns `SOCIAL_EMAIL_REQUIRED`; Apple private-relay addresses are treated as ordinary verified email values. Social-only accounts receive only their Google or Apple `AuthIdentity`, never a local identity or generated password.
