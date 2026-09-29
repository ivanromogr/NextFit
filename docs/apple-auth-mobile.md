# Apple mobile authentication base

AUTH-9.2A adds only the native iOS foundation. It uses the official `expo-apple-authentication` module, `ios.usesAppleSignIn`, its Expo config plugin, and the public `EXPO_PUBLIC_APPLE_AUTH_ENABLED=false` feature flag. Apple sign-in is unavailable on Android.

`appleAuthNative` checks iOS availability, generates a cryptographically random nonce with the existing React Native random-values provider, and requests only `FULL_NAME` and `EMAIL`. It returns `{ identityToken, nonce, user }`; the identity token stays in memory only and is never written to SecureStore, AsyncStorage, files, or persistent auth state.

The mobile client sends `{ identityToken, nonce }` to `POST /api/auth/apple`. Apple onboarding is prepared through `POST /api/auth/apple/onboarding` with only `pendingToken`, `role`, `nombre`, `apellido`, `acceptTerms`, `acceptPrivacy`, and `marketingConsent`. The Apple token is never a NextFit token; normal NextFit access/refresh session handling remains separate.

Native Sign in with Apple requires iOS, a development/EAS/native build, and the configured capability; do not assume Expo Go can exercise the production flow. Apple Developer setup remains manual: enable the capability on the App ID, use the correct bundle identifier and provisioning profile, and include the iOS audience in backend validation.

AUTH-9.2B integrates the official `AppleAuthenticationButton` in Login and Register only when the flag, iOS platform, and native availability allow it. The common handler processes `AUTHENTICATED`, `LINK_REQUIRED`, and `ONBOARDING_REQUIRED`; only `pendingToken` and optional first/last-name prefill reach `AppleOnboarding`. The onboarding screen sends the minimal backend payload, creates a normal NextFit session on success, and handles expired, email-required, existing-account, disabled, and invalid-token errors safely. Cancellation leaves the app unchanged. Apple linking remains deferred to AUTH-10; Android has no Apple UI.
