# AUTH-10.2: linking de identidades externas en backend

## Endpoints y autorización

Los dos endpoints requieren un JWT NextFit válido. La cuenta objetivo se toma
exclusivamente del principal autenticado (`userId` y `role`); no se admite un
usuario destino, rol, subject o email como autoridad desde el cliente.

| Método | Endpoint | Request | Respuesta correcta |
| --- | --- | --- | --- |
| POST | `/api/auth/identities/google/link` | `{ "credential": "..." }` | `{ "provider": "GOOGLE", "status": "LINKED" }` |
| POST | `/api/auth/identities/apple/link` | `{ "identityToken": "...", "nonce": "..." }` | `{ "provider": "APPLE", "status": "LINKED" }` |

Repetir el enlace de una identidad activa de la misma cuenta devuelve 200 con
`status: "ALREADY_LINKED"`. El resultado no expone subject, id de identidad,
usuario, rol, email ni token.

Google y Apple reutilizan sus verificadores de ID token existentes. La
credencial se descarta tras producir una identidad social verificada. Google
requiere su email verificado según el contrato actual; para Apple el email es
opcional, incluido Private Relay, y sólo se conserva como `emailAtLinkTime`.

## Reglas de seguridad y consistencia

La autoridad de enlace es exclusivamente `(provider, providerSubject)`. El
email es metadata: no se compara con el email interno, no cambia la cuenta y
nunca provoca auto-link. El link no crea cuenta, contraseña ni identidad LOCAL.
Tampoco emite, rota o revoca sesiones NextFit.

Antes de crear, el servicio resuelve de nuevo la cuenta del principal; una
cuenta inexistente, inactiva o eliminada recibe `ACCOUNT_INACTIVE`. Si el
subject pertenece a otra cuenta, o existe como identidad inactiva histórica,
la operación devuelve 409 `SOCIAL_IDENTITY_ALREADY_LINKED` sin revelar datos
de esa cuenta.

La comprobación y creación suceden dentro de una transacción. El precheck no
es la única defensa: la restricción única del modelo
`(provider, provider_subject)` decide carreras concurrentes. Una
`DataIntegrityViolationException` se relee; se transforma en `ALREADY_LINKED`
si ganó la misma cuenta, o en `SOCIAL_IDENTITY_ALREADY_LINKED` si ganó otra.

Errores de credencial mantienen los contratos seguros existentes:
`INVALID_GOOGLE_TOKEN`, `INVALID_APPLE_TOKEN`, y para Google sin email
verificado, `GOOGLE_EMAIL_NOT_VERIFIED`.

## Identidades listadas y deuda posterior

`GET /api/auth/identities` ya no devuelve `emailAtLinkTime` completo y nunca
devuelve el provider subject, identificadores internos, tokens o hashes.

No hay unlink ni reautenticación adicional en AUTH-10.2; corresponden a
AUTH-10.3. Block 5 debe aportar una migración SQL explícita que garantice en
producción la tabla y la constraint/índice único
`(provider, provider_subject)`, además del índice de identidades activas por
`(user_id, role, active)`.

## AUTH-10.3: reautenticación y unlink

`POST /api/auth/identities/reauth/password`, `/reauth/google` y `/reauth/apple`
requieren JWT y reciben el proveedor social objetivo. Devuelven un token opaco
de un solo uso, con TTL configurable de cinco minutos, almacenado sólo como
SHA-256 junto a usuario, rol, propósito implícito de unlink y proveedor destino.
La reauth social debe usar una identidad activa de la misma cuenta y distinta
del proveedor que se pretende quitar. LOCAL sólo sirve para reauth, nunca para
unlink.

`DELETE /api/auth/identities/google` y `DELETE /api/auth/identities/apple`
reciben `{ "reauthToken": "..." }`. Bloquean pesimistamente todas las
identidades activas de la cuenta, validan que quedan más de una y sólo entonces
consumen el token y desactivan el proveedor. Esto impide carreras que dejen una
cuenta sin método de acceso. Tokens expirados, repetidos, de otro usuario o de
otro target devuelven `INVALID_REAUTH_TOKEN`.

Tras éxito se revocan todas las familias refresh: la arquitectura no puede
identificar con seguridad la familia actual en este endpoint. El access JWT
actual expira normalmente según su TTL. Block 5 debe añadir la tabla e índices
de `reauthentication_tokens`, incluidos hash único y consultas de cleanup.
