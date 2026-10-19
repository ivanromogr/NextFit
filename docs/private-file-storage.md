# Archivos privados persistentes

En el perfil Render, `UPLOAD_PROVIDER=cloudinary` guarda las nuevas imágenes de
perfil y adjuntos como assets Cloudinary `image/authenticated`. Se reutiliza la
cuenta existente, sin crear un servicio de pago. El desarrollo local sigue usando
disco por defecto; un proveedor desconocido o Cloudinary sin configurar impide
el arranque en vez de usar silenciosamente almacenamiento efímero.

La aplicación conserva metadatos y permisos en `uploaded_files`. La clave interna
`cld_UUID.ext` apunta al namespace `nextfit/private-uploads`; no se incluye en la
respuesta de subida. El navegador sigue usando `/api/upload/files/{id}`. Solo
después de autorizar al propietario, participante de chat o revisor de una
denuncia concreta, la API obtiene el original mediante una URL firmada de corta
duración. La firma y las credenciales no se entregan al navegador. Las fotos de
perfil mantienen su visibilidad pública a través de la API; los adjuntos siguen
siendo privados y sus respuestas llevan `no-store`.

Se mantienen los límites de tipo y tamaño, se limita la lectura de bytes, hay
timeout de conexión y lectura y no se siguen redirecciones del proveedor. Un
fallo de almacenamiento devuelve 503 sin URLs firmadas ni detalles de secretos;
no se escribe una copia temporal como alternativa. El borrado es idempotente y
solo puede actuar sobre claves válidas dentro del namespace de NextFit.

## Prueba de despliegue opcional

`StorageDeploymentCheck` está ausente por defecto y no tiene una ruta HTTP.
Solo se activa con `APP_STORAGE_DEPLOYMENT_CHECK_ENABLED=true`, un UUID explícito
en `APP_STORAGE_DEPLOYMENT_CHECK_ID` y una fase:

- `create`: sube una imagen PNG sintética válida de 70 bytes, compara el original
  descargado y exige que la entrega sin firma responda 401, 403 o 404.
- `verify-and-delete`: después de sustituir la instancia, verifica esa misma
  imagen sin reescribirla, comprueba privacidad y la borra.

Usa exclusivamente claves `cld_probe_UUID.png`, sin registros de usuarios ni
metadatos de subida. Su indicador de salud permanece DOWN hasta terminar. Un
fallo impide dar por válido el despliegue y los logs solo indican la fase, nunca
credenciales. En una instancia temporal usar una base ficticia y desactivar
correo, limpieza, migraciones y bootstrap de operadores. Retirar las tres
variables y eliminar la instancia al terminar. No activar la fase de verificación
en un reinicio normal después de haber borrado ya la imagen de prueba.

## Límites operativos

La persistencia remota evita perder nuevas imágenes al recrear Render, pero no
constituye una copia independiente del contenido. Definir la política de copia,
retención y recuperación de originales, además de la de PostgreSQL. Conservar
los límites de uso de la cuenta Cloudinary y comprobar su capacidad antes de
abrir la aplicación a usuarios reales.

Las claves locales antiguas se siguen leyendo para instalaciones con disco
persistente. Un archivo que ya desapareció del disco temporal de Render requiere
recuperarse desde una copia existente o volver a subirse; este cambio no inventa
ni recupera su contenido.
