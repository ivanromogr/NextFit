# Dependencias móviles: revisión del 20 de octubre de 2026

La auditoría npm pasa de 61 a **58 avisos**: 45 altos, 13 moderados y cero críticos.
No son 59 fallos independientes: npm incluye los paquetes afectados por depender
de otros vulnerables. La web mantiene su auditoría anterior sin avisos; en esta
revisión solo se modifica `Frontend_App`.

## Correcciones compatibles aplicadas

`package.json` contiene tres grupos de overrides deliberados y acotados:

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

Mantener estos overrides hasta que el SDK declare versiones corregidas. Al
actualizar Expo hay que comprobar si pueden retirarse, no copiarlos sin revisar.

## Avisos restantes y decisión técnica

Versiones contrastadas con el registro npm durante esta revisión:

| Dependencia de origen | Uso identificado | Situación |
|---|---|---|
| `braces@3.0.3` | `micromatch` de Jest | El aviso incluye la última versión estable publicada (3.0.3); no hay versión `next` publicada. No se inventa un parche ni se sustituye por una versión anterior vulnerable |
| `node-forge@1.4.0` | CLI Expo y certificados de firma | La última estable publicada, 1.4.0, sigue dentro del rango del aviso. Requiere seguimiento del proveedor o sustitución revisada del componente de firma |
| `sprintf-js` | `argparse` de la instrumentación de Jest | La última estable publicada (1.1.3) también está dentro del rango señalado; actualizar dentro de la misma API no elimina el aviso |
| `uuid@7.0.3` | Generación de identificadores de proyectos en `xcode` | El aviso afecta v3/v5/v6 y buffers proporcionados por el llamador. El código observado de `xcode` llama a `v4()` sin buffer. La exposición observada es distinta, pero el aviso de paquete permanece y no se declara resuelto |

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
