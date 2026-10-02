# AUTH-10.5: métodos de acceso móvil

`MetodosAcceso` es una pantalla protegida y compartida por CLIENTE y ENTRENADOR,
accesible desde ambos perfiles. Lista LOCAL, Google y Apple sin subjects ni
metadata sensible. LOCAL se muestra como no configurado cuando no existe.

Google reutiliza el SDK nativo. Apple sólo se ofrece en iOS cuando la flag
`EXPO_PUBLIC_APPLE_AUTH_ENABLED` está activa y el dispositivo lo permite; en
Android se muestra como no disponible. Link usa exclusivamente los endpoints
de identities y nunca los endpoints de login.

Antes de desvincular Google o Apple, la pantalla pide una confirmación y abre
un selector de reautenticación alternativa. Para quitar Google permite LOCAL
y/o Apple usable; para quitar Apple permite LOCAL y/o Google. Nunca ofrece el
provider que se intenta quitar. En cuentas social-only Google + Apple, ambas
direcciones funcionan en iOS; en Android Google puede confirmar la retirada de
Apple, pero Apple no puede confirmar la retirada de Google.

La reautenticación usa los endpoints específicos de identities: contraseña,
Google con una credential fresca, o Apple con identityToken y nonce frescos.
No hay fallback si no existe otro método usable. La protección visual del último
método se mantiene, y el backend sigue siendo la autoridad final.

Tokens sociales, nonce, contraseña y token de reauth sólo viven en memoria
durante la operación: no se persisten en SecureStore ni AsyncStorage. Tras un
unlink correcto se limpia la sesión local y se vuelve a Login porque la familia
de refresh queda revocada. Crear contraseña para social-only queda diferido a
AUTH-10.6.
