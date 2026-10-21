# Dependencias móviles: estado del 21 de octubre de 2026

## Estado vigente: eliminado el origen sprintf-js

La auditoría instalada y la del lockfile coinciden ahora en **45 avisos altos,
cero moderados y cero críticos**, originados en `braces` y `node-forge`.
`sprintf-js` ya no forma parte del árbol. Los recuentos inferiores son históricos.

El override se limita a `@istanbuljs/load-nyc-config` → `js-yaml@4.3.2`.
El consumidor real utiliza `load(text)`, conservado en YAML 4; no utiliza los
métodos eliminados `safeLoad`/`safeDump`. Se evita actualizar Jest o Expo, o
sustituir globalmente argparse por una API mayor incompatible con sus llamadas.
YAML 4 elimina la rama argparse 1 → sprintf-js. El árbol deduplica con el YAML 4
ya usado por las herramientas Expo. Este override debe revisarse al actualizar
el consumidor, igual que los anteriores.

Validación tras instalación limpia desde el lockfile:

- 203 pruebas móviles correctas en 33 suites.
- Dos pruebas Node del consumidor real: carga YAML, herencia, opciones de
  cobertura y rechazo de claves duplicadas, sin mocks del parser.
- Comprobación de dependencias Expo correcta; SDK y versiones React sin cambios.
- Prueba PBX iOS y seis contratos del escáner correctos.
- Exportaciones nuevas Android/iOS en
  `/workspace/nextfit-setup/mobile-yaml-reviewed`; escáner correcto sobre 4.172 y
  4.167 fuentes, respectivamente, para los dos orígenes aún señalados.

Comando nuevo: `npm run test:coverage-tools`. Informes de esta ejecución:
`/tmp/nextfit-yaml-audit.json` y `/tmp/nextfit-yaml-lock-audit.json`.
No hay build firmada ni validación física, y los dos avisos de origen restantes
no se consideran corregidos por no aparecer en el JavaScript exportado.

## Historial de revisiones anteriores

La auditoría npm pasa de 61 a **50 avisos**: 45 altos, 5 moderados y cero críticos.
El recuento de npm incluye también los paquetes afectados por depender
de otros vulnerables. La web mantiene su auditoría anterior sin avisos; en esta
revisión solo se modifica `Frontend_App`.

## Correcciones compatibles aplicadas

`package.json` contiene cuatro grupos de overrides deliberados y acotados:

- `ws@^7` → `7.5.13`. Metro y React DevTools piden la versión mayor 7; las ramas
  6 y 8 permanecen intactas. Corrige el aviso de agotamiento de memoria en la
  versión 7.5.10. El árbol resuelto confirma el cambio.
- `@expo/metro-config` → `postcss@8.5.31`. Expo 54 restringía PostCSS a `~8.4.32`.
  Se mantiene la API mayor 8 y se aplica una versión fuera de los rangos de los
  avisos de procesamiento CSS/source maps. No se cambia globalmente cualquier
  versión de PostCSS ni se actualiza Expo a otra versión mayor.

- Cohorte Metro `0.83.3` → `0.83.8`: se actualizan juntos los 14 módulos que
  `@expo/metro@54.2.0` fija en 0.83.3. Se mantiene la rama 0.83 y se evita mezclar
  versiones internas. Esta revisión de Metro retira su dependencia de
  `image-size@1.2.1`; no se fuerza la API incompatible de `image-size@2` sobre
  el código anterior de Metro. El wrapper Expo permanece en 54.2.0.

- `xcode` → `uuid@11.1.1`: cambio acotado a este consumidor de la herramienta iOS.
  Su uso identificado es `require('uuid').v4()` sin argumentos, compatible con la
  exportación CommonJS de 11.1.1. La prueba del consumidor genera identificadores,
  modifica un proyecto PBX temporal y verifica que se puede guardar y volver a
  leer conservando los grupos y referencias. No es un cambio global a la última
  versión de UUID ni un cambio del SDK.

Mantener estos overrides hasta que el SDK declare versiones corregidas. Al
actualizar Expo hay que comprobar si pueden retirarse, no copiarlos sin revisar.

