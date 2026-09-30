# AUTH-10.1: auditoría y diseño de identidades vinculadas

> AUTH-10.2 implementa los dos endpoints de link descritos en este documento.
> El contrato y las garantías operativas están en
> [auth-identity-linking-backend.md](auth-identity-linking-backend.md).

## Estado auditado

`AuthIdentity` ya es el modelo de métodos de acceso. Tiene `id` interno, `userId`, `role`, `provider` (`LOCAL`, `GOOGLE`, `APPLE`), `providerSubject`, `emailAtLinkTime`, `active`, `createdAt` y `lastUsedAt`. La restricción única actual es `(provider, provider_subject)`, por lo que un subject externo no puede pertenecer a dos cuentas. `AuthIdentityDAO` lista y cuenta identidades activas por `(userId, role)` y resuelve por provider+subject.

`AuthIdentityService` ya puede enlazar una identidad social, desactivarla y listar activas. `linkIdentity` es idempotente sólo para una identidad activa del mismo `(userId, role)`; una identidad inactiva no se reactiva y un subject de otra cuenta se rechaza. `deactivateIdentity` ya rechaza el último método, pero su patrón actual `count` seguido de `deactivate` no es seguro ante concurrencia. La eliminación de cuenta desactiva todas las identidades y conserva historial.

`GET /api/auth/identities` devuelve `provider`, `createdAt`, `lastUsedAt` y `active`; excluye `providerSubject`, id interno, ownership, hashes, secretos y `emailAtLinkTime` completo.

## LOCAL actual y decisión

LOCAL se materializa al registro local y se garantiza después de un login por contraseña. Su `providerSubject` es `userId.toString()` y no el email. Por tanto, un cambio de email o de contraseña no altera la identidad LOCAL; ambos flujos revocan refresh tokens, pero las identidades sociales permanecen vinculadas.

Las cuentas sociales se crean con contraseña nula. El flujo actual de reset/cambio de contraseña opera sobre el campo de contraseña de la cuenta y no crea explícitamente una `AuthIdentity` LOCAL. AUTH-10 no debe convertir esto de forma implícita en un método LOCAL: crear contraseña para una cuenta social es una subfase explícita posterior (`AUTH-10.6`) que debe crear LOCAL de forma transaccional y requerir reautenticación social reciente.

**Decisión:** AUTH-10 inicial no ofrece unlink de LOCAL. LOCAL representa credenciales internas (email y contraseña); su retirada necesita un diseño específico de eliminación/creación de contraseña. `DELETE` sólo acepta GOOGLE y APPLE.

## Regla del último método

Nunca se permite desactivar la última identidad activa del mismo `(userId, role)`.

- LOCAL only, GOOGLE only o APPLE only: unlink rechazado.
- LOCAL + GOOGLE: Google puede desvincularse.
- GOOGLE + APPLE: se puede desvincular una sola de ellas.
- LOCAL + GOOGLE + APPLE: cualquier social puede desvincularse.

El backend es la autoridad incluso si la UI deshabilita el botón. El error propuesto es `CANNOT_UNLINK_LAST_IDENTITY` (409).

## Contratos propuestos

Todos los endpoints requieren una sesión NextFit válida y un principal activo.

| Método | Endpoint | Body | Resultado |
| --- | --- | --- | --- |
| GET | `/api/auth/identities` | — | lista segura de identidades activas |
| POST | `/api/auth/identities/google/link` | `{ credential }` | `LINKED` o `ALREADY_LINKED` |
| POST | `/api/auth/identities/apple/link` | `{ identityToken, nonce }` | `LINKED` o `ALREADY_LINKED` |
| DELETE | `/api/auth/identities/google` | `{ reauthToken }` | 204 |
| DELETE | `/api/auth/identities/apple` | `{ reauthToken }` | 204 |

Google link reutiliza el verificador criptográfico actual y Apple link reutiliza su verificador JWKS/issuer/audience/nonce. En ambos casos la identidad autorizadora es exclusivamente `(provider, providerSubject)`: el email, incluido Apple Private Relay, es metadata en `emailAtLinkTime`; nunca auto-linkea, cambia `userId`, role ni email interno, ni crea otra cuenta.

Si el subject ya está activo en la misma cuenta, el enlace devuelve 200 con `ALREADY_LINKED` y no crea duplicado. Si pertenece a otra cuenta o está inactivo por una cuenta eliminada, devuelve `SOCIAL_IDENTITY_ALREADY_LINKED` sin revelar cuenta, email, role ni subject. La política inicial conserva el subject inactivo como historial y no permite reasignarlo.

## Reautenticación y sesiones

**Link:** sesión NextFit válida más una credencial recién verificada del provider nuevo. Es suficiente porque prueba posesión del nuevo método y no elimina superficie de acceso; no requiere contraseña.

**Unlink:** sesión NextFit válida, confirmación visual y un `reauthToken` interno de un solo uso, TTL de cinco minutos. Se emite tras: contraseña actual si existe LOCAL, o una credencial fresca de una identidad activa *distinta* de la que se elimina. Esta opción sirve a cuentas social-only y evita pedir una contraseña inexistente. El token se liga a user, role, acción, provider objetivo y expiración; no almacena token Google/Apple.

