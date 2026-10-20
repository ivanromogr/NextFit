# Paso 7: pruebas generales

Revisión del 20 de octubre de 2026. Rama `codex/mobile-ux`.

## Estado

La verificación automatizada local está completada con los resultados siguientes.
El paso 7 **no se declara cerrado para publicación**: quedan los avisos de
seguridad móviles y la aceptación de la versión definitiva desplegada. La prueba
física en iPhone corresponde además a los pasos 6 y 9 aplazados.

| Comprobación | Resultado verificado |
|---|---|
| Backend, Maven verify | 374 pruebas, cero fallos/errores/omisiones; JAR generado |
| Web, suite completa | 394 pruebas en 60 archivos, todas correctas |
| Móvil, suite completa con preset SDK 54 | 170 pruebas en 30 suites, todas correctas |
| Compilación web | Vite de producción con manifest, correcta |
| Compatibilidad Expo | `expo install --check`: dependencias actualizadas para SDK 54 |
| Exportaciones móviles | Android/iOS Hermes correctas con Babel SDK 54; no son builds firmadas |
| Lint web | Cero errores y cero avisos |
| Auditoría npm web | Cero avisos después de actualizaciones compatibles |
| Auditoría npm móvil | 50 avisos: 45 altos, 5 moderados, cero críticos |
| Navegador con API real local | Cliente a 390 px y entrenador a 1365 px; entrenamientos, calendario, progreso con recuperación y chat entre dos sesiones independientes completados |
| Carga web y recuperación | Guardas, registro bajo demanda y recuperación de chunk fallido, a 390×844 y 1365×900 |
| Producción actual | Pasada final correcta: salud UP, protección anónima, CORS con credenciales y rechazo de Google inválido. Producción conserva su revisión anterior; el último commit funcional carece de preview por cuota Vercel |
| Comprobador de producción | Seis pruebas de contrato aisladas correctas, además de la pasada HTTP real |
| Identidad de preview Vercel | Seis pruebas de contrato; una preview anterior READY verificada por metadatos. No equivale a aceptación de la última versión |

Las suites de backend, web y móvil suman **938 pruebas correctas**. Los ensayos de navegador son evidencia
adicional, no se suman a ese recuento. Las ejecuciones de backend/web y el ensayo
local se realizaron durante la revisión del 19 de octubre UTC; se repitieron las
comprobaciones móviles tras alinear sus dependencias en la continuación del día 20.
La suite web se volvió a ejecutar completa el día 20 tras corregir los adjuntos:
327 pruebas correctas en 60 archivos; la revisión posterior de confirmación y
reconexión vuelve a ejecutar la suite completa con 331 casos correctos. La
recuperación posterior de historial e imágenes la eleva a 336 casos correctos;
la revisión de las listas de conversaciones termina con 346 casos correctos.
La revisión posterior de progreso termina con 353 pruebas web correctas;
la de listas del entrenador eleva la suite a 361 casos correctos. La revisión
del panel termina con 369 pruebas web correctas; la edición de perfiles eleva
la suite a 381 casos correctos. El alta y la navegación al chat completan
la suite con 394 casos correctos.

## Errores corregidos durante la pasada completa

- El fichaje de atletas normaliza espacios y mayúsculas del correo igual que el
  registro. La prueba unitaria y el recorrido HTTP usan un correo con ambos casos.
- Los lectores de vídeos de creación, edición y sesión toleran `videoUrl: null`.
  Las pruebas anteriores usaban el campo ausente y no detectaban esa respuesta
  real del servidor. Los fixtures incluyen ahora nulos explícitos.
- El generador deriva el ID de la sesión sin un estado redundante; desaparece el
  error de lint correspondiente.
- Las pruebas antiguas del resumen se actualizan al contrato por evento, en lugar
  de seguir simulando la última sesión de la rutina.
- Las pruebas de baja de cuenta esperan las actualizaciones asíncronas después de
  renderizar y reinician sus mocks entre casos. Los tiempos de espera de las
  suites se adaptan a la carga del ejecutor compartido, conservando las aserciones.
- Se excluye de lint el informe generado de cobertura.

## Ensayo con aplicación real

`scripts/check-local-beta.py` usa la web compilada y la API en localhost. Crea tres
cuentas ficticias con correo `example.invalid` y contraseña aleatoria en H2:
cliente, otro cliente sin permisos y entrenador. No usa cuentas reales.

