# Apple web authentication base

AUTH-9.1A supplies only reusable web infrastructure; it does not add Apple UI or an onboarding route. Configure `VITE_APPLE_AUTH_ENABLED`, `VITE_APPLE_CLIENT_ID` (Apple Services ID), and `VITE_APPLE_REDIRECT_URI` (a registered HTTPS Return URL). Apple Developer setup—Services ID, App ID association, domain/Return URL and matching backend audience—remains manual.

The Apple SDK loader is idempotent, uses Web Crypto for nonce and state, and keeps the Apple identity token in memory only. The web flow is:

```text
Apple SDK web
  -> POST /api/auth/apple
  -> AUTHENTICATED | LINK_REQUIRED | ONBOARDING_REQUIRED
```

`AUTHENTICATED` returns the normal NextFit session. If the result is `ONBOARDING_REQUIRED`, the client completes the account creation with:

```text
POST /api/auth/apple/onboarding
```

The onboarding request payload is exactly:

```json
{
  "pendingToken": "...",
  "role": "CLIENTE | ENTRENADOR",
  "nombre": "...",
  "apellido": "...",
  "acceptTerms": true,
  "acceptPrivacy": true,
  "marketingConsent": false
}
```

The frontend does not send `provider`, `providerSubject`, a trusted email, or the Apple `identityToken` as onboarding authority. Provider, subject, and verified email are obtained by the backend from `PendingSocialAuth`.

Successful onboarding returns a normal NextFit web session: an access JWT and the current refresh/session mechanism. The Apple `identityToken` is never reused as an internal token or persisted in browser storage.

Relevant onboarding errors are `INVALID_PENDING_SOCIAL_AUTH`, `SOCIAL_PROVIDER_MISMATCH`, `SOCIAL_EMAIL_REQUIRED`, `SOCIAL_IDENTITY_ALREADY_LINKED`, and `EMAIL_ALREADY_IN_USE`.

```text
ONBOARDING_REQUIRED
  -> POST /api/auth/apple/onboarding
  -> NextFit session
```

AUTH-9.1B adds the feature-flagged Apple option to Login and Register, handles `AUTHENTICATED`, `LINK_REQUIRED`, and `ONBOARDING_REQUIRED`, and provides `/auth/apple/onboarding`. Only `pendingToken` and optional name metadata are transported to that route; the Apple identity token is never persisted or used as onboarding authority. Linking remains deferred to AUTH-10.
