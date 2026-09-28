# Google Sign-In web

The web client uses the current Google Identity Services script and the public `VITE_GOOGLE_WEB_CLIENT_ID` setting. It sends the opaque GIS credential only to `POST /api/auth/google`; browser code does not decode it or use its claims as an authority.

An existing Google identity receives the normal NextFit session: the access token is held in memory and refresh remains an HttpOnly NextFit cookie. Google credentials and sessions are never persisted by NextFit.

`LINK_REQUIRED` shows a neutral message and never links accounts automatically. For a new verified Google account, the backend issues a random 256-bit pending token. Only its SHA-256 hash is stored, it expires after 15 minutes and is consumed once. The browser keeps the opaque token solely in React navigation state; a reload intentionally requires starting again.

`POST /api/auth/google/onboarding` takes that token, name, surname, role and NextFit consent choices. The server obtains the verified email and Google subject from pending state, rechecks account conflicts, creates the Google identity without a LOCAL identity/password, records Terms/Privacy/Marketing consent, and issues the normal NextFit session. The subsequent role-specific profile onboarding uses the existing authenticated flows.

Google is not a substitute for accepting NextFit Terms and Privacy. SDK, invalid-token and disabled-service failures use generic UI messages. Mobile, Apple sign-in and authenticated Google linking remain out of scope for AUTH-7/AUTH-10.
