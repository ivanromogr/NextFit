# Base de datos y estabilidad en producción

Revisión del 19 de octubre de 2026. Este documento registra lo comprobado y el
trabajo pendiente; no declara terminado el bloque de producción.

## Acceso interno

Moderación es una herramienta interna. La entrada solo aparece si el servidor
confirma un permiso activo en `moderation_operators`. Cada operación vuelve a
comprobar ese permiso. Ser cliente o entrenador no lo concede y no existe una
API pública para concedérselo. La activación temporal de despliegue está retirada.
No añadir cuentas por dominio de correo ni abrir el panel a todos los usuarios.

## Estado comprobado históricamente

Las comprobaciones históricas del día 19 se conservan debajo. En la revisión
posterior del día 20, después de varias esperas agotadas (incluida una de 220
segundos), la API vuelve a responder sin cambios ni reinicio. El comprobador
completo pasa: salud UP, protección sin sesión, CORS con credenciales y rechazo de
Google inválido. No se confirma la causa de la espera ni estabilidad continua.
La rama candidata tiene previews anteriores en Vercel, pero no se ha publicado
en producción ni se ha aceptado la última revisión. El intento de preview del
último commit funcional del día 20 queda bloqueado por la cuota gratuita diaria
de Vercel. Ver [Pruebas generales](testing-general.md) para la evidencia y el
restablecimiento indicado por el proveedor.

- API NextFit: `https://nextfit-pa8i.onrender.com`, servicio Render
  `srv-d772eof5r7bs73e4ffe0`, plan gratuito, sin disco persistente.
- Web: `https://next-fit-q7uo.vercel.app`.
- Health check `/actuator/health`: responde 200 y `UP`.
- Moderación y seguridad del chat sin sesión: 401 `MISSING_TOKEN`.
- CORS permite el origen exacto de producción.
- Una credencial de Google inválida se rechaza con 401 `INVALID_GOOGLE_TOKEN`.
- Backend: despliegue automático desactivado; una subida a main no lo actualiza.
- Render usa PostgreSQL; `SPRING_JPA_HIBERNATE_DDL_AUTO=update` sigue activo.

Repetir las comprobaciones HTTP desde la raíz del repositorio:

```sh
python3 scripts/check-production.py
```

El comando no necesita contraseñas, no crea cuentas ni concede permisos. Envía
una credencial deliberadamente inválida para comprobar su rechazo. Termina con
error si alguna respuesta no coincide. No valida una sesión real, WebSockets,
integridad del esquema, copias de seguridad ni recuperación de archivos.

## Orden del siguiente trabajo

1. **Persistencia de archivos.** `FileStorageService` guarda imágenes y adjuntos
   en el directorio local `uploads`. Render no tiene un disco persistente: los
   archivos pueden perderse al recrear la instancia aunque sus registros sigan
   en PostgreSQL. Configurar almacenamiento privado persistente, mantener las
   comprobaciones de acceso actuales y probar subida, descarga y borrado tras
   reiniciar. La integración Cloudinary para GIF de ejercicios no sustituye el
   almacenamiento de archivos privados. No hacer público el contenido del chat.
2. **Copias y restauración.** Verificar las opciones reales de la base de datos,
   establecer copias cifradas fuera de la instancia y ensayar una restauración
   en una base aislada. Incluir archivos además de PostgreSQL. No hay todavía
   evidencia de una copia de producción restaurable; los ensayos con datos
   ficticios no demuestran que exista esa copia.
3. **Migraciones versionadas.** Inventariar el esquema existente y preparar una
   línea base antes de adoptar una herramienta de migraciones. Probar con una
   copia aislada y sustituir `update` por `validate` cuando el esquema coincida.
   No cambiarlo directamente: la base existente ya ha necesitado ajustes
   manuales y podría impedir el arranque.
4. **Operación.** Desactivar SQL detallado en producción, comprobar límites del
   pool y tiempos de espera, establecer alertas y documentar recuperación de
   despliegues. Mantener los detalles de health y los secretos fuera de respuestas
   públicas. No ampliar el plan de pago ni contratar servicios sin concretar el
   coste con el propietario.

Antes de dar este bloque por terminado debe existir evidencia de persistencia
tras reinicio, restauración ensayada, migraciones repetibles y comprobaciones
de salud y autenticación del despliegue final.

