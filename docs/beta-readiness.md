# Preparación de la beta de NextFit

Actualizado el 19 de octubre de 2026.

## Alcance acordado

El propietario ha aprobado priorizar una beta de la aplicación base y aplazar
NextFit AI Coach. Su auditoría queda como propuesta: no se ha implementado IA,
habilitado consumo de modelos o contratado servicios.

Las mejoras móviles están en `codex/mobile-ux`. El paso 6 sigue pendiente de
validación en teléfono; no se presenta como terminado. Tras acordar el camino
hacia la beta, se retoman las comprobaciones generales del paso 7 sin ocultar
esa dependencia pendiente. No se autoriza un gasto por el mero hecho de preparar
la beta.

## Correcciones de aislamiento para la beta

- Programar una rutina exige que pertenezca al cliente del calendario. Tener
  acceso a dos clientes como entrenador no permite mezclar sus recursos.
- Las plantillas sin cliente deben clonarse antes de programarlas, mediante el
  flujo existente de asignación.
- Guardar una sesión valida cliente, rutina y evento antes de consultar una
  sesión previa o escribir. Un evento inexistente, ajeno o de otra rutina no
  puede marcarse completado ni devolver los datos de otra sesión.
- La sesión previa debe corresponder también al cliente y rutina autorizados;
  una asociación inconsistente no se usa como respuesta idempotente.
- Los rechazos de permisos se devuelven como 403, sin transformarlos en errores
  genéricos de guardado. El entrenamiento libre sin evento permanece disponible.

Las pruebas de integración usan JWT reales del perfil de test, controladores,
servicios y H2 aislado, con cuentas ficticias y rollback. Incluyen autorización
positiva y negativa, trainer con dos clientes, plantilla, evento inexistente,
asociaciones inconsistentes y reintento de una sesión válida. La prueba del
reintento secuencial no demuestra idempotencia concurrente de sesiones libres.

## Evidencia de validación

Ejecución del 19 de octubre de 2026 sobre el código corregido:

- Backend: `mvnw verify` termina con BUILD SUCCESS; **370 pruebas**, sin fallos,
  errores ni omisiones, y JAR compilado. Incluye las **11 pruebas nuevas** de
  `TrainingOwnershipIntegrationTest`.
- Web: **286 pruebas en 60 archivos**, todas correctas; `npm run build` termina
  correctamente. Tras dividir la carga por pantalla, el archivo inicial pasa de 1.654,16 kB
  a 333,37 kB (~80 % menos de JavaScript inicial); la compilación no avisa de
  chunks superiores a 500 kB. El peso de imágenes no forma parte de esa reducción.
- Móvil: **168 pruebas en 31 suites**, todas correctas. No se ha generado ni
  instalado una compilación nativa nueva en esta ejecución.
- `scripts/check-production.py`: salud UP, protección de chat/moderación, CORS
  exacto y rechazo de una credencial Google deliberadamente inválida.
- `git diff --check`: sin errores de espacios.

Los checks de producción corresponden al despliegue existente: **las nuevas
correcciones de aislamiento todavía no se han desplegado**. Las pruebas no
crean usuarios reales, no escriben entrenamientos reales ni verifican una
sesión social real. No confundir los recuentos históricos de otros documentos
con una ejecución nueva.

## Condiciones pendientes antes de distribuir la beta

| Área | Situación y siguiente evidencia necesaria |
|---|---|
| Código entregado | Subir cambios revisados; comprobar el commit de cada despliegue. La rama no actualiza automáticamente producción |
| iPhone | Apple Developer/TestFlight y firma iOS aplazados; Expo no tiene credenciales iOS. Falta compilación y recorrido real con teclado, texto grande y ambos perfiles |
| Android | La solicitud de APK de esta rama se canceló al confirmar que el propietario usa iPhone; no hay un APK nuevo de estas mejoras |
| Login social | La respuesta a credenciales inválidas no valida login real. Google Android/iOS y Apple reales necesitan sus builds, configuración y dispositivo |
| PostgreSQL | Obtener copia cifrada real y restaurarla en una base aislada; ensayos con datos sintéticos no acreditan recuperación de producción |
| Migraciones | Revisar esquema/baseline de la base existente antes de activar Flyway o sustituir `update`; no hacerlo para silenciar fallos |
| Archivos | Cloudinary privado se verificó con un objeto sintético tras recrear instancia; archivos locales antiguos perdidos no se recuperaron |
| Catálogo de ejercicios | Integrar la API de pago al final, antes de publicar el conjunto. Proveedor y plan pendientes de elección; no contratar ni conectar todavía. Verificar cobertura, traducciones, permisos de uso de medios, límites y respuesta ante fallos antes del despliegue |
| Legal/publicación | Revisar textos, contacto de soporte, política de privacidad, datos declarados en tiendas y derechos de medios del catálogo |
| Recorridos de beta | Cuentas ficticias de ambos perfiles: acceso, asignación, calendario, sesión, progreso, chat, bloqueo/denuncia y privacidad; no usar cuentas reales ajenas |

