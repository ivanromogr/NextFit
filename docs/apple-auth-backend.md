# Apple authentication backend

Apple login is disabled by default. Enable it with `APPLE_AUTH_ENABLED=true` and provide a comma-separated allow-list in `APPLE_AUTH_ALLOWED_AUDIENCES` (for example, the Apple Service ID and iOS bundle client ID used by NextFit). No Apple secret is stored by this flow.

`POST /api/auth/apple` accepts only `identityToken` and the optional technical `nonce`; it does not accept a role, subject, internal user id or trusted email. Existing accounts resolve only by `APPLE + sub`; Apple email is optional metadata and private relay addresses are valid. Role is selected only at `POST /api/auth/apple/onboarding`.

Apple verification failures return `INVALID_APPLE_TOKEN`; disabled configuration returns `APPLE_AUTH_DISABLED`; inactive accounts return `APPLE_ACCOUNT_INACTIVE`. Apple tokens are verified against Apple's JWKS and are never persisted. Successful authentication uses NextFit access and refresh tokens.
