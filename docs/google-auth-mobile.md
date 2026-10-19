# Google Sign-In móvil

AUTH-7 uses `@react-native-google-signin/google-signin` (native SDK, installed version 16.1.5) with its Expo config plugin. The application is Expo 54 / React Native 0.81 and uses a development build or EAS native build: Google native sign-in does **not** run in Expo Go.

Set public values in the mobile environment only: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. `webClientId` is used to request the ID token that the backend validates; it must be in `GOOGLE_AUTH_ALLOWED_AUDIENCES`. No secret belongs in the app.

The app sends only that opaque ID token to `/api/auth/google`, never interprets claims, and keeps no Google token. A normal backend login response is stored through the existing NextFit session path: access token in memory and refresh token in SecureStore. App restart refreshes only the NextFit session.

`LINK_REQUIRED` never links automatically. `ONBOARDING_REQUIRED` passes the opaque pending token only as navigation state to the Google onboarding screen; it is never placed in SecureStore, AsyncStorage, files, or logs. Terms and Privacy are mandatory; Marketing is optional. The backend creates Google-only accounts without a random password or LOCAL identity.

For Android, configure the Google OAuth Android client for package `com.iviromo.Frontend_App` and the SHA-1 of the development/EAS certificate; production Play App Signing has its own SHA-1. Do not invent either fingerprint. For iOS, register the iOS bundle/client and configure its URL scheme in the native build according to the Google SDK/client generated value. For an installable Android test app, use `eas build --profile preview --platform android`; that profile explicitly produces an APK with the native Google SDK. Do not use Expo Go. The development profile requires `expo-dev-client`, which is not currently installed; do not use it until a separate development-client setup is prepared.


## Android validation and remaining setup

The JavaScript Android bundle exports successfully with Expo SDK 54. Android native prebuild also succeeds in an isolated temporary copy, and Expo autolinking detects the native Google SDK. The GitHub-backed Android preview build subsequently completed native compilation successfully; see the build record below. Authentication API, access-method screens and native Google credential handling are covered by 29 passing tests (Google SDK mocked). This does not establish native compilation, certificate validity or real Google login.

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

Local source upload was rejected with HTTP 403 at `storage.googleapis.com`, including after publishing its network rule. Do not keep retrying local uploads or request another token for that failure. Expo is now connected to `ivanromogr/NextFit` through the GitHub App, with project base directory `/Frontend_App`. Trigger Android preview builds directly from the work branch through that integration; do not submit to Google Play. EAS API authentication and remote signing credential selection both succeeded.

The first GitHub-backed preview build `f9536ce6-89c5-4dbe-b002-0373e0abbf0a`, for commit `9fa1d52e6e68f428a6a9eaff7ce90e1627c1b237`, finished successfully on 2026-10-18. EAS reports Android / internal distribution / version 1.0.0 and provides a downloadable APK.

Build page: https://expo.dev/accounts/iviromo/projects/Frontend_App/builds/f9536ce6-89c5-4dbe-b002-0373e0abbf0a

Real Google login on a device remains unvalidated. The Google Cloud Android OAuth client must authorize the package and certificate SHA-1 above; the previously supplied web OAuth client ID alone does not establish that Android registration. Do not mark Google Android complete until device sign-in, onboarding and session restart checks pass.

## Google iOS preparation

Android device installation was deferred by the user. No iOS EAS builds existed when inspected.

`Frontend_App/app.config.js` derives the native Google return URL scheme from `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. Without that variable, Android configuration is preserved; iOS Google login fails before invoking the SDK until its client is supplied. Play Services is checked only on Android.

Validated: seven Google service tests, iOS JavaScript export, and iOS native prebuild in a disposable directory. The prebuild used an explicitly fictional OAuth ID and bundle identifier, and its generated Info.plist contained both the Google reversed scheme and `nextfit`. These checks do not verify a signed iOS build or real login.

Before a real iOS build, establish the app's permanent Apple bundle identifier, register a Google OAuth client of type iOS for that identifier, and add its public client ID as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in EAS preview. Set `ios.bundleIdentifier` to that same permanent identifier. Keep the existing web client ID as the backend token audience. Never substitute the Android or web client ID for the iOS client. A physical iPhone build additionally needs Apple signing credentials and device provisioning; those have not been configured or verified.