Comprueba registro, vinculación entrenador/atleta, rutina asignada, dos eventos y
dos sesiones distintas; un tercero recibe 403 y la petición anónima 401. En el
navegador comprueba login y renovación de cookie después de recargar, creación
manual con 35,5 kg, edición común de series con 37,5 kg, registro de entrenamiento,
consulta de rutinas por el entrenador y resultados del primer evento sin mostrar
los del segundo. Esos recorridos usan endpoints reales. La recuperación del chat
añade respuestas 503 deliberadas en el navegador para una fuente de contactos
de cada perfil, el historial y una imagen. Progreso añade un 503 en cada una de
sus cuatro secciones para ambos perfiles; todos esos reintentos vuelven a la API
real. Las listas de atletas y plantillas añaden también un 503 inicial por
pantalla y recuperación contra la API real. El panel añade fallos iniciales
de atletas y resumen, un refresco fallido y recuperación al volver a enfocarlo.
Los perfiles añaden fallos controlados de carga y guardado; sus reintentos usan
la API real y verifican los datos persistidos. El alta del entrenador añade
un guardado fallido y un reintento real, con lectura posterior del perfil.
Se bloquean conexiones a servicios externos.

El arranque de prueba no hereda credenciales de proveedores ni configuración de
despliegue. Usa H2 en memoria, almacenamiento local temporal y correo/proveedores
sociales/limpieza automática desactivados. La sesión de Spring se ejecuta con
`open-in-view=false`. Al detenerla desaparece la base de datos de este ensayo.
No conectar estos scripts a una base real ni publicar sus puertos.

Requisitos: JDK 21, Maven verify previo, dependencias npm instaladas, Python con
Playwright y Chromium en `/usr/bin/chromium`.

1. Ejecutar `verify` con el wrapper en `Backend/backend/library`.
2. Desde la raíz, iniciar `python3 scripts/start-local-beta.py --java-home RUTA_JDK_21`.
   Mantener el proceso hasta finalizar el ensayo.
3. En `Frontend/AplicacionFrontend`, compilar con
   `VITE_API_URL=http://127.0.0.1:18080 VITE_WS_URL=http://127.0.0.1:18080 npm run build -- --manifest`.
4. Iniciar `npm run preview -- --host 127.0.0.1 --port 4181 --strictPort`.
5. Desde la raíz, ejecutar `python3 scripts/check-local-beta.py` y después
   `python3 scripts/check-web-loading.py`. No reconstruir `dist` mientras se prueba.
6. Detener ambos servidores al terminar. El build local apunta a localhost y no
   debe desplegarse; producción se compila con sus propias variables.

## Dependencias y límites de la evidencia

Se aplicó `npm audit fix --ignore-scripts` sin `--force` en ambos clientes. La web
queda sin avisos. En móvil desaparecen los críticos observados, pero el árbol
sigue señalando avisos que alcanzan Expo, Metro, Jest y dependencias transitivas.
Se mantiene Expo 54 y React Native 0.81.5. Se alinean Image Picker, el generador
aleatorio y Babel con las versiones esperadas para ese SDK, sin duplicar el preset
en dependencias de desarrollo y ejecución.

El siguiente trabajo de seguridad requiere revisar cada aviso y su exposición,
actualizar lo compatible y preparar una migración del SDK cuando sea necesaria.
Las recomendaciones automáticas de cambiar versiones mayores no se aplican a
ciegas. La salida de auditoría no identifica por sí sola qué funciones de cada
paquete son alcanzables en el binario distribuido. Los avisos siguen abiertos.

No se han verificado con proveedores reales Google/Apple nativos, revocación
externa de Apple, correo transaccional ni la API de ejercicios de pago aplazada.
Tampoco se ha restaurado una copia de PostgreSQL de producción o instalado una
build firmada en iPhone. La suite de backend sí incluye transporte WebSocket/STOMP
real aislado para entrega, bloqueo y denuncia; el recorrido nuevo de navegador se
centra en entrenamientos y calendario.

No se ha fusionado con main ni desplegado esta revisión. Los pasos 5, 6, 8, 9 y
10 conservan sus pendientes; AI Coach sigue aplazado.

El recorrido reproducible y las exportaciones Android/iOS se completaron también en
la pasada final del día 20. Los servidores temporales de API y preview se detuvieron
al finalizar; no se publica un entorno de prueba ni se conservan sus usuarios en producción.

## Revisión posterior de dependencias móviles

Se acotan overrides para WebSocket 7 y PostCSS 8, manteniendo Expo 54 y React
Native 0.81.5. La auditoría baja de 61 a 59 avisos, sin críticos. Los avisos
restantes, versiones contrastadas y límites se registran en
[Dependencias móviles](mobile-dependencies.md). No se elimina ese bloqueo del cierre
para publicación.

La continuación del 20 de octubre actualiza también la cohorte Metro dentro de
0.83 y retira el lector de imágenes vulnerable. La auditoría móvil queda en 58
avisos (45 altos, 13 moderados, cero críticos), manteniendo 170 pruebas correctas
y la compatibilidad declarada con Expo 54.

Las exportaciones Hermes Android/iOS de la cohorte Metro 0.83.8 también se completaron.
Son verificaciones adicionales de la herramienta de compilación; la aceptación
física y el cierre de los avisos restantes siguen pendientes.

### Herramientas iOS y análisis de artefactos

