# Auditoría de autenticación externa y recuperación

## Estado actual

NextFit usa login/registro local para `Cliente` y `Entrenador`, `AuthenticatedUser`, JWT propio y refresh tokens rotativos. `IdentityResolver` normaliza el email y resuelve entre ambas tablas. El cambio de email exige contraseña actual, unicidad cross-table y rota sesiones; no existe verificación del nuevo email.

`POST /api/auth/password/forgot` es neutral frente a enumeración. Genera 32 bytes aleatorios, entrega sólo el valor bruto al notifier y guarda SHA-256, con TTL configurable de 30 minutos; una nueva petición consume los tokens activos. `POST /api/auth/password/reset` exige token utilizable, consume el token, actualiza BCrypt, invalida resets activos y revoca refresh. Actualmente `NoopPasswordResetNotifier` no entrega correo. No hay proveedor de email, dependencia, plantilla ni secretos de envío. La web no tiene UI/rutas forgot/reset; móvil sólo muestra texto sin acción.

No hay OAuth/OIDC, Google Sign-In, Apple Sign-In, SDKs ni configuración de clientes en backend, web o móvil.

## Arquitectura recomendada

Crear una tabla puente `auth_identities`: `id`, `userId`, `role`, `provider` (`LOCAL`, `GOOGLE`, `APPLE`), `providerSubject`, `emailAtLinkTime`, `emailVerifiedAt`, `createdAt`, `lastUsedAt`; unicidad en `(provider, providerSubject)`. Mantener las tablas actuales como perfil/rol durante la transición. Añadir estado de email verificado y tokens específicos para verificar cambios de email.

Para web React y Expo, se recomienda que cada cliente obtenga un ID token/authorization code con PKCE y que el backend lo verifique contra JWKS del proveedor. El backend comprueba firma, `iss`, `aud`, `exp`, `sub`, nonce cuando aplique y `email_verified` para Google; Apple JWKS, `iss`, audiencia, expiración, `sub` y nonce. Tras verificar, NextFit emite siempre su propio access JWT y refresh token; nunca usa tokens de Google/Apple como autorización interna.

El primer acceso social sin identidad vinculada valida el proveedor y pide elegir Cliente o Entrenador antes de onboarding. El rol se persiste y no vuelve a venir como autoridad del request. Si el email coincide con una cuenta local, no crear ni vincular automáticamente: solicitar login local o verificación explícita de la cuenta existente. Google y Apple se identifican por proveedor+subject, no por email. Apple private relay y la entrega única de email hacen obligatorio persistir el `sub`.

Endpoints futuros: social login por proveedor, listado de identidades, linking autenticado y unlink. Unlink debe rechazar la retirada del último método de autenticación; una cuenta social puede añadir password sólo tras reautenticación del proveedor.

## Email

Para una fase inicial, Resend o Postmark son las opciones recomendadas por simplicidad, plantillas y deliverability; SES es apropiado al escalar. El cambio de email futuro debe crear solicitud pendiente, enviar token al nuevo correo y persistirlo sólo al confirmarlo.

Secretos backend: `EMAIL_PROVIDER_API_KEY`, `APP_PUBLIC_URL`, Google web/iOS/Android client IDs, `APPLE_SERVICE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`. Los client IDs son configuración pública de frontend; keys de Apple, proveedor email y secretos de verificación permanecen exclusivamente en backend.

## Roadmap y riesgo

1. AUTH-1 proveedor/template email (medio).
2. AUTH-2 entrega real de reset y UIs web/móvil (medio).
3. AUTH-3 verificación de cambio de email (medio).
4. AUTH-4 modelo/migración de identidades (alto).
5. AUTH-5 Google backend; AUTH-6 web; AUTH-7 móvil (alto global).
6. AUTH-8 Apple backend; AUTH-9 Apple web/móvil (alto, configuración Apple).
7. AUTH-10 linking/unlink y passwords para cuentas sociales; AUTH-11 pruebas/auditoría (alto).

Antes de implementar se requieren migraciones explícitas para `auth_identities`, verificación de email y metadata de proveedor. Riesgos principales: linking por email inseguro, configuración de audiencias, Apple relay y no permitir retirar el último método de acceso.
