# Base de datos y estabilidad en producción

Revisión del 19 de octubre de 2026. Este documento registra lo comprobado y el
trabajo pendiente; no declara terminado el bloque de producción.

## Acceso interno

Moderación es una herramienta interna. La entrada solo aparece si el servidor
confirma un permiso activo en `moderation_operators`. Cada operación vuelve a
comprobar ese permiso. Ser cliente o entrenador no lo concede y no existe una
API pública para concedérselo. La activación temporal de despliegue está retirada.
No añadir cuentas por dominio de correo ni abrir el panel a todos los usuarios.

## Estado comprobado

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

## Implementación preparada, pendiente de verificación externa

- Almacenamiento Cloudinary autenticado para nuevas imágenes y adjuntos, con
  lectura a través de los permisos actuales de la API. Las URLs firmadas del
  proveedor no salen al navegador. Se mantienen las claves locales antiguas
  para instalaciones con disco persistente; esto no recupera archivos perdidos.
- Fallo de configuración o caída del proveedor: sin fallback al disco temporal;
  error HTTP 503 sin detalles de credenciales. Descargas con límites de tamaño,
  tiempos de conexión/lectura y sin redirecciones automáticas.
- SQL detallado desactivado en el perfil Render del código preparado.
- Flyway y esquema inicial de 28 tablas verificados con PostgreSQL 16.15, pero
  desactivados por defecto para no adoptar automáticamente la base existente.
- Scripts de copia cifrada, restauración e inventario de solo lectura. El ensayo
  con datos ficticios pasa; falta una copia real recuperable y un destino externo.

Procedimiento y comprobaciones: [Operación de base de datos](database-operations.md).

Estos cambios no están activados en el servicio actual. El entorno sigue sin
acceso a `api.cloudinary.com` y no resuelve el host externo de PostgreSQL; además,
la consulta de bases a la API de Render devuelve 403. La configuración de red de
Cloudinary está guardada como borrador pendiente de publicación. No hay evidencia
todavía para afirmar persistencia, backup o migraciones de la base de producción.

Validación del código preparado: 349 pruebas del backend y 3 pruebas adicionales
de selección/configuración del proveedor, todas sin fallos ni omisiones; JAR
compilado. Ensayos PostgreSQL: cuatro escenarios de migración correctos, copia
cifrada restaurada, destino no vacío rechazado, ciphertext alterado rechazado y
dump fallido sin archivo publicado. Son ensayos aislados, no operaciones sobre
la base de producción.