No publicar como aplicación lista para tiendas mientras falten estas condiciones.
Consultar también `production-readiness.md`, `database-operations.md` y
`mobile-ux.md`. La preparación técnica y las verificaciones automatizadas no
sustituyen una prueba real ni una decisión de contratar infraestructura.


## Carga web por pantallas

El login se incluye en la entrada inicial; las otras pantallas se descargan al
abrirlas. Los permisos continúan en `ProtectedRoute`. Un estado accesible anuncia
la carga y un fallo ofrece recargar o volver al inicio sin exponer el error interno.
Se elimina el proxy obsoleto `/register` de Vite: el API real usa `/api/register`,
y la ruta web debe poder abrirse o recargarse como una página de la aplicación.

Validación: siete pruebas focalizadas de rutas/carga; suite web completa de
286 pruebas; build con manifest; y Chromium sobre ese build a 390×844 y 1365×900.
El ensayo de navegador verifica redirección sin sesión, ausencia de descarga de
pantalla privada, registro bajo demanda sin desbordamiento horizontal y descarga
fallida seguida de recuperación mediante recarga. La API se simula con 401 y no
se crean cuentas. No es una prueba de Safari o de un iPhone físico.

Ensayo reproducible si el entorno tiene Python Playwright y Chromium instalados:

1. En `Frontend/AplicacionFrontend`: `npm run build -- --manifest`.
2. Iniciar `npm run preview -- --host 127.0.0.1 --port 4181 --strictPort`.
3. Desde la raíz: `python3 scripts/check-web-loading.py`.

El script usa exclusivamente la preview local y bloquea conexiones externas.
No publicar ese servidor local como enlace para el usuario.

## Privacidad: preparación de textos y exportación

El propietario confirma España y deja pendiente crear el correo de soporte y
privacidad; falta la identidad del responsable. Los textos públicos siguen
provisionales. El inventario y las diferencias que deben resolverse antes de
publicar se registran en [Privacidad para la beta](privacy-data-inventory.md).

Por petición del propietario, se ha retirado **Exportar mis datos** de web y
móvil: menús, pantallas, rutas, clientes de API, servicios y endpoint de descarga.
La ampliación descrita en el historial de esta rama no forma parte del producto
actual. No se eliminan datos de usuarios ni las herramientas operativas de copia
y restauración de PostgreSQL. La modificación sigue en la rama, sin desplegar.

Validación tras retirar la exportación: backend `mvnw verify` con **363 pruebas**
sin fallos, errores ni omisiones y JAR compilado; web con **284 pruebas** correctas;
móvil con **162 pruebas** correctas. Se eliminan las pruebas exclusivas de la
función retirada y se mantienen las de autenticación, cambio de correo y
protección de calendario/sesiones. Las cifras anteriores son ejecuciones
históricas con la función aún presente.


## Baja de cuentas sociales

Se elimina la dependencia de una contraseña para las cuentas Google/Apple que
no la tienen. El usuario confirma y verifica el proveedor vinculado; el backend
comprueba proveedor/subject, usuario y rol antes de aplicar la baja existente.
Se mantienen los controles de contraseña y se evitan reintentos automáticos de
baja en móvil. No cambia el esquema ni la conservación de históricos. Los
proveedores reales, la revocación externa de Apple y la prueba en iPhone siguen
pendientes. Detalle y alcance: [Baja de cuenta](account-deletion.md).

Validación de la baja social: suite backend de 373 pruebas y JAR correctos;
clase social final de 11 casos correcta (incluye entrenador); suite web de 289
pruebas y ocho casos finales del formulario correctos; suite móvil de 169 pruebas
y 17 casos finales de formulario/HTTP correctos. Build web y exportaciones
JavaScript Android/iOS del código final completados. No son pruebas con
proveedores reales ni builds firmadas. El despliegue conjunto de API y clientes
sigue pendiente: la API de producción anterior solo admite contraseña para baja.

### Generador automático: textos de la beta

El generador existente se presenta como generación automática de rutinas, basada en reglas, objetivo y días de entrenamiento. Se retiraron las referencias a IA y análisis de biodatos de sus pantallas web y móvil, sin cambiar las rutas ni el contrato del servidor. AI Coach sigue aplazado. Se eliminaron además los registros del formulario y la respuesta completa de error en la consola web.

Validación: 4 pruebas del generador web y 9 de edición/generación móvil; compilación web de producción. Esta revisión no incorpora un proveedor de IA ni demuestra personalización clínica o adaptación a lesiones.

### Generación web: protección del envío

La pantalla bloquea envíos simultáneos y otra creación tras una respuesta satisfactoria. Conserva las opciones después de fallar, muestra un aviso dentro de la pantalla y no navega si la respuesta llega después de salir. Ante un fallo de red pide revisar las rutinas antes de reintentar: el bloqueo del cliente no garantiza idempotencia del servidor entre intentos independientes.

