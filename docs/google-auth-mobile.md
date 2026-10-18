# Google Sign-In móvil

AUTH-7 uses `@react-native-google-signin/google-signin` (native SDK, installed version 16.1.5) with its Expo config plugin. The application is Expo 54 / React Native 0.81 and uses a development build or EAS native build: Google native sign-in does **not** run in Expo Go.

Set public values in the mobile environment only: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. `webClientId` is used to request the ID token that the backend validates; it must be in `GOOGLE_AUTH_ALLOWED_AUDIENCES`. No secret belongs in the app.

The app sends only that opaque ID token to `/api/auth/google`, never interprets claims, and keeps no Google token. A normal backend login response is stored through the existing NextFit session path: access token in memory and refresh token in SecureStore. App restart refreshes only the NextFit session.

`LINK_REQUIRED` never links automatically. `ONBOARDING_REQUIRED` passes the opaque pending token only as navigation state to the Google onboarding screen; it is never placed in SecureStore, AsyncStorage, files, or logs. Terms and Privacy are mandatory; Marketing is optional. The backend creates Google-only accounts without a random password or LOCAL identity.

For Android, configure the Google OAuth Android client for package `com.iviromo.Frontend_App` and the SHA-1 of the development/EAS certificate; production Play App Signing has its own SHA-1. Do not invent either fingerprint. For iOS, register the iOS bundle/client and configure its URL scheme in the native build according to the Google SDK/client generated value. For an installable Android test app, use `eas build --profile preview --platform android`; that profile explicitly produces an APK with the native Google SDK. Do not use Expo Go. The development profile requires `expo-dev-client`, which is not currently installed; do not use it until a separate development-client setup is prepared.


## Android validation and remaining setup

The JavaScript Android bundle exports successfully with Expo SDK 54. Android native prebuild also succeeds in an isolated temporary copy, and Expo autolinking detects the native Google SDK. No APK or native Gradle compilation has been produced yet. Authentication API, access-method screens and native Google credential handling are covered by 29 passing tests (Google SDK mocked). This does not establish native compilation, certificate validity or real Google login.

Local checks, from `Frontend_App`:

```sh
npm ci
npm test -- --runInBand src/test/services/googleSignIn.test.js src/test/api/authApi.test.js src/test/auth/MetodosAccesoScreen.test.js
EXPO_NO_TELEMETRY=1 EXPO_PUBLIC_API_BASE_URL=https://nextfit-pa8i.onrender.com npx expo export --platform android --output-dir dist/android
```

Before creating the APK:

1. Authenticate EAS securely with `EXPO_TOKEN`; never put its value in source or chat. The existing EAS project is declared in `app.json`. Inspect that project and its signing credentials before generating any new certificate.
2. Configure the EAS preview environment with public `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Use the deployed NextFit API and the web client ID allowed by the backend. The Android SDK requests a token for that web client; the Android OAuth client ID itself is not passed to `GoogleSignin.configure`.
3. Register an OAuth Android client in Google Cloud for `com.iviromo.Frontend_App` and the SHA-1 of the actual certificate signing this APK. Obtain the fingerprint from existing EAS credentials or the signed APK; do not guess it. Keep Play App Signing fingerprints separate for a future store build.
4. Build the preview APK. EAS builds may consume the account's build quota; inspect account and project state first. Do not submit to a store as part of this check.
5. On a device with Google Play Services, verify cancellation, a new Google account's consent/onboarding, subsequent login, and NextFit session refresh after restarting the app. A local account with the same email must still require authenticated linking.

The preview APK uses the configured API; do not make destructive tests against existing user accounts. iOS, Apple sign-in and store submission remain separate work.


## EAS project and Android preview signing

EAS access was verified for `@iviromo/Frontend_App` (project ID already in `app.json`). The preview environment now has `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`; the latter uses the client accepted by the deployed backend. No production environment variables were changed.

The existing default Android keystore was inspected through EAS Credentials without downloading or replacing it. Its preview certificate SHA-1 is:

```text
2B:B6:7E:F0:7F:79:F3:9C:0B:77:54:A3:62:9F:8C:44:9A:C1:5F:70
```

Use it only for the corresponding Android OAuth client with package `com.iviromo.Frontend_App`. It is distinct from a future Play App Signing certificate. This fingerprint is public certificate metadata, not the keystore or its password.

The build submission reached source upload but was rejected with HTTP 403 at `storage.googleapis.com`. No new native build was created by those attempts. The required storage destination has been added to the cloud environment network draft; publish that configuration before retrying. EAS API authentication and remote signing credential selection both succeeded.
