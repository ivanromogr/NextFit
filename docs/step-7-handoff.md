# Estado de cierre del paso 7

Última comprobación: 26 de octubre de 2026. Repositorio `ivanromogr/NextFit`, rama
`codex/mobile-ux`. Preservar el `app.json` raíz sin seguimiento. No fusionar main
ni contratar servicios. El paso 7 no está cerrado para publicación.

## Preview vigente: corrección de esperas HTTP

Commit de aplicación `4440f0bd00d32c022a8f77942a9849cac6439baa`, despliegue
`dpl_GkbyG48NwRJ2Tw5vvqL85sPpXB8A`, READY. El alias estable apunta ahora a este
despliegue y se verificaron proyecto, SHA y destino preview exactos. Se creó una
única preview manual, con API en el mismo origen, sin despliegue de producción.

Después de actualizar y verificar el alias, los doce controles públicos de
Chromium pasan sobre este candidato; salida en
`/tmp/nextfit-bounded-public-verified.log`. Una pasada anterior se ejecutó antes
de corregir el alias y no se atribuye al candidato nuevo. Esta comprobación
intercepta la API y no demuestra por sí sola acceso autenticado ni disponibilidad.
Posteriormente, con salud confirmada sin reinicio, el recorrido autenticado real
pasó también sobre este candidato: cliente y entrenador, identidad correcta,
panel privado y refresh con cookie tras recargar. Las dos cuentas ficticias de
esa pasada recibieron baja y rechazo posterior de login, JWT y refresh. Registro:
`/tmp/nextfit-final-authenticated-preview.log`, salida 0. El comprobador público
completo también pasó, con salud UP en 0,3 s. No hubo cambios de producción.

La sonda de Render agotó 210,1 s; dos sondas adicionales de una ruta anónima,
directa y mediante Vercel, agotaron 20 s. No hubo reinicio ni cambio de producción.
No se crearon cuentas al estar la API sin confirmar. La suscripción oficial de
logs `/v1/logs/subscribe` también devolvió HTTP 403, con cero mensajes: no hay
registros de diagnóstico ni evidencia de causa interna. GitHub Actions sigue sin
verificación remota porque su API devuelve Forbidden desde este entorno.

## Resultado de la pasada autenticada anterior, 21 de octubre

**Validación funcional completada; cierre para publicación bloqueado.** No pasar
al siguiente apartado presentando la aplicación como lista para publicar.

- Candidato de aplicación `8be41d2ec410dd65b7259e7e3b2923d7a4000a7a`:
  metadatos READY, proyecto, SHA y alias exactos verificados de nuevo.
- Doce controles públicos de navegador y dieciocho contratos del verificador,
  todos correctos. Son distintos de las 1.049 pruebas de aplicación registradas.
- Login y restauración de sesión reales de cliente y entrenador, correctos.
  Las dos cuentas ficticias de esta pasada se eliminaron; login, JWT y refresh
  posteriores rechazados para ambas. No se usaron cuentas personales.
- Tras confirmar el timeout, un único reinicio autorizado del mismo backend
  recibió HTTP 200 y quedó registrado por Render. La salud tardó 172,6 s en
  responder; después pasó el límite normal de 15 s. La comprobación desde la
  ejecución autorizada también agotó 45 s durante el arranque. Una pasada final
  volvió a superar todos los controles públicos, con salud en 0,2 s.
- El servicio ya tenía `/actuator/health` configurado como health check. No se
  alteraron código ni variables de producción, ni se contrató otro plan.

El arranque lento observado explica por qué una sonda de 45 s puede fallar tras
reiniciar; no demuestra la causa de la indisponibilidad anterior ni estabilidad
continuada. Para una futura comprobación tras arranque usar
`python3 scripts/check-production.py --timeout 15 --startup-timeout 210`:
solo la primera sonda tiene margen ampliado; las demás conservan 15 s.

