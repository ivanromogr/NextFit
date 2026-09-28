# Google authentication backend

`POST /api/auth/google` accepts a Google OIDC `credential` and an optional `role`. The role is
only reserved for a future onboarding flow: it never changes the role of an already linked
account and AUTH-5 does not create profiles automatically.

## Verification and account resolution

`GoogleIdTokenVerifierService` uses the Google JWKS endpoint and accepts only an `RS256` signed
token with issuer `accounts.google.com` or `https://accounts.google.com`, a configured audience,
a future expiry and a non-empty `sub`. It returns only a small internal `VerifiedGoogleIdentity`.
The raw credential, its full claims, external access tokens and provider secrets are never stored,
returned or logged.

The authority is `(GOOGLE, sub)`, never the email. If that active identity resolves to an active
NextFit account, the regular NextFit access JWT and refresh-session mechanism is issued. The role
comes from the persisted identity, so a request role cannot alter it. A disabled identity or an
inactive/deleted account returns `ACCOUNT_INACTIVE`. The Google email may differ from the current
NextFit email after an email change without affecting login by `sub`.

Google email is only returned for an `email_verified` token. An unverified or absent email is
rejected as `GOOGLE_EMAIL_NOT_VERIFIED`.

When there is no `GOOGLE + sub` identity, no account or identity is persisted:

- an active local account with the same verified email yields `LINK_REQUIRED`;
- an unused verified email yields `ONBOARDING_REQUIRED`.

Neither outcome links accounts, creates a duplicate, exposes the provider subject, or gives a
session. AUTH-6/7 must introduce a short-lived, server-controlled onboarding state before it can
create a social account; it must not accept a client-provided subject. Authenticated linking remains
deferred to AUTH-10.

## Configuration

Google login is disabled by default. Configure only client identifiers, never a secret:

```properties
GOOGLE_AUTH_ENABLED=true
GOOGLE_WEB_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
GOOGLE_ANDROID_CLIENT_ID=
# Or an explicit comma-separated override:
GOOGLE_AUTH_ALLOWED_AUDIENCES=
```

`app.auth.google.allowed-audiences` collects the non-empty web/iOS/Android client IDs unless the
explicit allowed-audiences variable is set. With no configured audience, verification fails closed.

The verifier uses `com.nimbusds:nimbus-jose-jwt` to retrieve and cache Google JWKS. Tests mock the
`GoogleTokenVerifier`; they never depend on Google or a network connection. The endpoint is a
sensitive authentication boundary and should receive a dedicated rate limit in production.

## Client contract

Successful login returns the existing `LoginResponse`: web receives the HttpOnly refresh cookie;
mobile receives the refresh token in its existing response contract. Incomplete responses contain
only `status`, `provider`, verified `email`, `emailVerified`, `requiresOnboarding` and
`requiresLinking`. They never contain `providerSubject`, Google ID/access tokens or secrets.

AUTH-5 deliberately does not add a web/mobile Google SDK, Google UI, Apple support, public unlink,
or relaxed CORS/CSRF rules.
