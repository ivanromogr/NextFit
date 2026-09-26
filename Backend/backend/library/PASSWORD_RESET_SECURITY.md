# Password reset security (temporary production notes)

`POST /api/auth/password/forgot` always returns the same neutral `200` response. If
the normalized email maps to exactly one identity, a 256-bit `SecureRandom` token is
created, URL-safe Base64 encoded, and only its SHA-256 hexadecimal digest is stored.
The token expires after the configurable `password-reset.ttl-minutes` (30 by default)
and is single-use. A new request consumes any earlier active reset token for that user.

The included notifier is intentionally a no-op: it never writes the plaintext token to
logs. A real email-provider implementation must replace it before enabling password
recovery in production. This endpoint also requires production rate limiting.

`POST /api/auth/password/reset` and `PUT /api/auth/password` use passwords of 8 to 128
characters and BCrypt storage. Reset/change invalidates active reset tokens. There is no
refresh-token revocation or JWT blacklist yet; already-issued access tokens can survive
until their 15-minute TTL. Refresh-token family revocation belongs to phase 1.12.

The JPA entity is temporary while `ddl-auto` is used. A formal migration for
`password_reset_tokens` is required before production.

## Refresh-token security (phase 1.12)

Refresh tokens are independent 256-bit opaque credentials, SHA-256 hashed in
`refresh_tokens`, and expire after the configurable 30-day `refresh-token.ttl-days`.
Each login creates a family; every refresh revokes and replaces the presented token
inside that family. Reuse of a rotated token revokes the whole family. Password reset
and password change revoke all refresh tokens for that identity.

Web refresh tokens use the `nextfit_refresh` HTTP-only, Secure (production),
SameSite=Strict `/api/auth` cookie; web refresh/logout additionally accept an Origin
only when it matches configured allowed origins. Mobile receives the opaque token only
when `X-Client-Type: MOBILE` and stores it in Expo SecureStore. Access JWTs remain in
memory in both clients. A logout revokes the family but an issued access JWT can remain
usable until its existing 15-minute expiry; no JWT blacklist is used.