Siguen pendientes la investigación de disponibilidad (logs/métricas HTTP 403),
los dos orígenes de avisos de herramientas móviles aún pendientes y la consulta
de la antigua alta ficticia sin respuesta. Las pruebas físicas en iPhone,
proveedores reales y demás aplazamientos mantienen su alcance anterior. Estas
limitaciones impiden afirmar un cierre definitivo para publicación.

## Completado

- Backend: 386 pruebas; web: 461 en 65 archivos; móvil: 203 en 33 suites. Total: 1.050.
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

## Historial de la corrección validada en Vercel

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


## Candidato anterior con aceptación autenticada

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


## Corrección adicional: dependencia vulnerable retirada

Se elimina la rama sprintf-js mediante un override revisado del lector YAML
usado por Istanbul, sin cambiar Expo/Jest. Auditorías instalada/lockfile: 45 altos,
0 moderados, 0 críticos; quedan braces y node-forge. Suite móvil 203/33, dos
pruebas del consumidor YAML, comprobación Expo, herramientas PBX y escáner correctos.
Exportación Android/iOS nueva en `mobile-yaml-reviewed`, comprobada contra la
nueva auditoría. Detalle y comandos: [Dependencias móviles](mobile-dependencies.md).

El 403 de logs/métricas se identificó como HTML de Cloudflare: “Sorry, you have
been blocked”, no como JSON de autorización de Render. No permite concluir que
la clave carezca de permisos ni que haga falta contratar otro plan. La API de
gestión del servicio sí funciona. No se intentó eludir el bloqueo de Cloudflare.
La consulta de la documentación pública sobre el plan Free falló por acceso de
red; no se atribuye una causa definitiva a las caídas a partir de esa consulta.


## Mitigaciones locales de los dos avisos restantes

Se reproducen y mitigan los fallos concretos de braces y node-forge, sin cambiar
sus versiones ni ocultar npm audit. El postinstall verifica versiones/hashes y
copias del lockfile antes de limitar anidamiento de patrones y exigir la estructura
anidada correcta de AlgorithmIdentifier. Instalación limpia verificada; seis
pruebas específicas y 203 móviles correctas. Exportaciones nuevas y escáner pasan
en `mobile-tooling-mitigated`. Auditoría: 45 altos, 0 moderados y 0 críticos.

Son mitigaciones propias acotadas, no versiones oficiales corregidas ni aceptación
independiente de toda la cadena criptográfica. Si se omiten scripts de instalación,
no están aplicadas; ejecutar postinstall y la comprobación explícita antes del uso.
No se da por cerrado el permiso de publicación por estas pruebas. Reproducción,
limitaciones y retirada futura en [Dependencias móviles](mobile-dependencies.md).

## Control automático de regresiones móviles

`.github/workflows/mobile-checks.yml` configura instalación desde lockfile,
comprobación de mitigaciones, seis regresiones de seguridad, consumidores YAML/PBX,
escáner y suite móvil. Se activa para cambios móviles de la rama candidata/main,
pull requests y ejecución manual. Permisos de solo lectura, sin secretos de
proveedores, sin despliegue, sin build firmada, con timeout de 15 minutos y
cancelación de ejecuciones reemplazadas. YAML validado localmente. La ejecución
remota debe verificarse por separado; configurar el workflow no demuestra que haya
pasado en GitHub. El resultado no certifica auditoría npm ni cierre de publicación.

Verificación de esta continuación: push del workflow correcto en `2b444ad`;
`gh run list` falla por Forbidden al consultar api.github.com desde este entorno,
por lo que no se atribuye una ejecución remota satisfactoria. La sonda pública de
Render agotó 210,2 s sin respuesta y no ejecutó controles posteriores. No hubo
reinicio, cambio de configuración ni alta de cuentas. El margen ampliado tampoco
basta para explicar todas las incidencias como un arranque lento; disponibilidad
sigue abierta y no se afirma que la automatización la resuelva.


