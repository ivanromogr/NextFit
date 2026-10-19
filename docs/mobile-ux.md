# Experiencia móvil: acceso y registro

Cambios del 19 de octubre de 2026 en `Frontend_App`:

- Los campos compartidos permiten mostrar y ocultar contraseñas, conservando
  exactamente la credencial. Respetan el estado de edición y exponen etiquetas
  accesibles para el control de visibilidad.
- Los campos aceptan referencias, autocompletado y eventos del teclado. En
  acceso y registro, «Siguiente» mueve el foco y «Entrar» envía el formulario.
- El desplazamiento y la adaptación al teclado permiten interactuar con el
  formulario mientras está abierto. Debe confirmarse su comportamiento visual
  en dispositivos reales Android e iOS.
- Registro apila nombre/apellido y cabecera en anchos menores de 400 puntos o
  con escala de fuente superior a 1,2. Los campos crecen con su contenido.
- Botones y consentimientos tienen semántica accesible; los consentimientos y
  controles de contraseña disponen de una zona táctil mínima de 44 puntos.
- Los envíos concurrentes de acceso y registro quedan bloqueados. Se recortan
  espacios de nombres/correo y se normaliza el correo; la contraseña no se
  modifica. Registro deja de imprimir el objeto de error HTTP completo, que
  podría contener el cuerpo de la petición.

No cambia la obligatoriedad de aceptar términos y privacidad ni se activa el
consentimiento opcional de comunicaciones.

## Validación

Desde `Frontend_App`, `npm test -- --runInBand`: 31 suites, 168 pruebas correctas.
Incluye recuperación, consentimientos, Google/Apple, chat y las pruebas nuevas
para visibilidad, eventos del campo y bloqueo de peticiones concurrentes.

La exportación JavaScript de Expo para Android/iOS se comprueba por separado de
una compilación nativa firmada. Estas modificaciones requieren una nueva
compilación de la aplicación para llegar al APK instalado; una publicación web
no las entrega. La instalación en un móvil real continúa pendiente por decisión
del propietario. No se da por terminado el bloque completo de UX móvil.

La copia recuperable de la base de datos real y la adopción de migraciones
siguen pendientes como se indica en `production-readiness.md`.

## Navegación inferior

Las barras de cliente y entrenador comparten el cálculo del área segura:
reservan como mínimo el margen inferior del sistema y mantienen 52 puntos
útiles para icono/etiqueta (además de ese margen y del relleno superior).
También respetan los márgenes laterales. La raíz proporciona `SafeAreaProvider`
y ambas barras se ocultan cuando aparece el teclado.

Tres pruebas comprueban la separación respecto al indicador de inicio, el
espacio táctil cuando no hay margen inferior y la actualización del diseño al
cambiar los márgenes del sistema. La comprobación visual y con teclado real en
un teléfono sigue pendiente; las pruebas de componentes y exportaciones no la
sustituyen.

## Recuperación y cambio de contraseña

Las pantallas de solicitar recuperación, restablecer contraseña y cambiar
contraseña usan un contenedor común con área segura, desplazamiento y adaptación
al teclado, tarjeta de ancho máximo y navegación de vuelta con zona táctil de
44 puntos. Los errores se muestran junto al formulario y se anuncian mediante
una región accesible. Los campos permiten autocompletado y avance desde el teclado.

Cada envío queda bloqueado hasta terminar. La recuperación rechaza un correo
vacío y conserva la respuesta neutral sobre si existe una cuenta. Un fallo de
red permite reintentar. El restablecimiento ofrece solicitar un nuevo enlace
cuando recibe `INVALID_RESET_TOKEN`; un rechazo explícito de política de
contraseña permite corregirla conservando el token. Después de restablecer se
limpian token y contraseñas del estado del formulario.

El cambio de contraseña mantiene las validaciones existentes y borra la sesión
local tras una respuesta correcta. Un error de contraseña actual no cierra la
sesión. Las pruebas cubren estos estados, la confirmación, la petición duplicada
por teclado y el reintento. No se ha enviado correo ni cambiado una contraseña
real durante estas pruebas.

## Sesiones, privacidad y eliminación de cuenta

Sesiones activas presenta una lista virtualizada con tarjetas, carga, error,
lista vacía y actualización manual. Revocar una sesión bloquea acciones
simultáneas y actualiza la lista; cerrar todas conserva la confirmación explícita.
Los identificadores internos siguen sin mostrarse.