## Almacenamiento privado verificado en Render

- Almacenamiento Cloudinary autenticado para nuevas imágenes y adjuntos, con
  lectura a través de los permisos actuales de la API. Las URLs firmadas del
  proveedor no salen al navegador. Se mantienen las claves locales antiguas
  para instalaciones con disco persistente; esto no recupera archivos perdidos.
- Fallo de configuración o caída del proveedor: sin fallback al disco temporal;
  error HTTP 503 sin detalles de credenciales. Descargas con límites de tamaño,
  tiempos de conexión/lectura y sin redirecciones automáticas.
- SQL detallado desactivado en el perfil Render.
- Flyway y esquema inicial de 28 tablas verificados con PostgreSQL 16.15, pero
  desactivados por defecto para no adoptar automáticamente la base existente.
- Scripts de copia cifrada, restauración e inventario de solo lectura. El ensayo
  con datos ficticios pasa; falta una copia real recuperable y un destino externo.

Procedimiento y comprobaciones: [Operación de base de datos](database-operations.md).

La configuración de red de Cloudinary está publicada. Como el proxy de la sesión
sigue rechazando sus conexiones, la verificación funcional se ejecutó dentro de
una instancia temporal gratuita de Render, con H2 ficticio y sin credenciales de
PostgreSQL de producción. Dos despliegues de `d3b366b` pasaron un health check
condicionado al éxito de estas operaciones:

1. `dep-dbavaqvbtjjs738ojt00`: subir una imagen sintética de 70 bytes, recuperar
   exactamente el original y comprobar que la entrega sin firma es rechazada.
2. `dep-dbavd9qjnfac739a10b0`: leer la misma imagen después de sustituir la
   instancia, **sin volver a subirla**, comprobar su privacidad y borrarla.

La instancia temporal `srv-dbavaqnbtjjs738ojrm0` fue eliminada después del ensayo.
No se crearon cuentas ni se escribieron metadatos de usuario en esa prueba.

El servicio real NextFit está desplegado con `d3b366b`, despliegue
`dep-dbb1ke0m7kps73an5q0g`, estado LIVE, `UPLOAD_PROVIDER=cloudinary` y sin activar
la prueba temporal. Sus checks HTTP pasan: salud UP, moderación y chat protegidos
sin sesión, CORS exacto y rechazo de credenciales Google inválidas. Los archivos
locales antiguos no se migraron ni pueden recuperarse solo desde sus metadatos.

Continúa pendiente la **copia recuperable de la base real** y la adopción revisada
de migraciones. La consulta de PostgreSQL/exportaciones/recuperación a la API de
Render devuelve 403 y la sesión no resuelve su host externo. El propietario ha
pospuesto contratar un plan; no se ha contratado ningún servicio de pago. No se
ha activado Flyway ni cambiado el esquema existente para silenciar este bloqueo.

Validación del código desplegado: 359 pruebas del backend, todas sin fallos ni omisiones; JAR
compilado. Ensayos PostgreSQL: cuatro escenarios de migración correctos, copia
cifrada restaurada, destino no vacío rechazado, ciphertext alterado rechazado y
dump fallido sin archivo publicado. Son ensayos aislados, no operaciones sobre
la base de producción.

## Diagnóstico del comprobador público

El script informa el endpoint y la fase cuando se agota una espera y termina con
error sin marcar como ejecutadas las comprobaciones restantes. Verifica también
el rechazo de orígenes CORS ajenos y el permiso de credenciales del navegador.
`--startup-timeout` amplía solo la primera consulta; después se exige la respuesta
con el timeout normal. Seis pruebas de contrato aisladas pasan y la ejecución real
posterior del día 20 pasa. No se reinicia el servicio ni se atribuye el timeout a
un arranque gratuito sin evidencia adicional.

## Correo transaccional: configuración pendiente (20 de octubre)

La consulta de configuración de Render muestra `EMAIL_ENABLED` desactivado y
ningún valor configurado para `EMAIL_FROM`, `RESEND_API_KEY`,
`APP_PASSWORD_RESET_URL` y `APP_EMAIL_CHANGE_CONFIRM_URL`. No se modifica el
servicio ni se envían mensajes. Faltan el remitente y la configuración del
proveedor antes de verificar recepción externa; los enlaces válidos ya se
ensayan mediante un buzón local en memoria.
