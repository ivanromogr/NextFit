# Estado de cierre del paso 7

Comprobado el 20 de octubre de 2026. Repositorio `ivanromogr/NextFit`, rama
`codex/mobile-ux`. Preservar el `app.json` raíz sin seguimiento. No fusionar main
ni contratar servicios. El paso 7 no está cerrado para publicación.

## Completado

- Backend: 386 pruebas; web: 460 en 65 archivos; móvil: 203 en 33 suites. Total: 1.049.
  Backend conserva la ejecución anterior; web se repitió tras el proxy y móvil tras corregir los reintentos de red.
- Lint web, build con manifest y 18 contratos Python correctos.
- Recorrido completo con ambos perfiles, API H2 y HTTP en el mismo origen:
  `scripts/check-local-beta.py --same-origin`, salida 0. Incluye chat,
  entrenamientos, privacidad, recuperación y baja. No acepta orígenes remotos.
- Prueba específica `scripts/check-local-session-proxy.py`, salida 0 para ambos
  roles: login, recarga, baja y rechazo posterior de login/JWT/refresh.
- Producción Render conserva SHA `d3b366b6ccb1873cbe2507badb1b8bf7e4ae5fac`.
  El usuario autorizó añadir el origen exacto de preview y redesplegar ese mismo
  SHA: `dep-dbbsisg473hc73cd240g`, live. Salud, permisos, CORS y Google inválido pasan.
- La preview `678f948dbc12b647b2d2c3ab1a1b0ca3124bf6bd`,
  `dpl_A14ja8jXP7E2R5jCAh4PG2YEXKQT`, pasa doce verificaciones públicas
  en móvil/escritorio y el rechazo de login ficticio contra Render.

## Corrección que falta validar en Vercel

Las pruebas con cuentas ficticias reales detectaron que Chromium bloquea por
`UserPreferences` la cookie de Render, ubicada en otro dominio. Login da 200,
pero refresh devuelve 401. Las cuentas temporales se dieron de baja; se verificó
revocación en las ejecuciones posteriores a corregir la lectura del charset.
No se usaron cuentas personales ni se enviaron correos externos.

El código de aplicación `ce18e94` añade rewrite `/api/:path*` y
`VITE_API_SAME_ORIGIN=true`. La opción se configuró exclusivamente para previews
de `codex/mobile-ux`; producción web no cambia. WebSocket/SockJS conserva el
backend de `VITE_WS_URL`. Los recorridos completos locales del proxy pasan.

La cuota permitió después desplegar `7d2477750353051fc963e04225e5b65069de3bb5`:
`dpl_CuEcPAa22hrzJau9YGw1zDob6snh`, READY, alias verificado. La build activa
VITE_API_SAME_ORIGIN=true. Las doce pruebas públicas y login/recarga reales para
ambos roles pasan. Las dos cuentas de la pasada satisfactoria se dieron de baja
y se verificó revocación. No se desactivó el bloqueo de cookies de terceros.

Render necesitó un reinicio para recuperar HTTP; código y configuración siguen
igual. Un primer intento de alta agotó el tiempo sin devolver identidad/token y
su efecto queda sin confirmar: no afirmar limpieza total sin correlacionar logs/BD.
Después de recuperar la API, salud y todos los controles públicos pasan.

## Acceso y comandos

Alias estable:
`https://next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app`.
La clave de automatización ya está en el proyecto correcto `next-fit-q7uo`.
Conservar TLS, SSO y el encabezado limitado a ese hostname; no imprimir secretos.
Usar `/workspace/nextfit-setup/browser-venv/bin/python` y Chromium del sistema.
El acceso a los certificados del sistema requiere la ejecución autorizada.

```sh
python3 scripts/check-vercel-candidate.py --stable-alias --commit SHA_COMPLETO
/workspace/nextfit-setup/browser-venv/bin/python scripts/check-public-web.py --base-url https://next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app
```

Los controles públicos interceptan la API. La aceptación remota específica de
login/recarga ya pasó sobre el candidato indicado, y su lógica está en
`/tmp/nextfit-authenticated-preview-check.py`, sin credenciales guardadas.
Para futuras pasadas comprobar salud ANTES de crear cuentas y preparar recuperación
si un alta pierde la respuesta; nunca presumir que un timeout revierte la petición.
No ejecutar contra otra versión sin validar primero el candidato y su alias.

## Otros límites

Los avisos móviles de braces 3.0.3, node-forge 1.4.0 y sprintf-js hasta 1.1.3
siguen sin versión estable corregida identificada. No forzar Expo/Jest ni
silenciar avisos. El escáner dinámico de mapas acota el bundle JS, sin acreditar
seguridad del proceso de firma ni de bibliotecas nativas.

Correo real aplazado por el propietario: no hay dominio/remitente ni credencial
de proveedor; las pruebas de enlaces usan buzón local de memoria. iPhone físico,
Google/Apple nativos y Apple Developer siguen aplazados. API de ejercicios de pago
queda para el final. Mantener estos límites visibles al preparar la publicación.

Detalle histórico: [Pruebas generales](testing-general.md).


## Investigación del alta sin respuesta

Se comprobó el hostname PostgreSQL configurado en Render tanto en la ejecución
normal como autorizada fuera del sandbox: DNS no resuelve en ninguna. No hubo
conexión ni consulta de datos. `scripts/database/audit-preview-fixtures.sql`
prepara una transacción de solo lectura, con timeout de cinco segundos, que
selecciona únicamente id/correo de cuentas activas con los nombres exactos y
patrones de correo ficticio generados por el comprobador. No lee contraseñas ni
tokens y no modifica cuentas. No se ha ejecutado contra la base real.