Privacidad ofrece reintentar una carga fallida y anuncia el estado de guardado.
El interruptor conserva la preferencia guardada hasta recibir confirmación del
servidor. Una petición fallida no activa marketing y permite reintentar. No se
cambian los consentimientos de términos o privacidad.

Eliminar cuenta usa el formulario compartido, un botón de acción destructiva y
confirmación nativa. Valida la contraseña antes de confirmar, bloquea peticiones
simultáneas y muestra el error sin cerrar la sesión cuando falla la contraseña.
Cancelar conserva la cuenta y permite volver a abrir la confirmación.

Las pruebas usan respuestas simuladas: no se han eliminado cuentas ni revocado
sesiones reales. La revisión visual en un teléfono sigue pendiente.

## Cambio de correo y exportación

Cambiar correo usa el contenedor común, valida campos antes de enviar, normaliza
el correo y conserva la contraseña sin modificarla. Bloquea solicitudes
simultáneas y muestra la confirmación de envío sin conservar la contraseña en el
formulario. El correo actual sigue vigente hasta confirmar el enlace.

Confirmar correo distingue enlace inválido, correo ocupado, fallo de conexión y
fallo de guardado de la sesión local. Un cambio de identidad de la función
`login` ya no repite la petición de un solo uso. Los intentos comparten su
promesa y los resultados de una pantalla desmontada se ignoran. Solo un fallo
de petición permite reintentar; si la confirmación fue correcta pero falló la
sesión local, se ofrece iniciar sesión con el nuevo correo.

Exportar datos incorpora área segura, navegación de vuelta, error visible y
bloqueo de operaciones simultáneas. Conserva el servicio existente que comparte
JSON desde la caché y elimina el temporal al terminar. No afirma que el usuario
haya guardado una copia: cerrar o cancelar el selector depende del sistema.

Las pruebas adicionales cubren normalización, validación, peticiones duplicadas,
reintentos, fallo de sesión y cambios de la función de autenticación. No se han
cambiado correos ni exportado datos personales reales para estas pruebas.

## Pendientes de UX móvil

Quedan por revisar los recorridos principales de atleta y entrenador, las pantallas pequeñas,
el texto ampliado y el teclado en dispositivos reales. Los cambios de esta rama
no equivalen a un APK nuevo distribuido ni completan el bloque 6.

## Perfiles y métodos de acceso

Los perfiles de atleta y entrenador comparten una lista vertical de acciones de
cuenta con descripciones y controles que crecen con el texto. El correo actual
se muestra en modo de lectura y su cambio se abre mediante el flujo verificado.
Ambos perfiles ofrecen los mismos accesos, incluida la gestión de métodos.
Cabecera, campos y foto se adaptan a anchos pequeños o texto ampliado; se revisan
las áreas táctiles y el teclado. Se elimina una fila horizontal que contenía
todos los botones de seguridad y podía desbordar la pantalla.

Métodos de acceso utiliza el contenedor común y campos de contraseña con
visibilidad y avance desde el teclado. Incluye carga, fallo de carga y reintento;
no ofrece acciones basadas en una lista todavía desconocida. Los envíos se
bloquean con una referencia inmediata, también cuando provienen del teclado.
Se conservan las verificaciones existentes antes de desvincular y la prohibición
de retirar el único método de acceso. No se vinculan proveedores automáticamente
por abrir esta pantalla ni se obliga a configurarlos.

Las pruebas montan ambos perfiles, comprueban el correo de solo lectura y el
acceso al flujo verificado; verifican cada destino de ajustes, el reintento de
carga y la creación de contraseña sin solicitudes duplicadas. La suite conserva
las pruebas previas de reautenticación social y protección del último método.

El propietario ha solicitado un aviso al cerrar el paso 6 antes de comenzar el
7. El paso 6 sigue abierto mientras falten sus recorridos y la validación en
dispositivo; no se ha empezado el bloque general de testing.

## Inicio, calendario y agenda

Los inicios de atleta/entrenador y los calendarios ofrecen error visible y
reintento cuando falla una carga necesaria. Un fallo ya no se presenta como
estadísticas vacías, un equipo sin atletas o un día libre. Estos recorridos
solicitan propagación de errores a los helpers existentes, conservando su
comportamiento por defecto para los demás consumidores.