## Avisos restantes y decisión técnica

Versiones contrastadas con el registro npm durante esta revisión:

| Dependencia de origen | Uso identificado | Situación |
|---|---|---|
| `braces@3.0.3` | `micromatch` de Jest | El aviso incluye la última versión estable publicada (3.0.3); no hay versión `next` publicada. No se inventa un parche ni se sustituye por una versión anterior vulnerable |
| `node-forge@1.4.0` | CLI Expo y certificados de firma | La última estable publicada, 1.4.0, sigue dentro del rango del aviso. Requiere seguimiento del proveedor o sustitución revisada del componente de firma |
| `sprintf-js` | `argparse` de la instrumentación de Jest | La última estable publicada (1.1.3) también está dentro del rango señalado; actualizar dentro de la misma API no elimina el aviso |

Los avisos de Expo, React Native, Jest y otros nodos del informe se propagan por
estas dependencias. Las sugerencias de `npm audit fix --force` incluyen cambios
mayores o regresiones del SDK que no constituyen una reparación compatible.

Esta clasificación documenta el árbol y las llamadas examinadas; no acredita
inexistencia de otras rutas de ejecución. Los avisos no se silencian ni se añade
una excepción para que la auditoría aparente pasar. Hasta resolverlos o revisar
formalmente la exposición del artefacto distribuido, el cierre de seguridad para
publicación del paso 7 continúa pendiente.

## Reproducción

En `Frontend_App`, con las dependencias del lockfile instaladas:

```sh
npm audit --json
npm ls braces image-size node-forge postcss sprintf-js uuid ws --all
npm test -- --runInBand
CI=1 npx expo install --check
```

La exportación de JavaScript/Hermes Android e iOS verifica que Metro siga
empaquetando el proyecto. No sustituye una compilación firmada o una prueba en
un dispositivo físico. No se han contratado servicios ni conectado la API de
ejercicios de pago.

## Evidencia de la cohorte corregida

La suite móvil completa termina con 170 pruebas correctas y la comprobación de
versiones de Expo sigue indicando que las dependencias están actualizadas. El
árbol instalado confirma Metro 0.83.8, PostCSS 8.5.31 y WebSocket 7.5.13 en los
ámbitos corregidos. No hay actualización de SDK ni cambios de código nativo.

La exportación final Android/iOS con Metro 0.83.8 terminó correctamente. Se generaron
ambos bundles Hermes; no se ejecutó EAS Build ni se modificaron servicios externos.

## Continuación: herramientas iOS y exposición del bundle

El override UUID elimina el aviso de origen y su propagación por la rama de
configuración iOS. Quedan 50 avisos (45 altos, 5 moderados, cero críticos), todos
originados en `braces`, `node-forge` y `sprintf-js`. Las últimas versiones estables
consultadas de esos paquetes siguen dentro de los rangos señalados por npm.

Validación del estado final:

- 170 pruebas móviles correctas, en 30 suites.
- Una prueba adicional Node del consumidor `xcode`, sin mocks, correcta.
- `expo install --check`: dependencias actualizadas para SDK 54.
- Exportaciones Hermes Android/iOS con mapas de fuentes, correctas.
- Revisión automática de 4.172 fuentes Android y 4.167 iOS: ninguno de los tres
  paquetes de origen aparece en los bundles JavaScript generados.

Esta evidencia acota la exposición de esos artefactos: los avisos permanecen en
la cadena de herramientas de desarrollo, prueba y firma. La comprobación no es
una auditoría de bibliotecas nativas, del servidor ni de la seguridad del proceso
que ejecuta esas herramientas. Tampoco acredita una instalación física en iPhone.
Se conserva el seguimiento de los avisos y no se declara que `npm audit` pase.

Comprobaciones adicionales desde `Frontend_App`:

```sh
npm run test:ios-tools
# Tras expo export --platform android --platform ios --source-maps ...
npm audit --json > /tmp/nextfit-mobile-audit.json # devuelve 1 mientras existan avisos
npm run test:bundle-tooling
npm run check:bundle-tooling -- RUTA_EXPORTACION /tmp/nextfit-mobile-audit.json
```