La actualización acotada de UUID para `xcode` deja la auditoría móvil en 50 avisos
(45 altos, 5 moderados, cero críticos). La suite móvil mantiene sus 170 casos;
una prueba adicional de lectura/modificación/escritura PBX pasa fuera de Jest.
Los mapas de las exportaciones Android/iOS confirman que los tres paquetes de
origen de los avisos restantes no forman parte de esos bundles JavaScript.
El análisis acota la exposición del artefacto, mantiene los avisos de herramientas
abiertos y no sustituye las validaciones físicas y de despliegue pendientes.
Ver [Dependencias móviles](mobile-dependencies.md).

## Comprobación del 20 de octubre: límites del cierre

La API de Render confirma que el último despliegue del servicio NextFit
(`srv-d772eof5r7bs73e4ffe0`) continúa en estado `live`, terminado el 19 de octubre.
La consulta HTTP de salud posterior agota su espera de 45 segundos. El script
se detiene en esa primera comprobación: las verificaciones posteriores de CORS,
moderación y rechazo de credenciales Google no se ejecutaron en esta pasada.
El estado del despliegue no demuestra que el servicio responda correctamente.
No se ha modificado ni reiniciado el servicio durante esta comprobación.

El registro npm sigue publicando como últimas versiones estables `braces@3.0.3`,
`node-forge@1.4.0` y `sprintf-js@1.1.3`, incluidas en los rangos de los avisos ya
analizados. No se repiten las suites completas porque esta continuación solo
actualiza documentación y consulta el estado externo; permanecen los resultados
locales anteriores, con sus límites de alcance.

Para completar la aceptación final falta probar la versión candidata desplegada,
resolver o revisar la exposición de las herramientas pendientes y realizar las
pruebas físicas aplazadas. La integración de ejercicios de pago sigue reservada
para el final, antes de publicar la aplicación.

## Chat con dos navegadores y API real local

El ensayo `scripts/check-local-beta.py` abre dos contextos independientes de
Chromium con las cuentas ficticias de cliente y entrenador. Usa el transporte
SockJS/STOMP y la API reales del servidor H2 temporal. Los fallos HTTP
controlados añadidos posteriormente se describen en el apartado de recuperación;
los mensajes STOMP proceden del servidor real:

- Mensaje del atleta recibido por el entrenador y respuesta recibida por el atleta.
- Denuncia de un mensaje recibido: selección de motivo y respuesta HTTP 202.
- Bloqueo desde el cliente: respuesta HTTP 200, editor deshabilitado y estado
  `canSend=false` para el entrenador consultado directamente en la API.
- Desbloqueo y entrega de un nuevo mensaje.
- Recarga del chat del entrenador y recuperación de los tres mensajes guardados.

Este recorrido amplía la comprobación anterior de entrenamientos y calendario.
No añade casos al recuento de las suites unitarias ni acredita comportamiento
físico en iPhone. No prueba archivos adjuntos o reconexión tras pérdida de red.
Se ejecuta con cuentas `example.invalid` y no escribe en producción.

### Bloqueo aplicado por el servidor y aislamiento de cuentas

La ampliación del ensayo del 20 de octubre prepara un mensaje en el navegador del
entrenador antes de que el atleta bloquee el chat. El envío posterior recibe el
rechazo real del servidor por STOMP; el navegador muestra el error y deshabilita
el editor. El historial consultado por HTTP conserva su número de mensajes y no
contiene el texto rechazado; tampoco aparece en el navegador del atleta. Esto
comprueba el bloqueo aunque el emisor conserve temporalmente un estado anterior.

Con la tercera cuenta ficticia, sin relación con esa conversación, se verifican
respuestas 403 al consultar el historial por ambos formatos de parámetros,
denunciar el mensaje recibido por otra cuenta e intentar bloquear al entrenador.
El remitente tampoco puede denunciar su propio mensaje. El entrenador recibe 403
al consultar denuncias de moderación porque no es operador interno. No se
conceden permisos ni se usa una cuenta real en este ensayo.

El recorrido completo de entrenamientos, calendario y chat termina correctamente
con estas comprobaciones adicionales; las suites anteriores conservan su recuento
de 865 casos. El código de aplicación no necesitó cambios para estos escenarios.

## Adjuntos privados y recuperación de subidas

La continuación del paso 7 detecta y corrige un fallo de presentación: la subida
fallida conservaba el archivo y el comentario, pero solo escribía el error en
consola. El chat muestra ahora un aviso para fallos de servicio, exceso de tamaño
y formato no admitido; permite reintentar conservando el borrador. El formato
rechazado se reconoce también mediante el código real `UNSUPPORTED_FILE_TYPE`
devuelto con HTTP 400 por el backend. El selector ofrece JPEG, PNG y WebP, los
formatos admitidos por el servidor.

Cambiar de conversación durante una subida libera el editor de la nueva
conversación y descarta el éxito o error tardío de la anterior. El adjunto anterior
no se publica al nuevo destinatario. Esto no garantiza el borrado inmediato de un
archivo que el servidor ya haya recibido antes de cambiar de conversación.

