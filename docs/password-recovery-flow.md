# Recuperación de contraseña

El cliente usa `POST /api/auth/password/forgot` con `{ "email": "..." }`. La respuesta es siempre `200` y neutral: no permite enumerar cuentas. `POST /api/auth/password/reset` recibe `{ "token", "newPassword" }`; una contraseña inválida o un token no válido, consumido o caducado responde `400`.

El email generado por AUTH-1 apunta a una URL web estable, normalmente `https://<dominio-nextfit>/reset-password?token=...`. La web conserva el token sólo en el estado del componente y el móvil sólo en los parámetros de navegación; no se escribe en localStorage, sessionStorage, AsyncStorage, SecureStore ni en archivos. Ninguna pantalla registra el token.

Tras un reset correcto no hay inicio de sesión automático: el usuario vuelve a Login. El backend emite tokens aleatorios, guarda únicamente su hash, expiran en 30 minutos, son de un uso y revocan las sesiones de refresco previas.

La app Expo declara el esquema `nextfit` y acepta `nextfit://reset-password?token=...` para pruebas móviles. No se sustituye la URL web del email ni se activan Universal Links/App Links en esta fase.