Validación: las 6 pruebas del generador web incluyen fallo/reintento con opciones conservadas, bloqueo durante el envío y después de guardar, y salida antes de recibir la respuesta. Compilación web de producción completada.

### Catálogo de pago y controles de creación

Por indicación del propietario, la integración con la API de ejercicios de pago queda para el último tramo, antes de publicar todo. No hay proveedor contratado ni se cambian las fuentes del catálogo actual en esta revisión. Tampoco se habilita AI Coach.

Las tarjetas de creación y las opciones del generador web usan botones nativos enfocables. Las opciones anuncian su estado seleccionado y se bloquean mientras se guarda o tras finalizar, para evitar cambiar lo que aparece seleccionado durante el envío.

Validación de estos controles: 14 pruebas web de creación/generación correctas y compilación de producción completada. Una primera ejecución superó el límite de 5 segundos en un caso de enfoque; la repetición con límite de 15 segundos completó los 14 casos sin cambios de comportamiento. Las pruebas comprueban controles nativos, foco, selección y bloqueo; no sustituyen una revisión con lector de pantalla ni Safari real.

### Exploración del catálogo web

El catálogo distingue fallo de carga, catálogo vacío y búsqueda sin coincidencias. El fallo ofrece reintento sin perder la búsqueda y las respuestas posteriores a salir de la pantalla no actualizan su estado. Los resultados siguen mostrándose en bloques de 50, pero ahora se pueden abrir los siguientes con «Mostrar más ejercicios». Esta paginación es local: no modifica las consultas al proveedor ni integra la API de pago aplazada.

Validación: 7 pruebas de exploración web correctas (carga, búsqueda, medios, error, reintento, estados vacíos y resultados posteriores a 50) y compilación web completada. No se ha consultado ni contratado una API externa de ejercicios.

### Recuperación del editor web

Un fallo de carga o una rutina inexistente ya no abre un editor vacío: ofrece reintentar o volver. Se ignoran respuestas de carga obsoletas al cambiar de rutina o salir. El guardado bloquea solicitudes simultáneas y conserva la edición tras un error. Los temporizadores de avisos y navegación se cancelan al salir. No se cambia el contrato ni el esquema de rutinas; la integración del catálogo de pago sigue aplazada.

Validación: 8 pruebas del editor correctas, incluida recuperación de carga, rutina inexistente y guardado repetido/fallo/reintento con cambios conservados. Compilación web completada. Las pruebas usan API simulada y no modifican rutinas reales.

### Creación manual web: recuperación y guardado

El creador manual distingue un fallo del catálogo de una búsqueda vacía y permite reintentar sin borrar el plan ni el filtro. Las respuestas de carga posteriores a salir se ignoran. El guardado bloquea envíos simultáneos, conserva los campos y ejercicios tras un error y mantiene el bloqueo tras confirmar el guardado. Los temporizadores de avisos y redirección se limpian al salir. Ante una respuesta incierta se pide revisar las rutinas antes de reintentar; no se garantiza idempotencia entre peticiones independientes.

Validación: 5 pruebas del creador manual correctas, incluidas recuperación del catálogo con nombre/búsqueda conservados y fallo/reintento de guardado con ejercicios conservados. API simulada, sin modificar planes reales. La API de ejercicios de pago sigue aplazada.

La compilación web de producción de esta revisión también se completó correctamente.

### Cantidades en la creación manual web

El creador manual acepta coma o punto decimal en el peso, sin usar conversiones parciales que trunquen el valor. Antes de enviar valida series/repeticiones enteras positivas compatibles con el contrato Java, peso no negativo representable como Float y RPE entero entre 0 y 10 (0 conserva el valor sin objetivo previo). Los campos vacíos o mal formados detienen el envío y conservan el borrador. Cada campo tiene una etiqueta accesible por ejercicio. Es validación de formulario: no sustituye controles del servidor ni impone límites clínicos personalizados.

Validación: 13 pruebas del creador correctas, incluidas conversión de 35,5 a 35.5 y siete casos de cantidades inválidas sin llamada de guardado; compilación web completada. La revisión afecta al creador manual, no corrige todavía las series individuales del editor antiguo.

### Pauta común en el editor web

El contrato actual de rutinas guarda número de series y una pauta de peso/repeticiones/RPE por ejercicio. El editor web permitía aparentar pautas distintas por fila, pero solo guardaba la primera. Ahora cualquier cambio se refleja en todas las series y una explicación visible indica la pauta común. Los registros reales de series del entrenamiento no se modifican. El editor reutiliza la conversión decimal del creador manual, valida cantidades antes de enviar y conserva RPE 0 al cargar. No se añade un contrato de prescripción individual por serie ni una migración de datos.

Validación: 23 pruebas del editor y creador manual correctas. Incluyen editar desde la segunda fila, reflejarlo en la primera, guardar peso 32,5 como 32.5, rechazar RPE inválido y corregirlo sin perder la rutina. Compilación web completada; API simulada, sin cambios en producción.