Las seis pruebas de regresión añadidas cubren cuatro respuestas de error con
conservación/reintento y dos resoluciones tardías después de cambiar de contacto.
Las 19 pruebas del componente pasan. El ensayo de navegador con API real verifica:

- Rechazo de un archivo falso por su contenido, sin confiar en su nombre/MIME.
- Aviso visible y comentario conservado; sustitución por un PNG sintético válido.
- Subida multipart real y mensaje con un identificador de adjunto privado.
- Imagen descargada y decodificada por el navegador del destinatario.
- Descarga exacta de los mismos bytes por ambos participantes, con `no-store` y
  `nosniff`; cuenta ajena y acceso anónimo reciben HTTP 403.

Se utiliza almacenamiento local temporal y H2 ficticio. Este ensayo no vuelve a
verificar Cloudinary ni demuestra persistencia tras recrear una instancia. El
recorrido completo previo de rutinas, calendario y seguridad del chat también
pasa con el código corregido.

Validación final de esta corrección: suite web completa con **327 pruebas en 60
archivos**, todas correctas; build Vite con las variables explícitas de API/WS
locales, correcto; lint con cero errores y los ocho avisos anteriores. Backend
(374) y móvil (170) conservan sus verificaciones previas: no se vuelven a ejecutar
porque esta corrección solo cambia el cliente web y el ensayo. El total de las
suites pasa a 871; el recorrido integrado sigue contabilizado por separado.
Los servidores temporales se detuvieron y el PNG sintético se eliminó al terminar.
No se despliega esta compilación local ni se modifica producción.

## Confirmación de mensajes y reconexión

La revisión siguiente detecta que el chat vaciaba el editor inmediatamente después
de publicar al socket, antes de conocer el resultado del servidor. El borrador y
el adjunto se conservan ahora mientras se espera el eco del mensaje. Durante esa
espera se bloquea un segundo envío y la modificación del editor. Se muestra un
estado accesible de espera; el mensaje solo aparece en el historial cuando llega
desde el servidor.

El eco se reconoce por remitente, destinatario, texto normalizado y adjunto. Al
rechazarse el envío se desbloquea la espera y se conserva el borrador. Si falla la
publicación local, se corta el socket o transcurren 15 segundos sin confirmación,
el aviso explica que debe comprobarse el historial antes de reenviar. El cliente
no reenvía automáticamente un mensaje de resultado incierto. Esto no implementa
idempotencia del servidor ni una garantía de entrega exactamente una vez; tampoco
persiste el borrador si se recarga o abandona la pantalla.

La reconexión vuelve a consultar historial y permisos, combinando los mensajes
por identificador y ordenándolos por fecha para recuperar lo recibido durante el
corte sin sustituir mensajes recién llegados por una respuesta anterior.

Las 23 pruebas focalizadas pasan: incluyen confirmación frente a un mensaje ajeno,
rechazo conservando el borrador, excepción al publicar, desconexión/reconexión sin
reenvío y espera agotada. El ensayo integrado conecta dos navegadores a la API
real local. Playwright actúa como puente hacia el servidor WebSocket real y cierra
solo los sockets del atleta; no fabrica mensajes ni respuestas STOMP. Mientras
el atleta está desconectado, el entrenador envía un mensaje. Tras reconectar, el
atleta recupera ese mensaje, conserva su borrador y confirma que no se ha enviado
hasta pulsar el botón explícitamente. El eco real vacía entonces el editor.

El recorrido previo completo de entrenamientos, calendario, bloqueo/denuncia y
adjuntos privados también termina correctamente. El build web pasa con las
variables explícitas de localhost. La API/preview temporales se detienen y se
elimina el PNG ficticio al terminar. No se valida una interrupción física de red
en iPhone, suspensión de la aplicación, firma nativa ni el despliegue candidato.

Validación final de confirmación/reconexión: **331 pruebas web en 60 archivos**,
todas correctas; build final correcto y lint con cero errores y los ocho avisos
previos. El selector de emojis se cierra al empezar la espera para evitar cambios
en el borrador pendiente. Las verificaciones anteriores de backend (374) y móvil
(170) conservan su alcance; no se vuelven a ejecutar porque solo cambia la web.
El total de las suites es 875, además de los ensayos de navegador y la prueba de
herramientas iOS contabilizados por separado. La aceptación de la versión
final desplegada, la prueba física aplazada y los avisos móviles siguen pendientes.

## Recuperación del historial y las imágenes del chat

La continuación del paso 7 reproduce cinco fallos mediante pruebas nuevas: el
historial fallido aparecía como conversación vacía, una respuesta con formato
incorrecto podía romper el renderizado, la descarga fallida no mostraba ninguna
imagen ni explicación, un error de decodificación carecía de recuperación y una
descarga terminada después de abandonar el chat creaba una URL de objeto que ya
no se liberaba. Las cinco pruebas fallan antes de la corrección y pasan después;
las 28 pruebas focalizadas del componente terminan correctamente.

