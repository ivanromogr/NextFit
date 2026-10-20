# Retomar el paso 7

Estado comprobado el 20 de octubre de 2026. Repositorio `ivanromogr/NextFit`,
rama de trabajo `codex/mobile-ux`. Los cambios están subidos; no se fusiona con
`main` ni se despliega producción. Preservar el `app.json` raíz sin seguimiento.

## Evidencia vigente

- Backend: 386 pruebas; web: 436 en 64 archivos; móvil: 170. Total: 992.
- Compilación web, JAR, lint y recorrido completo local de ambos roles correctos.
- Contratos de comprobadores: quince, contabilizados aparte.
- Detalle y límites: [Pruebas generales](testing-general.md).

## Acceso al entorno

La preview ya es accesible desde esta sesión con el secreto de automatización
restringido al hostname autorizado. El usuario añadió la clave al proyecto
correcto `next-fit-q7uo`; inicialmente estaba en otro proyecto llamado `next-fit`.
El recorrido público de navegador terminó correctamente con TLS y SSO conservados.
Usar `/workspace/nextfit-setup/browser-venv/bin/python` y el Chromium del sistema;
la ejecución requiere acceso al almacén de certificados del sistema.

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
con certificados del sistema terminó con salida 0: doce comprobaciones públicas
en 390x844 y 1365x900, incluyendo la redirección anónima de la ruta privada.
No se desactivaron TLS ni SSO. La API se intercepta: el login real y el recorrido
autenticado desplegado permanecen separados de esta validación.

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

## Corrección posterior al candidato público

Se limita a 15 segundos la espera de login y refresh tras observar un login de
preview sin respuesta y botón bloqueado durante 45 segundos. Doce pruebas dirigidas
pasan, incluida una con servidor HTTP real sin respuesta; también lint y build.
La nueva preview `678f948dbc12b647b2d2c3ab1a1b0ca3124bf6bd` está READY
(`dpl_A14ja8jXP7E2R5jCAh4PG2YEXKQT`) y su alias y doce comprobaciones públicas
pasan. El botón se libera tras el fallo de conexión en la prueba real. El propietario autorizó añadir el origen exacto a CORS y redesplegar el mismo
backend `d3b366b6ccb1873cbe2507badb1b8bf7e4ae5fac`:
`dep-dbbsisg473hc73cd240g`, live. Salud, controles públicos y preflight de preview
pasan. El login ficticio desde la preview recibe 401 y muestra el error correcto.
No se crearon cuentas: el acceso con una cuenta válida permanece pendiente.
La suite completa web pasa con 434 pruebas en 63 archivos.

## Nuevo candidato: cookies sin dependencia de terceros

La prueba remota con cuentas ficticias confirmó login, pero Chromium bloquea la
cookie cross-site de Render por `UserPreferences`; refresh devuelve 401. Las
cuentas se dieron de baja. La corrección posterior `ce18e94` usa un rewrite HTTP
`/api/:path*` y `VITE_API_SAME_ORIGIN=true`, configurado solo para las previews
de `codex/mobile-ux`. WebSocket conserva `VITE_WS_URL` hacia Render.

436 pruebas web en 64 archivos, lint y build pasan. El script
`check-local-session-proxy.py` pasa con ambos roles, H2, proxy local, recarga y
revocación tras baja. No acepta URLs remotas. El despliegue del candidato nuevo
recibe 402 por cuota diaria; no repetir en bucle ni contratar. La preview
`678f948` no contiene esta corrección; no sirve para aceptarla.

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