Un resultado vacío resolvería la duda de cuentas activas con estos marcadores;
si aparecen filas, revisar solo esas identidades antes de aplicar su baja. No
borrar filas por un patrón genérico ni tratar un fallo de DNS como resultado vacío.
La auditoría móvil indica fixAvailable=false para braces y node-forge; para
sprintf-js propone cambios de consumidores, no una nueva versión directa fuera
del rango vulnerable. Mantener los tres avisos y su exposición documentados.


## Corrección móvil posterior

El interceptor reintentaba escrituras tras un timeout, pudiendo duplicar operaciones.
Se limita el reintento de transporte a GET/HEAD, una sola vez. Los reintentos por
401 autenticado conservan su comportamiento. Doce regresiones nuevas y la suite
completa pasan: 182 pruebas, 31 suites, también tras npm ci. No cambió el lockfile.
Las exportaciones Android/iOS nuevas y el escáner de mapas pasan en
`/workspace/nextfit-setup/mobile-retry-reviewed`. No se publicó una actualización
móvil ni se probó en teléfono; los avisos de herramientas siguen pendientes.


## Restauración inicial móvil: corrección posterior

La restauración inicial del proveedor y el logout descartan respuestas anteriores
a otra operación de cuenta. La persistencia se serializa/versiona; las lecturas
esperan las escrituras pendientes y una limpieza vieja no invalida una sesión nueva.
Se reprodujeron seis fallos previos; doce regresiones nuevas y toda la suite pasan:
194 pruebas en 32 suites. Exportación nueva Android/iOS y escáner de mapas correctos
en `/workspace/nextfit-setup/mobile-session-reviewed`. Sin cambio de SDK, lockfile,
publicación ni prueba física. Un logout sin respuesta remota limpia el dispositivo,
pero no acredita revocación en el servidor. Los pendientes de cierre no cambian.


## Renovación automática HTTP móvil

Las peticiones y las promesas de renovación quedan ligadas a la versión de cuenta;
las respuestas de una sesión anterior no se entregan, no sobrescriben credenciales
ni cierran un login posterior. La rotación de token de la misma cuenta mantiene
válidas las otras lecturas; los 401 simultáneos comparten renovación y persistencia,
y un 401 tardío reutiliza el token actualizado sin otra rotación. Nueve regresiones
con señales explícitas pasan (siete fallan con el interceptor anterior).

Suite móvil completa: 203 pruebas en 33 suites. Exportación Android/iOS y escáner
de mapas correctos en `/workspace/nextfit-setup/mobile-refresh-reviewed`. Sin
cambios de dependencias, publicación ni validación física. Los bloqueos de cierre
anteriores siguen vigentes.


## Cambios de sesión web posteriores al candidato desplegado

La web incorpora aislamiento por versión de cuenta en HTTP y restauración inicial,
y cancela peticiones anteriores que pueden modificar cookies al iniciar otro
acceso. Incluye confirmación de correo, baja local/social y cierre global.
La suite completa pasa con 460 pruebas en 65 archivos; lint y build correctos.
El recorrido H2 completo con --same-origin y la nueva prueba Chromium
`check-local-cookie-race.py` pasan: una respuesta de rotación de A liberada después
del login B no sustituye su cookie, y recargar conserva B. Los destinos de esa
prueba son loopback fijos, con marcador H2. Abortar no revierte cambios del servidor.
La preview previamente validada 7d24777 no incluye esta corrección; verificar el
SHA nuevo y su alias antes de atribuir aceptación remota.


## Candidato web vigente y verificado

`8be41d2ec410dd65b7259e7e3b2923d7a4000a7a`, READY
`dpl_2gGxQy49o12HLEnb13oBBb9G6A65`, tiene el alias estable y pasa metadatos,
doce controles públicos y login/recarga reales de cliente y entrenador. Las dos
cuentas temporales de esta pasada recibieron baja y revocación verificadas.
La prueba de carrera de cookie es local; no se atribuye esa inyección a la pasada
remota. Los cambios web de esta corrección sí están incluidos en este candidato.

Render volvió a agotar tiempos de espera aun figurando no suspendido. Tras un
único reinicio, sin cambios de código ni variables, salud y controles públicos
pasan. La recurrencia y su causa permanecen por investigar; no declarar producción
estable por una sola pasada correcta. No se crearon cuentas hasta confirmar UP.
La consulta del alta incierta de la continuación anterior permanece pendiente.

## Diagnóstico de disponibilidad, 21 de octubre

Consulta de solo lectura con la clave existente: el servicio sigue accesible por
la API de gestión y figura `not_suspended`. Se comprobaron las rutas y parámetros
del cliente oficial de Render: `/v1/logs` con `ownerId` y `resource`, y
`/v1/metrics/cpu` y `/v1/metrics/memory` con `resource`. Las tres devolvieron HTTP
403; corregir la ruta anterior de métricas no habilita el acceso. No atribuir
el fallo a memoria, CPU o PostgreSQL sin esa evidencia.

`check-production.py --timeout 15 --startup-timeout 45` volvió a fallar en la
primera petición de salud por timeout a los 45,1 segundos; los demás controles
no llegaron a ejecutarse. No se reinició el servicio, no se cambiaron variables
ni se crearon cuentas en esta comprobación. La disponibilidad sigue bloqueando
el cierre de la parte 7.

Control paralelo: la web de producción en Vercel respondió HTTP 200 en 0,4 s;
`/api/moderation/access` en Render agotó 15 s. Esta diferencia acota la incidencia
al acceso a la API y no demuestra por sí sola su causa interna.