## Esperas HTTP web acotadas y nueva comprobación de disponibilidad

La instancia Axios web general usa ahora timeout de 30 segundos: las peticiones
que no usan cookiePost/cookieDelete también dejan de esperar indefinidamente.
Los accesos y mutaciones de cookie conservan sus 15 segundos. No se añade ningún
reintento automático de transporte a escrituras ni lecturas.

Prueba con servidor HTTP loopback real sin respuesta: GET y POST de recuperación
agotan sus 30 segundos, se observa una sola petición de cada uno y un nuevo
intento explícito puede completar cuando el servidor responde. Suite completa:
461 pruebas en 65 archivos; lint y build con manifest correctos. Backend/móvil no
cambian: el total de pruebas de aplicación registradas pasa a 1.050.

Render volvió a responder sin otro reinicio en esta continuación. La ruta anónima
de moderación devuelve 401 tanto directamente como a través del proxy de Vercel,
ambas en 0,6 s. Salud UP en 0,2 s y comprobador público completo correcto. Esto
acredita recuperación actual, no causa conocida ni estabilidad continua. No se
crearon cuentas ni se modificó la configuración de producción. La corrección de
cliente no elimina la indisponibilidad del backend.


## Dictamen vigente de la parte 7

**Aceptación funcional del candidato completada; publicación NO APROBADA.**
1.050 pruebas de aplicación registradas; aceptación de navegador pública y
sesión real de ambos perfiles sobre 4440f0b. Esto no elimina los siguientes límites:

1. Disponibilidad intermitente de Render sin diagnóstico: hay timeouts de 210 s,
   recuperación posterior y falta de acceso a logs/métricas. No afirmar causa ni
   estabilidad continua, ni proponer un plan de pago como solución demostrada.
2. Dos avisos de origen móviles con mitigaciones locales probadas y verificadas
   tras instalación limpia; no hay versiones oficiales corregidas identificadas
   ni revisión independiente de toda la cadena de herramientas.
3. Comprobación de la antigua alta ficticia: RESUELTA el 26 de octubre. El
   propietario ejecutó en DBeaver la consulta de solo lectura sobre NextFit y
   aportó captura: cliente 0, entrenador 0. No hay cuentas activas con los nombres,
   apellidos y patrones de email exactos generados por el comprobador. No acredita
   que nunca se crearan ni que no existan filas inactivas; no hace falta borrado.
4. Workflow publicado; consulta remota de su resultado bloqueada por Forbidden.
   La validación local no se atribuye a una ejecución de GitHub Actions.

No repetir pasadas correctas ni reiniciar como sustituto de estos pendientes.
Para continuar el cierre hacen falta evidencia de operación del proveedor,
acceso de solo lectura a la base y verificación remota del workflow, conservando
las restricciones de secretos, cuentas personales y servicios de pago.


## Registro actual aportado por el propietario, 26 de octubre

El fragmento de 09:21–09:25 UTC muestra un arranque correcto del perfil Render:
Hikari añade una conexión PostgreSQL y termina de iniciar; JPA se inicializa;
Tomcat escucha en 10000; Spring informa 177,099 s de arranque (187,732 s de
proceso). DispatcherServlet se inicializa y el broker sigue disponible. No hay
ERROR, excepción fatal ni OutOfMemory en este fragmento. Las advertencias de
commons-logging, dialecto y AuthenticationProvider no impiden este arranque.

Tras recibirlo, `check-production.py --timeout 15` pasa por completo, con salud
UP en 0,2 s, rechazos anónimos, CORS exacto/no confiable y credencial Google
inválida. No se reinició ni se cambió configuración o código de producción.

Se acredita un escenario de indisponibilidad durante el arranque de casi tres
minutos, superior a los límites de las peticiones del cliente. No atribuir sin
correlación temporal todos los timeouts anteriores, especialmente los de 210 s,
a ese escenario; este registro no contiene el periodo anterior al inicio del
proceso ni acredita estabilidad continua. No hay evidencia aquí que justifique
cambiar JWT, el esquema de PostgreSQL o contratar otro plan.

