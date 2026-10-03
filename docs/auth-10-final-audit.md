# AUTH-10.7: auditoría final del bloque AUTH-10

## Alcance y conclusión

Auditoría estática final sobre el HEAD `ea42e80` y los checkpoints AUTH-10.2 a
AUTH-10.6E. No se detectó un bug productivo nuevo. AUTH-10 queda técnicamente
coherente para los contratos implementados; no se modifica funcionalidad ni se
repiten suites, pues HEAD no cambió desde el checkpoint validado.

## Arquitectura e identidades

`AuthIdentity` modela `userId`, `role`, `provider`, `providerSubject`,
`emailAtLinkTime`, `active`, `createdAt` y `lastUsedAt`. Los proveedores son
`LOCAL`, `GOOGLE` y `APPLE`; la constraint conceptual y JPA es única en
`(provider, providerSubject)`. LOCAL usa `userId.toString()` como subject y no
depende del email.

El login local autentica email/contraseña con Spring Security, resuelve después
el principal canónico y emite el JWT/refresh normal. Sólo tras una contraseña
válida se garantiza la identidad LOCAL legacy ausente: por ello una cuenta
social-only con contraseña nula no puede recibir LOCAL de forma automática.
No se acepta identidad, rol o usuario desde el cliente como autoridad.

## Login y registro social

Google verifica la credential mediante el verifier configurado, exige email
verificado y usa el subject Google como autoridad. Apple valida identity token,
nonce, issuer y audience configurados; su subject es la autoridad. Apple puede
no repetir email tras el primer acceso y admite Private Relay cuando el claim
está verificado.

Para ambos proveedores, una identidad ya existente inicia sesión en su cuenta;
una cuenta nueva pasa a onboarding; y un email interno coincidente sin esa
identidad devuelve `LINK_REQUIRED`. Nunca hay auto-link ni takeover por email.
Apple sin email puede continuar por onboarding pendiente; una identidad Apple
existente no necesita que Apple vuelva a enviar email.

## Link, listado y unlink

`POST /api/auth/identities/google/link` y `/apple/link` requieren JWT. Google
recibe una credential fresca; Apple, `identityToken` y `nonce`. El principal
JWT es el único destino, no existen `userId` ni `role` en los DTOs. La misma
identidad en la misma cuenta responde `ALREADY_LINKED`; en otra cuenta responde
`SOCIAL_IDENTITY_ALREADY_LINKED`. El unique `(provider, providerSubject)` y la
relectura tras una carrera protegen el enlace.

`GET /api/auth/identities` expone sólo `provider`, timestamps y `active`: no
incluye provider subject, ids internos, email enlazado, passwords ni hashes.

Los DELETE de Google y Apple requieren JWT y reauth con propósito
`IDENTITY_UNLINK`, bloquean pesimistamente las identidades activas, rechazan el
último método y desactivan sólo el provider objetivo. LOCAL no se puede unlink.
Al éxito se revocan todas las familias refresh; el access JWT ya emitido vive
hasta su TTL.

| Métodos activos | Unlink permitido |
| --- | --- |
| LOCAL, GOOGLE o APPLE únicamente | Ninguno |
| LOCAL + GOOGLE | GOOGLE |
| LOCAL + APPLE | APPLE |
| GOOGLE + APPLE | Cualquiera, reautenticando con el otro |
| LOCAL + GOOGLE + APPLE | GOOGLE o APPLE |

## Reautenticación y create LOCAL

`ReauthenticationToken` almacena exclusivamente SHA-256 del token, usuario,
rol, provider objetivo cuando aplica, propósito, timestamps, expiración y
consumo. El valor raw sólo vuelve al cliente. Tiene TTL configurado de cinco
minutos, uso único, lock pesimista durante el consumo y propósitos incompatibles
`IDENTITY_UNLINK` y `CREATE_LOCAL_IDENTITY`.

La reauth password exige LOCAL activa y contraseña actual. La reauth social
para unlink exige una identidad del principal distinta al provider objetivo.
Para crear LOCAL se permiten Google o Apple de la propia cuenta, incluido el
mismo provider: se requiere email del provider verificado y coincidente con el
email interno; Private Relay es válido bajo esa misma regla.

Los endpoints son `POST /api/auth/identities/local/reauth/google`,
`/reauth/apple` y `/identities/local`. Este último valida policy 8--128,
bloquea identidades, codifica BCrypt, crea `LOCAL/userId` y consume el token en
la misma transacción. No acepta email, userId, role, provider ni subject del
body, no sustituye la sesión y no rota refresh. Las pruebas de rollback y
concurrencia verificadas dejan una única LOCAL: el perdedor conserva su token y
recibe conflicto seguro, no un 500.

## Password, email y sesión

Forgot password mantiene respuesta anti-enumeración y no emite reset para una
cuenta sin LOCAL. Reset revalida LOCAL antes de cambiar BCrypt, invalida tokens
activos y revoca refresh. Change password exige hash actual y contraseña
actual; una cuenta social-only no obtiene LOCAL implícitamente.