Link no revoca sesiones. Unlink rota el refresh de la sesión actual y revoca las demás familias de refresh del usuario tras la transacción; así se limita una sesión robada que todavía dependiera del método eliminado. Access JWT existentes expiran normalmente.

## Errores seguros

| Código | HTTP | Uso |
| --- | --- | --- |
| `ALREADY_LINKED` | 200 | misma identidad ya activa en la cuenta |
| `SOCIAL_IDENTITY_ALREADY_LINKED` | 409 | subject ocupado o retenido por otra cuenta |
| `IDENTITY_NOT_LINKED` | 404 | social no activa en el principal |
| `CANNOT_UNLINK_LAST_IDENTITY` | 409 | último método activo |
| `INVALID_GOOGLE_TOKEN` / `INVALID_APPLE_TOKEN` | 401 | credencial externa inválida |
| `REAUTHENTICATION_REQUIRED` | 401 | token de reauth ausente, vencido o no apto |
| `LOCAL_IDENTITY_NOT_SUPPORTED_FOR_UNLINK` | 409 | intento de borrar LOCAL |
| `ACCOUNT_INACTIVE` | 401 | principal eliminado/inactivo |

Los mensajes públicos no deben revelar ownership, emails de terceros, subjects, ids internos ni detalles criptográficos.

## Concurrencia y consistencia

El unique constraint `(provider, provider_subject)` se mantiene como defensa primaria del link. El servicio de link debe ejecutar en transacción, revalidar tras verificar el token y traducir `DataIntegrityViolationException` a `SOCIAL_IDENTITY_ALREADY_LINKED` o `ALREADY_LINKED` después de releer la fila.

Para unlink, AUTH-10.3 debe obtener un bloqueo pesimista de todas las identidades activas del `(userId, role)` (por ejemplo, una query DAO `PESSIMISTIC_WRITE`), contar dentro del bloqueo, comprobar `> 1` y desactivar la fila objetivo en la misma transacción. No basta con el `count` actual. La misma serialización protege link/unlink simultáneos para un usuario. Ningún cambio requiere basarse sólo en comprobaciones previas de UI.

## Soft delete, auditoría y datos

Una cuenta inactiva no puede link ni unlink. `deactivateAll` mantiene las identidades como historial, y los subjects de cuentas eliminadas no se reasignan en AUTH-10 inicial.

Se recomienda añadir un audit log futuro con `IDENTITY_LINKED` e `IDENTITY_UNLINKED`, timestamp, user/role, provider y actor/session family, sin credential, token, subject ni email. No se implementa en AUTH-10.1.

## UX propuesta

Web y móvil tendrán una sección **Configuración > Seguridad > Métodos de acceso** con LOCAL, Google y Apple, estado vinculado y última utilización opcional. Se muestra una advertencia antes de unlink: “Podrás seguir accediendo con X”. Si es el último método, el control se deshabilita como ayuda, pero el backend mantiene el rechazo.

Web reutiliza la credencial Google actual y `startAppleSignIn`, enviándolas a los endpoints `/identities/*/link`, no a login. Móvil reutiliza Google Sign-In y `appleAuthNative`; Apple sólo se ofrece en iOS disponible. Ambos clientes transportan `pendingToken` sólo para onboarding normal, nunca para linking, y no persisten tokens sociales. Unlink exige diálogo explícito y paso de reauth.

## Plan de pruebas

**Backend:** link Google/Apple exitoso; misma cuenta idempotente; subject de otra cuenta; token inválido; cuenta inactiva; no auto-link por email; unlink Google/Apple; social no vinculado; último método; LOCAL no soportado; reauth requerido; rotación/revocación de sesiones; carreras de link y unlink; social-only; soft delete.

**Web:** lista segura y email enmascarado; link Google/Apple; cancelación; errores; confirmación unlink; estado último método; no persistencia de tokens; navegación/reauth.

**Móvil:** disponibilidad Apple iOS; Google; link; cancelación; onboarding no afectado; confirmación unlink; último método; errores y ausencia de tokens sociales en SecureStore/AsyncStorage.

## Base de datos y roadmap

El modelo `AuthIdentity` no necesita otra tabla ni columna para link/unlink básico. Sí hace falta una migración explícita de Block 5 para garantizar `auth_identities`, el unique `(provider, provider_subject)` y un índice de identidades activas por `(user_id, role, active)`. Si se adopta `reauthToken` persistente o audit log, serán tablas nuevas en una subfase posterior.

1. **AUTH-10.1:** auditoría y diseño (este documento).
2. **AUTH-10.2:** backend link Google/Apple, contratos y manejo de carreras (**implementado**).
3. **AUTH-10.3:** backend unlink, reauth token, último método y sesiones (**implementado**).
4. **AUTH-10.4:** gestión de identidades web.
5. **AUTH-10.5:** gestión de identidades móvil.
6. **AUTH-10.6:** social-only a LOCAL (“crear contraseña”) con diseño separado.
7. **AUTH-10.7:** auditoría, regresión y checkpoint final.
