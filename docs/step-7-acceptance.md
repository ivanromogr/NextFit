# Informe de aceptación de pruebas — parte 7

Actualizado el 26 de octubre de 2026. Rama: `codex/mobile-ux`.

## Dictamen

**Aceptación funcional comprobada. Publicación todavía no aprobada.**
Los resultados siguientes no convierten una exportación JavaScript en una
aplicación iOS instalada ni acreditan disponibilidad continua de producción.

## Resultados y evidencia

| Comprobación | Resultado y alcance |
|---|---|
| Pruebas de aplicación | Backend 401, web 461, móvil 218: 1.080 correctas en las últimas ejecuciones registradas. No se repiten solo para actualizar una fecha. |
| Recorrido integrado local | Ambos perfiles, chat, entrenamientos, permisos, recuperación y baja, con H2 aislado y API real. |
| Preview web | Commit de aplicación `4440f0bd00d32c022a8f77942a9849cac6439baa`, despliegue `dpl_GkbyG48NwRJ2Tw5vvqL85sPpXB8A`. Alias, doce controles públicos y acceso/recarga reales de ambos perfiles verificados. |
| Sesiones y carreras | Regresiones web/móvil verifican aislamiento entre cuentas y rechazo de respuestas antiguas; prueba local de cookie con Chromium y rotación real. |
| GitHub Actions móvil | Success en [40319443807](https://github.com/ivanromogr/NextFit/actions/runs/40319443807), commit exacto `9091e05059bd01bc47c3f1ed33d056fa959c3400`, verificado directamente en la página pública después de retirar el parche de braces. |
| GitHub Actions web | Success en [40315100285](https://github.com/ivanromogr/NextFit/actions/runs/40315100285), commit exacto `0175db1c01571139e85efe77accbc25261c17aeb`, verificado directamente mediante el resumen público de ejecución y su enlace al commit. Incluye auditoría estricta, lint, pruebas y build. |
| Cuenta ficticia antigua | Consulta de solo lectura ejecutada en DBeaver por el propietario: cero clientes y entrenadores activos con los marcadores exactos. No requiere borrado. |
| Credencial PostgreSQL | Nueva credencial aplicada al mismo backend, despliegue `dep-dbfiaqgm7kps7397lho0`; retirada de la antigua confirmada por el propietario. Pruebas posteriores de lectura, escritura, sesión y baja correctas. |
| Auditoría web actual | Cero avisos tras actualizar únicamente Zod 4.1.12 → 4.6.7, dependencia de desarrollo de ESLint. Instalación limpia, lint y build correctos. |
| Auditoría móvil actual | Seis avisos altos, cero moderados/críticos, tanto instalada como lockfile; único origen enumerado: node-forge. La mitigación propia se conserva y se verifica. |
| Compatibilidad Forge | Suite original comparada sin/con guardia: 828 correctas, 4 omitidas, 0 fallos en ambas; mismo inventario. Evidencia externa, sin sumar a las 1.080 pruebas de aplicación. [Detalle](node-forge-compatibility.md). |
| Exportaciones móviles | Android/iOS generadas y verificadas; los mapas de 4.172/4.167 fuentes no incluyen el origen señalado por la auditoría actual. No son builds firmadas. |

La actualización de Zod es posterior a la aceptación remota del commit web
indicado. Cambia únicamente el lockfile de una herramienta de lint, sin código
de aplicación. Se verificaron instalación, auditoría, lint y compilación localmente. Después
GitHub Actions pasó también sobre el commit 0175db1, que incluye este lockfile.
No se atribuye ese lockfile a la preview anterior ni un recuento remoto de
pruebas que no se haya leído en los logs detallados de GitHub.

## Observaciones pendientes para publicación

- **Operación de Render:** el registro aportado muestra conexión correcta a
  PostgreSQL y arranque de 177 segundos. Después hay sondas rápidas correctas,
  pero también timeouts previos de 210 segundos sin correlación completa.
  No hay causa demostrada para todos los periodos de indisponibilidad. El
  propietario confirma que CPU/RAM requieren pago en su panel; no se contrata
  nada ni se convierte esa limitación en una prueba de estabilidad.
- **Cadena de herramientas móvil:** la última versión estable consultada de
  node-forge sigue siendo 1.4.0, afectada. La protección propia rechaza las
  estructuras malformadas reproducidas, con pruebas positivas y negativas, pero
  no es un parche oficial ni una auditoría de toda la cadena de firma. La
  modificación propia de braces se retira: GitHub retiró su aviso el 23 de
  octubre por no considerarlo explotable en la práctica. La instalación limpia
  restaura el código publicado de braces 3.0.3; no es un parche de seguridad nuevo.
- **Dispositivo y proveedores reales:** iPhone, build iOS firmada, Google/Apple
  nativos y correo real siguen aplazados; pertenecen a los hitos de dispositivo
  y publicación y no se presentan como pruebas ejecutadas.

No hace falta volver a consultar fixtures, rotar de nuevo la credencial ni pedir
otra captura del mismo workflow por cambios exclusivos de web/documentación.
Los nuevos intentos de diagnóstico deben aportar evidencia adicional, no repetir
sondas y reinicios como sustituto de resolver los límites conocidos.

Historial y reproducción: [estado técnico](step-7-handoff.md),
[pruebas generales](testing-general.md),
[dependencias móviles](mobile-dependencies.md).

## Preparación previa a proveedores, 26 de octubre

Backend y móvil se vuelven a verificar tras las correcciones de medios y cuenta:
401 y 218 pruebas respectivamente. El backend pasa también sin secretos de
proveedores. El recorrido integrado local completo con H2 pasa y sus procesos se
cierran. Las exportaciones móviles actuales pasan el escáner con el informe de
seis avisos cuyo origen es node-forge: 4.172 fuentes Android y 4.167 iOS. No se
ha conectado ninguna API de pago ni actualizado el backend de producción.

Se añaden icono y configuración nativa de NextFit, permisos coherentes con galería,
acceso a documentos legales con o sin sesión, aislamiento de preferencias entre
cuentas y configuración por plataforma de Google. La inspección de configuración
nativa y los tests no acreditan una IPA ni los permisos de un dispositivo real.
Se prepara además CI Java 21 para el backend; su resultado remoto debe verificarse
para el nuevo commit, sin atribuirle ejecuciones de commits anteriores.

Pendientes del propietario: correo público todavía sin crear, identidad legal,
cuenta/firma Apple y prueba real en iPhone. Antes del despliegue de cambios de
esquema sigue faltando copia recuperable y ensayo de migraciones. Las condiciones
para [conectar la API de ejercicios](exercise-api-checkpoint.md) están separadas
de su contratación; después se revisará la adaptación del entrenamiento a las
selecciones reales del usuario. AI Coach continúa aplazado.
