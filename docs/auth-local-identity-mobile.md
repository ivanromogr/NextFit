# AUTH-10.6D: crear contraseña LOCAL en móvil

En **Métodos de acceso**, LOCAL activa se muestra como vinculada. Cuando falta,
la misma pantalla permite **Crear contraseña** sin cambiar la sesión NextFit.

La reautenticación usa sólo identidades sociales activas: Google obtiene una
credential fresca y llama al endpoint create-local; Apple sólo se ofrece en
iOS cuando el feature flag y `isAppleSignInAvailable()` lo permiten. En
Android, una cuenta Apple-only informa que no existe método de verificación
disponible; con Google disponible se usa Google. Si ambos providers son
usables se muestra un selector.

Después de reauth, el formulario usa campos seguros para contraseña y
confirmación, valida presencia, coincidencia y 8--128 caracteres, y envía
únicamente `reauthToken` y `password`. El éxito limpia estado temporal,
refresca identities y mantiene sesión; nunca realiza login, logout ni rota
refresh tokens.

Credentials sociales, nonce, reauth token y contraseñas permanecen sólo en
memoria. Los errores de email, policy, token caducado y LOCAL ya existente se
muestran sin detalles internos. AUTH-10.6E completó la validación final
cross-platform del bloque.
