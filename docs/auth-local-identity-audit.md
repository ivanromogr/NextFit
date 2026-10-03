# AUTH-10.6A: crear identidad LOCAL para cuentas social-only

## Estado auditado

`Cliente` y `Entrenador` almacenan `email` como no nulo y único por tabla, y
`contrasena` como nullable. No existe `passwordUpdatedAt`. El onboarding social
crea ambos modelos con `contrasena = null`; Google y Apple se registran después
como `AuthIdentity` externos. `AuthIdentity` ya garantiza unicidad global de
`provider + provider_subject`; LOCAL usa el `userId` como subject.

El onboarding social exige un email no vacío antes de crear la cuenta
(`SOCIAL_EMAIL_REQUIRED`), por lo que las cuentas creadas por el flujo actual
no tienen email nulo. Google exige además `emailVerified`; Apple expone esa
marca, pero el onboarding actual no la comprueba. Apple puede aportar un
private relay, que es un email interno técnicamente válido para login LOCAL y
no debe cambiarse automáticamente. Cualquier dato histórico con email nulo
debe tratarse como una precondición bloqueante y no como un email aportado por
el cliente.

La política de contraseña actual es sólo longitud de 8 a 128 caracteres,
codificada con el `PasswordEncoder` BCrypt configurado. La confirmación de
contraseña pertenece a web/móvil; el backend recibe únicamente `password` y
aplica esta política.

## Hallazgo crítico: reset antes de LOCAL

`PasswordResetService.requestReset` resuelve por email sin comprobar una
identidad LOCAL. `resetPassword` puede persistir un hash para una cuenta
social-only. Después, un login email/password válido llama
`AuthIdentityService.ensureLocalIdentity`, que crea LOCAL implícitamente.

Por tanto, hoy el reset **puede crear LOCAL indirectamente**, lo que contradice
el requisito de separación. AUTH-10.6B debe impedir forgot/reset cuando no
existe LOCAL activa (respuesta externa neutral para forgot; token/reset no debe
crear ni habilitar LOCAL). `changePassword` sí rechaza social-only mientras el
hash es nulo mediante `InvalidCurrentPasswordException`.

## Diseño propuesto

Crear un purpose explícito para los `ReauthenticationToken`, por ejemplo
`CREATE_LOCAL_IDENTITY`, en vez de reutilizar `targetProvider`. El token seguirá
siendo hash-only, one-use, TTL de cinco minutos, ligado a `userId`, `role` y al
purpose. Requiere ampliar la entidad/tabla con una columna purpose; es deuda de
migración Block 5.

Endpoints propuestos, sin cambiar los de unlink:

```text
POST /api/auth/identities/local/reauth/google  { credential }
POST /api/auth/identities/local/reauth/apple   { identityToken, nonce }
POST /api/auth/identities/local                { reauthToken, password }
```

El principal procede siempre del JWT. No se aceptan `userId`, `role`, `email`,
`provider` ni `providerSubject` del cliente. Para crear LOCAL no existe un
provider objetivo que excluir: Google-only reautentica con Google, Apple-only
con Apple y Google+Apple con cualquiera de los dos. Apple sólo es utilizable
en iOS con flag y disponibilidad reales; Apple-only en Android queda bloqueado
con un mensaje seguro, mientras Google+Apple puede usar Google.

`POST /identities/local` debe rechazar una LOCAL activa con
`LOCAL_IDENTITY_ALREADY_EXISTS` (409); nunca debe actuar como cambio de
contraseña. LOCAL existente continúa usando `PUT /api/auth/password`.

## Operación transaccional

En una sola transacción y bajo bloqueo de las identidades activas del usuario:

1. comprobar cuenta activa, token usable, purpose y principal;
2. comprobar que LOCAL no existe y que el email interno existe;
3. validar y codificar contraseña;
4. persistir contraseña y `AuthIdentity(LOCAL, userId, active=true)`;
5. consumir el token y confirmar la transacción.

Una restricción única de provider/subject más tratamiento de
`DataIntegrityViolationException` debe convertir carreras simultáneas en
`LOCAL_IDENTITY_ALREADY_EXISTS`, nunca en 500 ni en dos identidades. El consumo
del token debe participar en la misma transacción: si falla password o identidad
se revierte; si tiene éxito queda consumido. No se revocan sesiones ni se emite
una sesión nueva: añadir un método de acceso no reduce la seguridad actual.

Tras éxito, GET identities muestra LOCAL activa; el usuario puede cerrar sesión
e iniciar con el email interno y la nueva contraseña. A partir de ahí forgot,
reset y change-password funcionan por sus contratos normales.

## Email y UX

La operación requiere email interno existente, normalizado, único dentro del
modelo correspondiente y verificado para LOCAL. Google satisface hoy este
requisito; para Apple debe evaluarse `emailVerified` y, si no existe un estado
persistido fiable, la verificación de email debe ser una precondición explícita
de AUTH-10.6B. Private relay se permite. Si aparecen registros históricos sin
email usable o no verificable, mostrar: “Antes de crear una contraseña debes
verificar un correo electrónico.” No aceptar ni sustituir un email dentro de
create-local. El flujo de cambio de email actual exige contraseña, por lo que
AUTH-10.6B deberá definir una vía social de verificación reutilizando la
infraestructura de email-change antes de ofrecer create-local a esos registros.

Web y móvil muestran “Correo y contraseña — No configurado” y “Crear
contraseña” sólo sin LOCAL. Tras reauth social se muestra nueva contraseña y
confirmación, se llama create-local, se refresca GET identities y se confirma
éxito sin logout. No se persisten credential, identityToken, nonce, password ni
reauthToken.

Errores propuestos: `LOCAL_IDENTITY_ALREADY_EXISTS`, `LOCAL_EMAIL_REQUIRED`,
`LOCAL_EMAIL_NOT_VERIFIED` (si se introduce dicho estado),
`INVALID_REAUTH_TOKEN`, `PASSWORD_POLICY_VIOLATION`, `ACCOUNT_INACTIVE` y
`SOCIAL_REAUTH_REQUIRED`.

## Plan de pruebas

Backend: Google-only, Apple-only, Google+Apple, LOCAL existente, email ausente,
private relay, token inválido/expirado/replay/de otro usuario, cuenta inactiva,
política, rollback, carrera, GET identities, login LOCAL posterior y reset
posterior. Añadir pruebas que demuestren que forgot/reset antes de LOCAL no
habilitan ni crean LOCAL.

Web: visibilidad condicional, reauth Google/Apple, validación y confirmación de
password, éxito/refetch sin logout, email ausente y ausencia de persistencia.
Móvil: Google-only, Apple-only iOS, Apple-only Android bloqueado,
Google+Apple, cancelaciones, formulario, éxito/refetch y storage audit.

## Microfases

1. AUTH-10.6A: esta auditoría y diseño.
2. AUTH-10.6B: backend purpose/reauth/create LOCAL y corrección reset social-only.
3. AUTH-10.6C: interfaz web.
4. AUTH-10.6D: interfaz móvil.
5. AUTH-10.6E: validación final y checkpoint.

## Deuda de migración

Block 5 debe incluir la columna purpose de `reauthentication_tokens`, índices
para consumo/búsqueda y las restricciones únicas esperadas en producción.
