# Google Sign-In móvil

AUTH-7 uses `@react-native-google-signin/google-signin` (native SDK, installed version 16.1.5) with its Expo config plugin. The application is Expo 54 / React Native 0.81 and uses a development build or EAS native build: Google native sign-in does **not** run in Expo Go.

Set public values in the mobile environment only: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`. `webClientId` is used to request the ID token that the backend validates; it must be in `GOOGLE_AUTH_ALLOWED_AUDIENCES`. No secret belongs in the app.

The app sends only that opaque ID token to `/api/auth/google`, never interprets claims, and keeps no Google token. A normal backend login response is stored through the existing NextFit session path: access token in memory and refresh token in SecureStore. App restart refreshes only the NextFit session.

`LINK_REQUIRED` never links automatically. `ONBOARDING_REQUIRED` passes the opaque pending token only as navigation state to the Google onboarding screen; it is never placed in SecureStore, AsyncStorage, files, or logs. Terms and Privacy are mandatory; Marketing is optional. The backend creates Google-only accounts without a random password or LOCAL identity.

For Android, configure the Google OAuth Android client for package `com.iviromo.Frontend_App` and the SHA-1 of the development/EAS certificate; production Play App Signing has its own SHA-1. Do not invent either fingerprint. For iOS, register the iOS bundle/client and configure its URL scheme in the native build according to the Google SDK/client generated value. Build with `eas build --profile development --platform android` (or `ios`) to test; do not use Expo Go.
