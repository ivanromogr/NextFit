# AUTH-10.4: métodos de acceso web

La pantalla protegida `seguridad/identidades` lista sólo provider y estado de
las identidades activas. Permite vincular Google o Apple mediante sus SDKs y
los endpoints de link; no usa email como autoridad ni el endpoint de login.

Para unlink solicita reauth con LOCAL o con el otro provider activo, nunca con
el provider objetivo. Password, credential, nonce e `reauthToken` viven sólo
en memoria durante la operación y no se escriben en storage. El último método
se deshabilita visualmente; el backend sigue siendo autoridad. Tras unlink se
limpia la sesión local y se redirige a login porque el backend revoca refresh.

Apple se muestra como no disponible si `VITE_APPLE_AUTH_ENABLED` no es `true`.
LOCAL no tiene unlink y crear password queda para AUTH-10.6.
