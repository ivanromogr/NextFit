# Retomar el paso 7

Estado comprobado el 20 de octubre de 2026. Repositorio `ivanromogr/NextFit`,
rama de trabajo `codex/mobile-ux`. Los cambios están subidos; no se fusiona con
`main` ni se despliega producción. Preservar el `app.json` raíz sin seguimiento.

## Evidencia vigente

- Backend: 386 pruebas; web: 432 en 62 archivos; móvil: 170. Total: 988.
- Compilación web, JAR, lint y recorrido completo local de ambos roles correctos.
- Contratos de comprobadores: quince, contabilizados aparte.
- Detalle y límites: [Pruebas generales](testing-general.md).

## Acceso al entorno

La configuración ya está publicada (`draft_id: null`) y contiene el alias
estable de la rama. Esta instancia continúa recibiendo `Tunnel connection
failed: 403 Forbidden`, incluso al comprobar mediante la ejecución autorizada
fuera de su restricción. No se pide publicar de nuevo el mismo borrador.

Retomar desde una tarea nueva que utilice el entorno publicado y el checkout de
esta rama permite comprobar la política aplicada a esa nueva instancia. Revisar
primero `git status` y la rama existente; no crear worktrees ni sobrescribir
archivos locales. No asumir que los procesos o conexiones sobreviven a la
restauración. Las instrucciones de arranque están guardadas en el entorno.

## Candidato desplegado

La preview del candidato `4ddbca71668f2c723f5adf2137c3413efdb01dd8` está
READY: `dpl_BP5mcMf7uPZ8qhcK9B4WkHBpGpDo`. El alias estable se asignó a ese
despliegue y el comprobador de metadatos confirmó SHA, proyecto y alias.
Vercel aceptó esta creación; el bloqueo anterior de cuota ya no impidió este intento.
No se desplegó producción.

La clave de automatización está disponible en esta sesión. El comprobador público
limita su encabezado al hostname HTTPS exacto del alias mediante `preview_access.py`;
tres pruebas verifican la inclusión autorizada y la exclusión de otros orígenes,
HTTP, credenciales en URL, puertos y encabezados heredados. La prueba de navegador
con certificados del sistema sigue fallando con `ERR_TUNNEL_CONNECTION_FAILED`:
la aceptación visual desplegada permanece pendiente. No se desactivaron TLS ni SSO.

Comprobación de metadatos del candidato elegido:

```sh
python3 scripts/check-vercel-candidate.py --stable-alias --commit SHA_COMPLETO
```

Debe dar salida 0 y confirmar SHA, proyecto, READY y alias del mismo despliegue.
Después, con el dominio accesible:

```sh
python3 scripts/check-public-web.py --base-url https://next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app
```

Este segundo ensayo intercepta la API y comprueba páginas públicas: no sustituye
el login real ni el recorrido autenticado. Chromium requiere acceso a su almacén
NSS; conservar TLS y las autoridades originales. Mantener la protección Vercel.

## Otros bloqueos del cierre

El correo de Render sigue desactivado; faltan remitente, clave del proveedor y
URLs de enlaces. Las pruebas usan un buzón de memoria local, no recepción real.
No inventar un remitente ni enviar correos externos sin autorización.

Los avisos móviles siguen originados en braces 3.0.3, node-forge 1.4.0 y
sprintf-js hasta 1.1.3, sin versión estable corregida identificada. No forzar un
salto de Expo/Jest ni silenciar los avisos. iPhone físico, proveedores nativos y
Apple Developer siguen aplazados; la API de ejercicios de pago queda para el final.

El paso 7 permanece abierto para publicación hasta completar la aceptación del
candidato y resolver los otros bloqueos. No confundir las verificaciones locales
con el despliegue de las correcciones en el backend de producción.