El historial diferencia carga, error y vacío confirmado. Un fallo conserva los
mensajes que ya estaban visibles, advierte de que podrían estar incompletos y
ofrece «Reintentar historial» sin borrar el borrador. Se valida que la respuesta
sea un array antes de actualizar React y se descartan respuestas obsoletas de
cargas anteriores. El saludo automático permanece pendiente mientras no se
conozca el historial.

Los adjuntos muestran carga, error y «Volver a cargar imagen». El reintento sigue
usando el endpoint autenticado; no abre ni publica una URL del proveedor. Las URLs
de objeto se liberan al reintentar o abandonar la pantalla y no se crean para una
respuesta que llega después del desmontaje.

El ensayo integrado fuerza una única respuesta HTTP 503 del historial y otra de
la imagen en el navegador del entrenador. Son fallos simulados deliberadamente;
las recuperaciones vuelven a los endpoints reales, comprueban los mensajes y la
imagen decodificada. El resto de registro, entrenamientos, calendario, bloqueo,
denuncia, descargas autorizadas y reconexión usa la API H2 y STOMP reales y también
pasa. Esto no mide una caída real de Cloudinary, latencia de redes móviles o una
recuperación del despliegue de producción.

El build de localhost pasa. Los servidores temporales se detienen y se elimina
la imagen ficticia al terminar el ensayo.

Validación final de recuperación: **336 pruebas web en 60 archivos**, todas
correctas; build Vite correcto y lint con cero errores y los ocho avisos anteriores.
Las verificaciones previas de backend (374) y móvil (170) se mantienen porque esta
corrección solo cambia la web. El total de las suites es 880; ensayos de navegador
y prueba de herramientas iOS se contabilizan por separado. Los avisos móviles y
la aceptación del despliegue/dispositivo definitivo conservan sus pendientes.

## Recuperación de las listas de conversaciones

La revisión posterior añade diez regresiones sobre las dos páginas de chat. Las
18 pruebas focalizadas pasan: cubren fallos parciales y totales de las fuentes,
reintento conservando búsqueda/chat/borrador, JSON local dañado, lectura o escritura
de caché no disponibles, deduplicación del entrenador y mensajes recibidos en la
conversación ya seleccionada.

Ambos perfiles consultan sus fuentes de forma independiente. Se conservan los
contactos disponibles cuando falla otra fuente y se muestra un aviso con
«Reintentar conversaciones». Durante el reintento no se desmonta el chat seleccionado
ni se ocultan los contactos ya cargados. Una carga antigua que termine después de
otra petición o del desmontaje no actualiza la lista. La lista vacía del entrenador
solo se presenta como confirmada si ambas fuentes cargan correctamente.

En cliente, la caché de contactos es opcional: se ignora JSON inválido o registros
incompatibles y los errores de almacenamiento del navegador no impiden usar la
API. Se mantienen los alias conocidos y se retira el entrenador de los contactos
secundarios cuando se confirma su identidad. Los callbacks del socket consultan
la selección y el entrenador actuales, evitando la marca de conversación nueva
para el chat ya abierto y la duplicación del entrenador por un mensaje recibido.
Esto no añade notificaciones en segundo plano ni prueba la suspensión de iOS.

El recorrido integrado provoca una respuesta HTTP 503 de la fuente de perfil del
cliente y otra de atletas asignados del entrenador. La fuente de contactos real
permite abrir la conversación en ambos casos. El ensayo escribe un borrador,
reintenta contra la API real y verifica que el editor conserva su contenido sin
reenviarlo. Continúan pasando todos los pasos previos de entrenamientos,
calendario, permisos, bloqueo/denuncia, imágenes y reconexión.

El fallo inicial de este nuevo manejador de red en el ensayo se corrigió para
aceptar los argumentos de Playwright; la pasada final completa termina correctamente.
El build final pasa, el entorno temporal se detiene y la imagen ficticia se elimina.
La corrección solo modifica la web y las comprobaciones locales; producción y
los proveedores de pago conservan su estado anterior.

Validación final de listas de conversaciones: **346 pruebas web en 60 archivos**,
todas correctas; build Vite correcto y lint con cero errores y siete avisos. La
carga del entrenador mantiene callbacks estables y actualiza React al resolverse
las peticiones; no se desactivan reglas para obtener ese resultado. Backend (374)
y móvil (170) conservan sus verificaciones anteriores porque solo cambia la web.
El total de las suites es 890, además de los ensayos de navegador y la prueba de
herramientas iOS contabilizados por separado. No se eliminan los pendientes de
avisos móviles, dispositivo físico y aceptación del despliegue definitivo.

## Diagnóstico y recuperación observada de producción