El cambio de email sigue su verificación pendiente previa. Create LOCAL usa el
email interno actual y la reauth social comprobada; las identidades sociales no
se reasignan por email. JWT contiene subject UUID, role, issuer, audience,
expiración y firma HMAC configurada; el filtro reconstruye el principal
canónico. Los endpoints AUTH-10 no están en `permitAll`; CORS conserva headers
Authorization y X-Client-Type, y refresh/logout web validan Origin explícito.

| Endpoint | JWT | Credencial provider | Reauth | Efecto de sesión |
| --- | --- | --- | --- | --- |
| GET `/api/auth/identities` | Sí | No | No | Ninguno |
| POST `.../google/link` | Sí | Google | No | Ninguno |
| POST `.../apple/link` | Sí | Apple + nonce | No | Ninguno |
| POST `.../reauth/password` | Sí | Password LOCAL | Sí | Emite token interno |
| POST `.../reauth/google` / `apple` | Sí | Provider | Sí | Emite token interno |
| DELETE `.../google` / `apple` | Sí | No | Token unlink | Revoca refresh familiares |
| POST `.../local/reauth/google` / `apple` | Sí | Provider | Sí | Emite token create-local |
| POST `.../local` | Sí | No | Token create-local | Conserva sesión |

## Clientes, almacenamiento y logs

Web y móvil listan los tres providers, enlazan y desenlazan mediante los
endpoints de identities, aplican protección visual de último método y mantienen
el backend como autoridad. Ambos refrescan la lista tras link/create LOCAL;
sólo unlink limpia sesión por la revocación de refresh.

Apple web depende de su flag; móvil sólo lo ofrece en iOS disponible. Android
no ofrece fallback inseguro a Apple: Apple-only queda bloqueado con mensaje
seguro y Google+Apple puede usar Google.

Web persiste sólo metadata de sesión en `sessionStorage`; access token vive en
memoria y el refresh web es cookie HttpOnly. Móvil guarda metadata de sesión en
AsyncStorage y el refresh legítimo en SecureStore. Google credential, Apple
identityToken, nonce, password y reauth token permanecen en memoria durante
los flujos AUTH-10. La revisión dirigida de pantallas, SDKs y contexto no halló
logs de esas credenciales. Existen logs históricos ajenos a AUTH en otras
pantallas, que no se clasifican como fallo de estos flujos.

Los errores AUTH-10 relevantes mantienen códigos HTTP estables y mensajes sin
stacktrace, SQL ni secretos: `SOCIAL_IDENTITY_ALREADY_LINKED`,
`LOCAL_IDENTITY_ALREADY_EXISTS`, `INVALID_REAUTH_TOKEN`,
`LOCAL_EMAIL_NOT_VERIFIED`, `LOCAL_EMAIL_REQUIRED`,
`PASSWORD_POLICY_VIOLATION` y `ACCOUNT_INACTIVE`.

## Evidencia y documentación

- Backend: 311/311 PASS; lifecycle 3/3, rollback 1/1, concurrencia 1/1 y
  controller/security 7/7 incluidos en los checkpoints.
- Web: focal 12/12 y regresión 29/29 PASS; lint sin errores (9 warnings
  históricos) y build PASS.
- Móvil: focal 20/20 y global 61/61 PASS; regresión Apple y Expo config PASS.

Se revisaron los documentos de linking y create LOCAL. Se corrigió el único
estado obsoleto: AUTH-10.6E ya consta como validado en la documentación móvil.

## Deuda antes de producción

### BLOCKER BEFORE PRODUCTION

- Block 5: migraciones SQL explícitas para `AuthIdentity`, `PendingSocialAuth`
  si aplica, `ReauthenticationToken`, `ReauthenticationPurpose`, constraints
  únicas, índices de búsqueda/bloqueo, timestamps y persistencia de verificación
  de email necesaria.
- Configuración real Google: OAuth clients web/móvil, IDs, origins y redirects.
- Configuración real Apple: Apple Developer, Services ID, App ID, capability,
  dominio, Return URL, bundle y audiences backend.
- Rotación de secretos de producción: contraseña PostgreSQL, `JWT_SECRET`,
  credenciales del simulador IoT y revisión de Cloudinary/RapidAPI si aplica.

### NON-BLOCKING DEBT

- Auditoría operativa futura de eventos de link/unlink sin registrar
  credentials, tokens, subjects ni emails.
- Limpieza gradual de logs históricos no pertenecientes a AUTH.

## Conclusión técnica

AUTH-10 conserva una autoridad consistente por principal JWT y subject de
provider, evita auto-link por email, no deja cuentas sin método activo y separa
el alta LOCAL explícita de reset/change password. No hay un blocker técnico
nuevo en el código auditado; los blockers son exclusivamente de preparación de
producción enumerados arriba.
