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
| Web, suite completa | 327 pruebas en 60 archivos, todas correctas |
| Móvil, suite completa con preset SDK 54 | 170 pruebas en 30 suites, todas correctas |
| Compilación web | Vite de producción con manifest, correcta |
| Compatibilidad Expo | `expo install --check`: dependencias actualizadas para SDK 54 |
| Exportaciones móviles | Android/iOS Hermes correctas con Babel SDK 54; no son builds firmadas |
| Lint web | Cero errores, ocho avisos de dependencias de hooks existentes |
| Auditoría npm web | Cero avisos después de actualizaciones compatibles |
| Auditoría npm móvil | 50 avisos: 45 altos, 5 moderados, cero críticos |
| Navegador con API real local | Cliente a 390 px y entrenador a 1365 px; entrenamientos, calendario y chat entre dos sesiones independientes completados |
| Carga web y recuperación | Guardas, registro bajo demanda y recuperación de chunk fallido, a 390×844 y 1365×900 |
| Producción actual | Render informa `live` para el despliegue existente; `/actuator/health` vuelve a agotar 45 segundos de espera. Disponibilidad HTTP sin confirmar; la rama candidata sigue sin desplegar |

Las suites suman **871 pruebas correctas**. Los ensayos de navegador son evidencia
adicional, no se suman a ese recuento. Las ejecuciones de backend/web y el ensayo
local se realizaron durante la revisión del 19 de octubre UTC; se repitieron las
comprobaciones móviles tras alinear sus dependencias en la continuación del día 20.
La suite web se volvió a ejecutar completa el día 20 tras corregir los adjuntos:
327 pruebas correctas en 60 archivos.

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
los del segundo. No reemplaza esos endpoints por mocks. Bloquea conexiones del
navegador a servicios externos.

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
SockJS/STOMP y la API reales del servidor H2 temporal, sin simular sus respuestas:

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