Calendario oculta eventos antiguos durante la carga y descarta respuestas de
una petición anterior cuando el usuario cambia de mes. El día seleccionado
acompaña al nuevo mes. Agenda también evita reemplazar eventos recientes con
una respuesta anterior; si falla el calendario de un atleta no muestra una
agenda global aparentemente completa. Las peticiones de la vista de entrenador
incluyen su identificador en el filtro de sesiones y rutinas.

Los límites de mes y las fechas de calendario se tratan como días locales, sin
convertirlos a UTC para obtener su clave. Se verifican también en procesos con
`TZ=Pacific/Kiritimati` y `TZ=America/Los_Angeles` (dos pruebas en cada zona),
además de la suite móvil. Los inicios usan el área segura del dispositivo.

Las pruebas adicionales montan las cuatro pantallas y verifican fallos,
reintentos, destinos de inicio, filtros del entrenador y respuestas que llegan
fuera de orden. Son pruebas de componentes con datos sintéticos, no una revisión
visual ni una sesión real contra producción.

Sigue pendiente completar la revisión final de los recorridos y su validación en
un dispositivo real. No se declara terminado el paso 6 ni se inicia el paso 7.

## Conversaciones y búsqueda de contactos

Atleta y entrenador comparten una lista virtualizada con búsqueda por nombre o
apodo, carga, fallo con reintento y mensajes distintos para lista vacía y búsqueda
sin coincidencias. Se conservan las claves de caché existentes; un fallo o JSON
inválido en la caché no impide consultar el servidor. Los contactos se deduplican
por identificador normalizado. Al cambiar de cuenta se vacía el estado y se
impide guardar los contactos anteriores bajo la clave de la cuenta nueva.

La búsqueda de nuevo contacto usa un modal con área segura, teclado y
cancelación nativa. Valida y normaliza el correo, bloquea consultas duplicadas,
rechaza la propia cuenta y distingue fallo de red de un 404. Una respuesta
posterior al cierre se descarta. Los correos con `+` se codifican correctamente
en la consulta. El apodo elegido se conserva al añadir o volver a abrir el chat.

Ambos perfiles abren `PantallaChatIndividual`; la navegación de vuelta deja de
depender de una conversación incrustada en la lista de atleta. Las cabeceras no
muestran «En línea» sin un dato de presencia. El chat indica el estado real de
su conexión, ofrece reintentar el historial y conserva mensajes recibidos en
directo mientras se carga el historial. Los controles de adjunto y emoji tienen
etiquetas accesibles y zonas táctiles mínimas de 44 puntos.

Las notificaciones de ambos perfiles usan STOMP moderno con credencial actual
antes de conectar y desactivación al salir. Se ignoran cargas inválidas y se
consultan al servidor los contactos todavía desconocidos. No se marcan nuevos
mensajes para una conversación que se acaba de abrir; al volver a la lista se
limpia su indicador. El envío y los controles de bloqueo/denuncia conservan sus
comprobaciones existentes.

Las pruebas usan datos y sockets simulados. Cubren ambos perfiles, navegación,
caché dañada y separación entre cuentas, apodos, duplicados, búsqueda cancelada,
credencial de conexión, limpieza del socket, errores del historial y mensajes
en directo durante su carga. No se han enviado mensajes reales para validar
estos cambios. La revisión en teléfono y la revisión final del resto de los
recorridos siguen pendientes dentro del paso 6; no se ha comenzado el 7.

## Exploración, rutinas e inicio/finalización del entrenamiento

Explorar entrenadores y listar rutinas distinguen fallos de red de listas sin
resultados y ofrecen reintentar. Las respuestas de filtros o cargas anteriores
no reemplazan los datos más recientes. Los accesos a perfiles, creación, edición
e inicio de rutina tienen etiquetas accesibles; las pestañas de rutinas
anuncian cuál está seleccionada. Se revisan áreas seguras y zonas táctiles.

Entrenamiento permite reintentar una carga fallida en la misma pantalla en lugar
de expulsar al usuario. Descarta respuestas de una rutina anterior y reinicia
sus datos locales al cambiar de rutina. El temporizador comienza después de
cargar, no durante la espera. El modo observador permanece de solo lectura y
no presenta valores planificados como una sesión registrada cuando no puede
recuperarla.

Guardar muestra primero un resumen desplazable, bloquea peticiones simultáneas
y confirma éxito después de la respuesta. Tras un fallo conserva las series y
permite seguir editando o reintentar; tras una respuesta correcta bloquea un
segundo guardado desde esa pantalla. Estos controles no sustituyen una garantía
de idempotencia del servidor ante una respuesta de red perdida. Los pesos con
coma decimal se interpretan correctamente al calcular volumen y guardar.