La revisión posterior encuentra el mismo despliegue de NextFit marcado `live`,
sin suspensión y con plan gratuito. La web devuelve HTTP 200. Las consultas
iniciales a salud, `/api` y moderación agotan sus esperas; una consulta de salud
con margen de 220 segundos también termina en timeout. Los registros de Render
siguen devolviendo HTTP 403 a la sesión. La configuración guardada del entorno ya
incluye los dominios necesarios; no se amplía la red ni se solicitan claves nuevas.

Después, sin reiniciar, desplegar ni cambiar configuración, la API vuelve a
responder. La consulta de salud por curl devuelve HTTP 200 y JSON `UP` en menos de
un segundo. El comprobador completo termina correctamente y mide su salud en
0,4 segundos. Esto confirma disponibilidad en esa pasada; no demuestra la causa
de la espera anterior, estabilidad continua ni aceptación de la rama candidata.

El comprobador `scripts/check-production.py` conserva el timeout normal de 45
segundos y añade diagnóstico legible con salida distinta de cero al fallar, sin
volcar cuerpos inesperados. Comprueba ahora además que CORS admite credenciales
y `Authorization` para el origen exacto, y que un origen ajeno no recibe permiso.
El login público de Google debe rechazar la credencial inválida con
`INVALID_GOOGLE_TOKEN`, en lugar de exigir una sesión previa.

Una opción `--startup-timeout` permite ampliar solo la primera consulta de salud;
si se usa un valor diferente, exige otra consulta con el timeout normal antes de
continuar. No convierte la lentitud en un resultado de disponibilidad continua.

```sh
python3 scripts/check-production.py
# Solo para investigar un arranque: comprobar después la respuesta normal.
python3 scripts/check-production.py --startup-timeout 220
python3 -B -m unittest discover -s scripts/tests -p 'test_check_production.py' -v
```

Las seis pruebas aisladas del comprobador pasan: contrato correcto, CORS sin
cookies, origen ajeno reflejado, Google que exige sesión, timeout al leer el cuerpo
y separación entre tiempo inicial y tiempo normal. Se contabilizan aparte de las
890 pruebas de la aplicación. La pasada HTTP real también pasa con salud UP,
tres endpoints protegidos sin sesión, ambos controles de CORS y Google inválido.
No crea usuarios ni modifica sus datos y no valida un login social real.


## Recuperación y coherencia de progreso (20 de octubre)

Los errores de estadísticas, récords, ejercicios y gráfica ya no se convierten
en ceros o listas vacías. Cada sección ofrece su propio reintento sin reiniciar
las demás. La gráfica se asocia al atleta y ejercicio seleccionados; se ignoran
respuestas tardías del anterior. El catálogo solo se consulta cuando el historial
se ha obtenido correctamente y está vacío.

Se corrige la unidad duplicada del volumen: el servidor entrega, por ejemplo,
`1t` y ahora se representa una sola «t». Se conserva el redondeo del servidor
a toneladas y horas enteras; esta revisión no aumenta su precisión.

Siete regresiones nuevas fallaban antes de la corrección. Las doce pruebas
focalizadas de progreso pasan después. El recorrido de navegador con API local
real verifica tres sesiones guardadas para el cliente y dos bajo el entrenador,
récord de 50,5 kg, volumen igual al de la API y ausencia de desbordamiento horizontal
a 390 px. Una sesión guardada cuenta aunque no tenga series marcadas como
realizadas; el volumen solo suma las series realizadas, según el contrato actual.

Se fuerzan cuatro fallos HTTP 503 por perfil (totales, récords, ejercicios y gráfica)
y se recuperan mediante reintentos contra la API real. Las cuatro rutas de
estadísticas rechazan al tercer cliente con 403; los totales anónimos devuelven
401. También vuelven a pasar los recorridos de calendario, sesiones y chat,
incluidos adjuntos privados, bloqueo y reconexión WebSocket.

Validación final de esta revisión: **353 pruebas web en 60 archivos**, compilación
Vite y lint con cero errores y los siete avisos anteriores. El total vigente de
las suites backend/web/móvil es **897**; backend y móvil conservan sus resultados
anteriores porque esta revisión solo modifica la web y el ensayo local. No se
ha desplegado esta candidata ni se ha dado por cerrado el paso 7 para publicación.


## Listas de atletas y plantillas del entrenador (20 de octubre)

Ambas pantallas distinguen los errores de una lista vacía y ofrecen reintentos
explícitos. La API de plantillas propaga los fallos y rechaza respuestas que no
sean listas. El selector de plantillas de las rutinas conserva su manejo de error.

La carga compartida asocia resultados y reintentos a la cuenta actual. Oculta
inmediatamente los datos de la cuenta anterior e ignora sus respuestas tardías.
Se conservan el refresco tras fichar o borrar y la eliminación local de un atleta
desvinculado. No se han cambiado los permisos del servidor.

Se añaden ocho regresiones: fallo y reintento, respuesta inválida, respuesta tardía
y ocultación de datos ya cargados al cambiar de cuenta, en cada pantalla. Pasan
las 25 pruebas focalizadas de ambas pantallas y rutinas de cliente.

