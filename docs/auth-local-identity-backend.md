# AUTH-10.6B: backend create LOCAL

AUTH-10.6B añade `ReauthenticationPurpose`: `IDENTITY_UNLINK` conserva los
tokens existentes ligados a `targetProvider`, mientras que
`CREATE_LOCAL_IDENTITY` emite un token hash-only, de un uso y TTL de cinco
minutos sin provider objetivo.

Endpoints autenticados:

```text
POST /api/auth/identities/local/reauth/google  { credential }
POST /api/auth/identities/local/reauth/apple   { identityToken, nonce }
POST /api/auth/identities/local                { reauthToken, password }
```

La reauth comprueba que provider+subject pertenece al principal. Google exige
email verificado; Apple exige su claim `email_verified`; ambos deben coincidir
con el email interno. Private Relay se permite si cumple esa comprobación.

Create LOCAL no acepta identidad, email, role ni userId del cliente. En una
transacción bloquea identidades activas, valida cuenta, email, token y policy
8--128, codifica con el PasswordEncoder, crea `LOCAL/userId` y consume token.
LOCAL existente devuelve conflicto; no cambia password. No se emite ni revoca
sesión.

Forgot/reset ahora requieren LOCAL activa en runtime Spring, manteniendo la
respuesta neutral de forgot y revalidando al consumir tokens antiguos. Block 5
debe migrar la columna `purpose` e índices de consumo de reauth tokens.

Persistencia verificada con Spring/H2 real: una colisión única de
`LOCAL/userId` provocada después de modificar contraseña y consumir reauth
revierte contraseña, identidad LOCAL y `consumedAt`; dos transacciones
concurrentes con tokens distintos dejan exactamente una LOCAL activa, consumen
sólo el token ganador y conservan activa la identidad social.

Controller/security verificado con MockMvc y filtros reales: los tres
endpoints requieren JWT (`MISSING_TOKEN` sin bearer), y el principal canónico
del JWT es la única autoridad. Los DTOs no aceptan identidad ni usuario desde
body y el alta devuelve exclusivamente `provider` y `status`. Se validaron los
mappings seguros `LOCAL_IDENTITY_ALREADY_EXISTS`, `INVALID_REAUTH_TOKEN`,
`LOCAL_EMAIL_NOT_VERIFIED` y `PASSWORD_POLICY_VIOLATION`.

Pendiente: web/móvil AUTH-10.6C/D.