Ocho pruebas adicionales comprueban perfiles públicos, filtros fuera de orden,
rutinas propias/asignadas, inicio, fallo de carga, guardado duplicado, conservación
de series y pesos decimales tras un fallo, y modo observador. No se han guardado
entrenamientos reales para esta validación.

Pendiente en el paso 6: preparar la compilación instalable y realizar la
comprobación visual y de teclado en un teléfono. El paso 7 sigue sin comenzar, conforme a la indicación del propietario.

## Creación y edición de rutinas

Ambos formularios bloquean guardados simultáneos y una repetición tras una
respuesta correcta. Los errores son visibles y permiten reintentar conservando
nombre, ejercicios, notas y pesos. Los pesos con coma decimal se convierten
correctamente. La generación de planes comparte la protección contra peticiones
simultáneas y conserva las opciones seleccionadas si falla. No se imprimen el
borrador completo ni detalles internos de errores al guardar.

La biblioteca permite reintentar sin presentar un fallo como ausencia de
ejercicios. Descarta respuestas al abandonar el modo manual y conserva el
borrador al recargar. El editor busca por nombres originales y traducidos y no
muestra un formulario vacío cuando falla la carga de la rutina. Los modales
admiten cierre nativo, se revisan las áreas seguras, el teclado y las zonas
táctiles; el selector inicial puede desplazarse con texto grande.

El contrato de rutinas conserva una pauta de peso/repeticiones/esfuerzo por
ejercicio. El editor ahora refleja esa pauta en todas sus series; los valores
individuales de cada serie se registran al entrenar. Así evita aparentar que se
han guardado variantes que el contrato no admite.

Nueve pruebas adicionales cubren validación, reintento de catálogo, preservación
del borrador, pesos decimales, protección de guardado/generación, coherencia de
las series y búsqueda por nombre traducido. Se corrige también una espera de
las pruebas de métodos de acceso: ahora esperan a que finalice la carga, antes
de intentar pulsar las acciones.

## Cierre pendiente del paso 6

La revisión de código de los recorridos principales está realizada en
`codex/mobile-ux`. Siguen pendientes una compilación nativa instalable con estos
cambios y la comprobación visual/funcional en teléfono de ambos perfiles, texto
grande, teclado, navegación, acceso social y entrenamiento/chat. Las exportaciones
JavaScript y las pruebas de componentes no sustituyen esas comprobaciones.
No se declara cerrado el paso 6 y no se comienza el paso 7. El propietario debe
recibir el aviso de cierre antes de continuar al testing general.


## Candidato Android del paso 6

La compilación interna de EAS `c533ef66-79c6-4453-96d2-063edb8204aa`
se solicita desde el commit `dfc0e8d4f76457ccdadbb35e0876fbdf556a7ba8`,
perfil `preview`, entorno `preview`, directorio `/Frontend_App`.
Su página de seguimiento es:
https://expo.dev/accounts/iviromo/projects/Frontend_App/builds/c533ef66-79c6-4453-96d2-063edb8204aa

Una solicitud aceptada no demuestra que haya un APK disponible. Hay que
comprobar el estado final de EAS antes de distribuir el enlace de instalación.
La compilación anterior a esta rama no contiene el rediseño del paso 6.

Para la comprobación en Android, abrir el enlace de instalación desde el propio
móvil y descargar el APK cuando EAS termine. Android puede pedir permitir la
instalación desde ese navegador. No es una instalación mediante Expo Go ni
una publicación en Google Play. No desinstalar una versión existente para
resolver un error sin registrar antes el mensaje y conservar sus datos.

Comprobar con cuentas de prueba de cliente y entrenador:

- Acceso, recuperación de contraseña y ajustes, sin recortes con texto grande.
- Navegación y formularios con el teclado abierto, botón Atrás y áreas seguras.
- Creación/edición de rutina, coma decimal y recuperación del borrador al fallar.
- Entrenamiento y chat: carga, error y reintento, sin envíos o guardados duplicados.
- Acceso de Google con la firma existente; Apple/iOS real sigue pendiente.

La compilación y las comprobaciones del APK forman parte del cierre del paso 6.
El paso 7 no se inicia hasta avisar al propietario de ese cierre.