## Aislamiento del bloqueo de acceso a PostgreSQL, 26 de octubre

Se comprobó un control de DNS: api.render.com y registry.npmjs.org también
fallan con EAI_AGAIN, mientras sus consultas HTTP mediante HTTPS_PROXY funcionan.
El control fuera del sandbox vuelve a fallar tanto para Render API como para el
hostname PostgreSQL. El error de resolución no demuestra que la base esté mal
configurada o que su nombre público no exista. No pedir cambiarlo basándose solo
en esta evidencia. La conexión interna PostgreSQL sí aparece correcta en el
registro de arranque aportado por el propietario.

Se retiró la petición de hostname al usuario tras identificar ese control. La
consulta de solo lectura preparada debe ejecutarse desde una conexión disponible,
como DBeaver; no se ha conectado a la base desde este entorno. Revisión actual de
npm: braces 3.0.3 y node-forge 1.4.0 siguen siendo latest. GitHub Actions sigue
sin resultado remoto accesible desde aquí. No hubo cambios en producción.


## Evidencia de la consulta de fixtures, 26 de octubre

Captura aportada por el propietario desde DBeaver, conexión nextfit_db_pixm,
resultado de la consulta UNION ALL de conteo: cliente=0, entrenador=0. La consulta
filtra nombre BetaPreview, apellido Temporal, patrón específico por rol con 20
caracteres hexadecimales y dominio example.invalid, active=true y deleted_at NULL.
Se cierra la duda de cuentas activas coincidentes con esos marcadores. Es evidencia
aportada por el propietario; no se atribuye una conexión ni ejecución desde Codex.
No se consultaron credenciales o hashes ni se modificaron registros para esta
verificación. Se conserva la consulta anterior de identificación para auditoría;
no ejecutarla de nuevo sin una necesidad nueva.

Una URL de conexión compartida anteriormente incluía credencial. No se copia aquí
ni se almacena en el repositorio. Su rotación y actualización coordinada en los
consumidores queda pendiente de confirmación, sin atribuir una rotación realizada.


## Rotación de credencial: nueva conexión aplicada y validada, 26 de octubre

El propietario creó una credencial PostgreSQL nueva en Render y actualizó
SPRING_DATASOURCE_USERNAME/PASSWORD del servicio con Save only. Se confirmó por
API, sin imprimir valores, que el usuario dejó de ser el original y había una
contraseña configurada. La URL JDBC no contiene credenciales incrustadas y los
indicadores de salud de base de datos no están deshabilitados explícitamente.

Se desplegó una sola vez el mismo backend
`d3b366b6ccb1873cbe2507badb1b8bf7e4ae5fac`, conservando caché:
`dep-dbfiaqgm7kps7397lho0`. Terminó live. Salud UP en 0,4 s y todos los controles
públicos correctos. No se publicó código backend nuevo.

Se verificó de nuevo el candidato/alias web exacto 4440f0b y se ejecutó el recorrido
autenticado con ambos perfiles usando el backend nuevo: registro, login, lectura
del panel y refresh al recargar correctos. Las dos cuentas ficticias se eliminaron;
login, JWT y refresh posteriores rechazados. Salida 0 en
`/tmp/nextfit-credential-rotation-acceptance.log`. Esta pasada aporta evidencia de
lectura y escritura con la credencial nueva, además de la comprobación de salud.

La credencial original NO se ha revocado desde Codex: la API de credenciales de
PostgreSQL sigue devolviendo 403. Falta que el propietario actualice su conexión
DBeaver y elimine la credencial antigua en Credential Rotation, conservando la
nueva marcada Default. No declarar revocación ni cierre de la exposición hasta
recibir confirmación/evidencia de esa retirada. No se guardan contraseñas ni URLs
de conexión con credenciales en el repositorio.
