# AUTH-10.6C: crear contraseña LOCAL en web

En **Métodos de acceso**, una identidad LOCAL activa se muestra como
"Correo y contraseña — Vinculado". Si falta LOCAL, la misma pantalla muestra
"No configurado" y el botón **Crear contraseña**.

El usuario confirma una identidad social activa antes de introducir la nueva
contraseña. Google envía únicamente `credential` a
`POST /api/auth/identities/local/reauth/google`; Apple envía únicamente
`identityToken` y `nonce` a su endpoint equivalente. Si ambas identidades
están activas se muestra un selector; si Apple es la única opción pero está
desactivada, no se inicia el SDK y se informa que no hay verificación
disponible.

Tras reauth, el formulario exige contraseña y confirmación (8--128 caracteres)
y envía exclusivamente `reauthToken` y `password` a
`POST /api/auth/identities/local`. La respuesta correcta refresca identities y
mantiene la sesión actual: no hay login, logout ni navegación.

Los tokens sociales, nonce, reauth token y contraseñas sólo viven en estado del
componente; no se almacenan ni se registran. Los errores de correo no
verificado/requerido, token caducado, policy y estado LOCAL existente se
presentan con mensajes seguros.

AUTH-10.6D implementa el mismo flujo para móvil. La validación cross-platform
AUTH-10.6E está completada.
