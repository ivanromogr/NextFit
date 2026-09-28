# Identidades de autenticación

La identidad interna de NextFit sigue siendo `userId + role`. `auth_identities` enlaza métodos de acceso a esa identidad mediante `provider + providerSubject`; la pareja es única y el subject, no el email, es la autoridad para Google y Apple.

Los proveedores actuales del modelo son `LOCAL`, `GOOGLE` y `APPLE`. LOCAL usa el UUID interno como subject estable, nunca una contraseña ni el email mutable. Las cuentas heredadas crean esta identidad de forma perezosa tras un login local válido; los registros locales la crean al registrarse.

No se almacenan tokens, códigos OAuth, secretos ni credenciales de proveedores. `emailAtLinkTime` es sólo metadata, puede ser nulo o un private relay de Apple y no produce auto-linking. Un vínculo externo no se puede reasignar entre cuentas; repetirlo en la misma cuenta es idempotente. La lógica interna impide desactivar el último método de acceso.

Al borrar una cuenta se desactivan sus identidades. Los cambios de email y contraseña no modifican `providerSubject`; futuros ajustes de recuperación local deberán exigir una identidad LOCAL y contraseña utilizable. Actualmente los campos password de Cliente/Entrenador son obligatorios en el modelo/schema, por lo que AUTH-5/8 deberá tratar su futura nulabilidad.

`GET /api/auth/identities` devuelve sólo las identidades activas del principal y omite subject, userId y role. El export de datos no incluye aún estos métodos; se evaluará en AUTH-10. Aún no hay login, SDK, endpoint de linking ni endpoint de unlink para Google/Apple.

Producción necesita una migración explícita/backfill en Bloque 5 para `auth_identities`: PK UUID, `UNIQUE(provider, provider_subject)`, índice `(user_id, role)`, provider y active no nulos.