El ensayo de navegador añade una plantilla ficticia a la base H2 temporal. Fuerza
un 503 inicial en cada lista del entrenador y verifica que los reintentos contra
la API real recuperan el atleta y la plantilla. Ambas rutas devuelven 403 al
tercer cliente y 401 sin sesión. También pasan todos los recorridos anteriores
de entrenamiento, calendario, progreso y chat. No se han usado datos reales ni
servicios de pago.

Validación final de listas del entrenador: **361 pruebas web en 60 archivos**,
compilación Vite correcta y lint con cero errores y **cinco avisos**, dos menos
que en la revisión anterior. Backend y móvil conservan sus comprobaciones
anteriores: el total vigente es **905 pruebas** en las tres suites. La candidata
no se ha desplegado y el paso 7 sigue abierto para publicación.


## Resumen del entrenador y actualización de actividad (20 de octubre)

El panel ya no convierte fallos del resumen en ceros o actividad vacía. Las cargas
de perfil, atletas y resumen validan sus respuestas y muestran qué sección ha
fallado, manteniendo las secciones disponibles. «Reintentar panel» vuelve a
consultar las tres fuentes. La biblioteca de atletas no se presenta como vacía
si falló su petición.

Las actualizaciones cada ocho segundos y al recuperar foco comparten una
petición en curso: no se solapan. Si falla una actualización, se conservan los
últimos indicadores con un aviso explícito. La siguiente respuesta correcta
retira ese aviso. Los resultados y notificaciones pertenecen a la cuenta actual;
al cambiar de cuenta se ocultan los anteriores y se descartan las respuestas
tardías. Se limpian el intervalo, el listener de foco y el temporizador de aviso
al abandonar el panel.

Pasan trece pruebas focalizadas, con ocho regresiones nuevas de fallos parciales,
reintento, respuesta inválida, cambio de cuenta, respuesta tardía, deduplicación
de foco, limpieza del listener y recuperación del refresco fallido. El recorrido
de navegador comprueba los indicadores frente a la API local real, fuerza 503
iniciales en atletas y resumen, recupera ambas fuentes y comprueba un refresco
fallido y su recuperación por foco. La ruta del resumen también rechaza al
tercer cliente con 403 y la petición anónima con 401.

La regresión completa de navegador vuelve a pasar con entrenamientos, calendario,
progreso, listas y chat, incluidos los adjuntos privados y la reconexión. El
ensayo conserva H2 temporal y servicios externos bloqueados; no es una validación
del candidato desplegado ni una prueba física en iPhone.

Validación final del panel: **369 pruebas web en 60 archivos**, compilación Vite
correcta y lint con cero errores y **cuatro avisos**, uno menos que antes. El total
vigente de backend/web/móvil es **913**; backend y móvil conservan sus resultados
anteriores porque esta revisión cambia solo la web y el ensayo local. Cambios
guardados en la rama candidata; sin despliegue ni cierre del paso 7 para publicación.


## Edición segura y recuperación de perfiles (20 de octubre)

Cliente y entrenador bloquean el formulario si falla la carga o si la respuesta
no contiene un perfil válido. Se ofrece «Reintentar perfil» y vuelta a la cuenta;
no se permite guardar un formulario vacío a causa de un fallo de red. El
formulario se reinicia al cambiar de cuenta y se ignoran las respuestas tardías
de la anterior.

Un guardado fallido conserva los cambios para reintentarlo. Se bloquean envíos
simultáneos y se cancelan los temporizadores de avisos y navegación al abandonar
el perfil; una respuesta de guardado posterior a la salida no redirige. El
correo se muestra de solo lectura y queda fuera del payload, igual que las
contraseñas: su cambio mantiene la operación dedicada de Seguridad. Se retiran
los registros de consola que imprimían perfiles y payloads con datos personales.

Pasan 22 pruebas focalizadas, con doce regresiones nuevas: carga fallida y
reintento, respuesta inválida, respuesta tardía de otra cuenta, ocultación inmediata
del perfil anterior, conservación de cambios y bloqueo de envíos simultáneos,
y finalización de un guardado después de abandonar la pantalla, en ambos roles.
Las pruebas existentes verifican además el correo de solo lectura.

El navegador con API real local fuerza errores de carga y guardado en ambos
perfiles. Verifica que no hay botón de guardar tras el fallo de carga, recupera
los campos, conserva el nombre editado tras el fallo de guardado y lo guarda
mediante una petición real. Una nueva lectura HTTP confirma el nombre y que el
correo no cambia. Los payloads no incluyen correo ni contraseña. También pasa
la regresión completa anterior de entrenamiento, calendario, progreso, panel,
listas y chat. Todo se realiza sobre cuentas ficticias y H2 temporal.