Los proyectos PBX usados por la prueba son temporales y se eliminan al terminar.
Los mapas de fuentes de la revisión se guardan fuera del repositorio. No publicar
estos artefactos de análisis como una build firmada o un despliegue de la app.

## Comprobación dinámica y diferencia de recuentos (20 de octubre)

La comprobación de mapas toma ahora un informe completo de `npm audit --json`
y deriva todos los paquetes con avisos directos. Ya no depende de una lista
fija de tres nombres: un aviso nuevo sobre otro paquete se comprueba también.
Un informe fallido/incompleto, un mapa vacío o la ausencia de una plataforma
provocan error. La detección contempla mapas indexados, paquetes con ámbito y
rutas Windows. No se ignoran avisos ni se consideran resueltos por estar fuera
del bundle.

Seis pruebas Node aisladas pasan, incluida la detección de un paquete ficticio
nuevo que no estaba en la lista antigua. El análisis repetido de los mapas
Hermes ya generados pasa con 4.172 fuentes Android y 4.167 iOS. No se generan
nuevas builds ni se modifica código móvil de producto o dependencias.

La nueva consulta al registro confirma las mismas últimas versiones estables:
`braces@3.0.3`, `node-forge@1.4.0` y `sprintf-js@1.1.3`, todas afectadas por sus
avisos. El árbol instalado usa `sprintf-js@1.0.3`, también afectado.

En esta pasada, `npm audit --json` sobre el árbol instalado informa **93 avisos
(88 altos y 5 moderados)**; `npm audit --package-lock-only --json` informa
**50 (45 altos y 5 moderados)**. Ambos informes contienen los mismos tres
avisos de origen. El exceso del árbol instalado se propaga por consumidores y
relaciones con React Native, sin un aviso directo nuevo; `npm ls --depth=0` no
reporta problemas. Se registran ambos recuentos y no se presenta el menor como
resultado de la auditoría instalada. Las verificaciones de exclusión de paquetes
solo acotan JavaScript: herramientas y bibliotecas nativas siguen fuera de su
alcance.


## Reinstalación y artefactos tras corregir reintentos móviles

Se reinstaló con npm ci para reparar archivos faltantes de la instalación, sin
modificar versiones ni lockfile. La suite posterior pasa con 182 pruebas en 31
suites. La nueva exportación Android/iOS termina correctamente y el escáner sobre
los mapas nuevos vuelve a descartar los tres orígenes de avisos en JavaScript.
La auditoría instalada sigue en 93 avisos (88 altos, 5 moderados, cero críticos).
Las exportaciones no sustituyen un build firmado ni la validación física.

En este entorno la CLI requiere caché escribible y telemetría desactivada:

```sh
CI=1 EXPO_NO_TELEMETRY=1 __UNSAFE_EXPO_HOME_DIRECTORY=/workspace/.cache/expo EXPO_PUBLIC_API_BASE_URL=https://nextfit-pa8i.onrender.com npx expo export --platform android --platform ios --source-maps --output-dir /workspace/nextfit-setup/mobile-retry-reviewed
```

La corrección de reintentos no elimina avisos npm: impide reenviar escrituras
cuando no llegó su respuesta. Solo GET/HEAD conservan un reintento de transporte.


La revisión posterior de restauración inicial y persistencia móvil termina con
194 pruebas en 32 suites y una exportación Android/iOS nueva correcta, en
`/workspace/nextfit-setup/mobile-session-reviewed`. El escáner vuelve a pasar sobre
esos mapas nuevos. No hay cambios de dependencias ni eliminación de avisos de
herramientas; las pruebas de carrera no equivalen a validación física en iPhone.


La protección posterior de la renovación HTTP por cuenta termina con 203 pruebas
en 33 suites. La exportación nueva y su escáner pasan en
`/workspace/nextfit-setup/mobile-refresh-reviewed`. Las versiones de dependencias
permanecen iguales y sus avisos no se dan por resueltos.
