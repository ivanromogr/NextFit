# Dependencias móviles: revisión del 20 de octubre de 2026

La auditoría npm pasa de 61 a **50 avisos**: 45 altos, 5 moderados y cero críticos.
No son 59 fallos independientes: npm incluye los paquetes afectados por depender
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
npm run check:bundle-tooling -- RUTA_EXPORTACION
```

Los proyectos PBX usados por la prueba son temporales y se eliminan al terminar.
Los mapas de fuentes de la revisión se guardan fuera del repositorio. No publicar
estos artefactos de análisis como una build firmada o un despliegue de la app.