Validación final de perfiles: **381 pruebas web en 60 archivos**, compilación Vite
correcta y lint con cero errores y **dos avisos**, dos menos que antes. El total
vigente backend/web/móvil es **925**; backend y móvil conservan sus resultados
anteriores porque esta revisión modifica solo la web y el ensayo local. Los
cambios no están desplegados y no se declara cerrado el paso 7 para publicación.


## Alta del entrenador y navegación al chat (20 de octubre)

El alta utiliza exclusivamente la cuenta autenticada. Espera la restauración de
la sesión antes de exigir login; ya no recupera identificadores de la navegación
ni de cachés de registro antiguas. Cambiar de cuenta reinicia el formulario y
una respuesta del guardado anterior no redirige a la nueva. Un fallo al guardar
se muestra dentro de la pantalla y conserva los datos para reintentar, con
bloqueo de envíos simultáneos.

La validación del cliente exige una fecha válida y la mayoría de edad que ya
indica el selector. Los años de experiencia deben ser enteros no negativos
dentro del rango Integer de la API; no se truncan valores fraccionarios ni
se envían valores que desborden ese rango. No se ha cambiado la validación
del servidor.

El contacto solicitado desde otra pantalla descarta respuestas tardías si cambia
la navegación o el usuario selecciona otra conversación. El saludo solicitado
no se transfiere al contacto elegido manualmente. Se limpia el estado mediante
el router y cada cuenta mantiene su propia instancia del chat y caché; no se
copian contactos de la cuenta anterior a la nueva.

Se añaden trece regresiones: nueve de alta (incluida la espera de sesión) y cuatro
de navegación, saludo y cambio de cuenta del chat. La ejecución focalizada
previa pasó 24 casos; después se añadieron dos casos de mayoría de edad y
restauración de sesión incluidos en la suite completa.

El navegador completa el alta con selector de fecha real, bloquea experiencia
fraccionaria, fuerza un 503 de guardado y confirma que la biografía se conserva.
El reintento real guarda seis años de experiencia y la biografía en la cuenta
autenticada; una lectura posterior del perfil verifica la persistencia. También
pasa la regresión anterior de perfiles, entrenamientos, calendario, estadísticas,
panel, listas y chat. El ensayo usa cuentas ficticias sobre H2 temporal y no
contacta con servicios de pago ni valida un dispositivo iPhone.

Validación final de esta revisión: **394 pruebas web en 60 archivos**, compilación
Vite correcta y lint con **cero errores y cero avisos**. El total vigente de las
suites backend/web/móvil es **938**; backend y móvil conservan sus resultados
anteriores porque esta revisión solo modifica la web y el ensayo local. La rama
candidata sigue sin desplegar y el paso 7 continúa abierto para publicación por
los avisos móviles y la aceptación del candidato definitivo.


## Preview del candidato bloqueada por cuota de Vercel (20 de octubre)

La consulta de Vercel encuentra previews anteriores de `codex/mobile-ux`; por
tanto, las referencias previas a «sin desplegar» deben entenderse como ausencia
de despliegue en producción y aceptación del candidato definitivo, no como
ausencia histórica de previews de la rama. La preview `dpl_Hbu6nChMTGY66jJAcW7cxgDs93af`
corresponde al commit `070fdcd6ae7a23a8d496e7f1c45c5bcaa28de128` y figura READY.
Su identidad se ha contrastado entre la lista y el detalle de Vercel; no se han
validado aquí sus flujos de navegador ni se considera la versión definitiva.

Para el commit funcional `4e63f6875f1f70c81904b962031cb1f4a4cdcb95` no existe
preview. El intento de generarla en el mismo proyecto devuelve HTTP 402, código
`payment_required`: `api-deployments-free-per-day`, 100 despliegues, cero
restantes. Vercel indica restablecimiento el **21 de octubre de 2026 a las
14:06:24, Europe/Madrid**. No se ha creado ningún despliegue con estas peticiones
rechazadas ni se ha modificado el plan, la protección de acceso o producción.

Se añade `python3 -B scripts/check-vercel-candidate.py`, que solo consulta
metadatos, toma HEAD por defecto y exige proyecto, commit completo y preview
READY correctos. Rechaza producción, estados pendientes, hosts inesperados y
previews antiguas aunque aparezcan en una respuesta filtrada. La opción
`--commit <SHA completo>` permite inspeccionar una revisión explícita. La salida
aclara que la aceptación de navegador/API sigue pendiente. El token se obtiene
de `VERCEL_TOKEN`, no se imprime, y el script no crea despliegues ni salta su
protección. Sus **seis pruebas aisladas** pasan y se cuentan aparte de las 938
pruebas de aplicación.

La ejecución contra el candidato falla como corresponde por ausencia de
preview; la ejecución explícita contra `070fdcd` valida únicamente sus
metadatos. Tras restablecerse la cuota, queda generar una preview del commit
elegido para release, verificar su identidad con este comprobador y después
aceptar sus flujos en navegador contra la API correspondiente. No se sustituye
esa validación por un estado READY de una revisión anterior.
