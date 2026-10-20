# Baja de cuenta: contraseña y métodos sociales

19 de octubre de 2026. Implementación en la rama de preparación de la beta;
pendiente de desplegar y verificar con proveedores/dispositivo reales.

## Comportamiento

Web y móvil consultan los métodos activos de la cuenta autenticada. Si falla la
consulta, bloquean la acción y permiten reintentar. Una cuenta sin contraseña
puede verificar su identidad con Google o Apple si ese proveedor está vinculado
y disponible en la instalación; no se exige crear una contraseña primero.

La interfaz solicita confirmación explícita y bloquea operaciones simultáneas.
Cancelar la confirmación o el proveedor no elimina la cuenta ni cierra la sesión.
Solo se limpia la sesión después de que el servidor responda correctamente.
Si se pierde la limpieza local después del éxito, no se vuelve a enviar la baja.

## Contrato de servidor

`DELETE /api/auth/account` conserva JWT como requisito y el formato anterior de
contraseña. El cuerpo selecciona exactamente un método:

- Contraseña: `currentPassword`, con `provider` ausente o `LOCAL`.
- Google: `provider: GOOGLE` y `credential`.
- Apple: `provider: APPLE`, `identityToken` y `nonce`.

No se aceptan credenciales mezcladas. El servidor comprueba el proveedor
habilitado y verifica criptográficamente la credencial mediante los verificadores
existentes. El servicio bloquea las identidades activas del usuario/rol y exige
coincidencia de proveedor y subject. El email, el ID que envíe el cliente o una
identidad desvinculada no conceden permiso para borrar otra cuenta.

Se reutiliza la transacción de baja existente. No se usan tokens de reautenticación
para desvincular identidades ni se añade un propósito a su enum; no hay cambios
de esquema o migraciones. El éxito revoca sesiones de NextFit, desactiva identidades
y elimina la cookie web de renovación (`no-store` y expiración de cookie).

El móvil marca los tres métodos para no reintentar automáticamente la petición
tras un timeout ni renovar/cerrar la sesión de NextFit por un rechazo de la
verificación social. El error se devuelve a la pantalla para que el usuario decida
qué hacer. Esto evita reenviar una baja cuyo resultado puede haberse perdido;
no garantiza conocer el resultado de una respuesta perdida.

## Alcance de la baja

Se mantiene la lógica existente: desactivación, anonimización de campos del
perfil, retirada de avatar gestionado, desvinculación de entrenador/clientes y
revocación de sesiones e identidades NextFit. Los historiales y mensajes no se
borran automáticamente; la interfaz lo indica. La política de conservación y
supresión completa sigue pendiente de concretar antes de publicar textos legales.

No se revocan aquí las concesiones externas de Google/Apple. En particular,
la revocación de autorización Apple y sus requisitos de publicación deben
integrarse y verificarse al preparar Sign in with Apple real. Apple Developer,
firma iOS, TestFlight y pruebas del proveedor en teléfono continúan aplazados.
Esta entrega no declara la aplicación lista para App Store.

## Validación

Pruebas de integración con JWT y H2, usando verificadores sociales simulados y
cuentas ficticias: baja Google/Apple sin contraseña, mismo email con subject
incorrecto, identidad de otra cuenta o rol, identidad desactivada, token inválido,
credenciales mezcladas, falta de JWT y revocación de sesiones tras éxito.
Los tokens de acceso anteriores dejan de autorizar peticiones tras la baja.

Pruebas web/móvil: método local, social-only, confirmación/cancelación, errores,
reintento de carga y exclusión de envíos simultáneos. Pruebas del cliente HTTP
móvil verifican que no reenvía la baja ni borra la sesión por un rechazo social.
La verificación criptográfica real corresponde a las suites existentes de los
verificadores; aquí no se abren sesiones Google/Apple reales ni se borran cuentas
reales. Los resultados completos se registran al terminar las suites.

Resultados de esta entrega:

- Suite completa del backend: 373 pruebas, sin fallos, errores u omisiones; JAR
  compilado. Después, la clase social completa pasa sus 11 casos, incluido el
  entrenador sin contraseña y la desvinculación de sus clientes añadidos al final.
- Suite web completa: 289 pruebas correctas. Tras añadir la protección al salir
  de la pantalla, pasan las ocho pruebas del formulario y se recompila la web.
- Suite móvil completa: 169 pruebas correctas. Tras esa protección pasan las
  17 pruebas focalizadas de formulario y cliente HTTP (dos suites).
- Exportación JavaScript/Hermes de Android e iOS completada sobre el código final.
  No es una compilación firmada ni una prueba en dispositivo real.
- `git diff --check` correcto. No se modifican dependencias, secretos o producción.

Si el usuario abandona la pantalla antes de que termine la verificación del SDK,
la credencial tardía no dispara una nueva petición de baja. Una petición de baja
ya enviada y confirmada no puede cancelarse simplemente navegando atrás.

## Recorrido real local posterior (20 de octubre)

El navegador verifica la baja por contraseña para ambos roles con H2 aislado:
carga y envío recuperables, cancelación sin petición, contraseña incorrecta sin
baja, éxito con cookie eliminada, rechazo de JWT/login/renovación anteriores y
enlaces pendientes invalidados. Al dar de baja al entrenador, su atleta sigue
activo y queda desvinculado. No se usan cuentas reales ni proveedores sociales.
El ensayo reproducible está en `scripts/check-local-beta.py`; detalle y límites
en [Pruebas generales](testing-general.md).

## Respuestas tardías y cambio de cuenta

El formulario se aísla por ID autenticado y descarta cargas y respuestas de una
instancia anterior. Una baja pendiente no limpia ni redirige una nueva sesión;
la contraseña anterior tampoco permanece en el nuevo formulario. Las tres
regresiones nuevas fallan antes de corregir y pasan después; la suite del
formulario termina con once casos correctos. La operación ya enviada puede
completarse en el servidor: cambiar de pantalla no la revierte. El recorrido
local de bajas de ambos roles sigue pasando.
