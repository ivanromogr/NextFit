# Estado de cierre del paso 7

Comprobado el 20 de octubre de 2026. Repositorio `ivanromogr/NextFit`, rama
`codex/mobile-ux`. Preservar el `app.json` raíz sin seguimiento. No fusionar main
ni contratar servicios. El paso 7 no está cerrado para publicación.

## Completado

- Backend: 386 pruebas; web: 436 en 64 archivos; móvil: 170. Total: 992.
  Backend y móvil conservan las ejecuciones anteriores; web se repitió tras el proxy.
- Lint web, build con manifest y 18 contratos Python correctos.
- Recorrido completo con ambos perfiles, API H2 y HTTP en el mismo origen:
  `scripts/check-local-beta.py --same-origin`, salida 0. Incluye chat,
  entrenamientos, privacidad, recuperación y baja. No acepta orígenes remotos.
- Prueba específica `scripts/check-local-session-proxy.py`, salida 0 para ambos
  roles: login, recarga, baja y rechazo posterior de login/JWT/refresh.
- Producción Render conserva SHA `d3b366b6ccb1873cbe2507badb1b8bf7e4ae5fac`.
  El usuario autorizó añadir el origen exacto de preview y redesplegar ese mismo
  SHA: `dep-dbbsisg473hc73cd240g`, live. Salud, permisos, CORS y Google inválido pasan.
- La preview `678f948dbc12b647b2d2c3ab1a1b0ca3124bf6bd`,
  `dpl_A14ja8jXP7E2R5jCAh4PG2YEXKQT`, pasa doce verificaciones públicas
  en móvil/escritorio y el rechazo de login ficticio contra Render.

## Corrección que falta validar en Vercel

Las pruebas con cuentas ficticias reales detectaron que Chromium bloquea por
`UserPreferences` la cookie de Render, ubicada en otro dominio. Login da 200,
pero refresh devuelve 401. Las cuentas temporales se dieron de baja; se verificó
revocación en las ejecuciones posteriores a corregir la lectura del charset.
No se usaron cuentas personales ni se enviaron correos externos.

El código de aplicación `ce18e94` añade rewrite `/api/:path*` y
`VITE_API_SAME_ORIGIN=true`. La opción se configuró exclusivamente para previews
de `codex/mobile-ux`; producción web no cambia. WebSocket/SockJS conserva el
backend de `VITE_WS_URL`. Los recorridos completos locales del proxy pasan.

Vercel rechazó crear la nueva preview con 402 `api-deployments-free-per-day`.
No existe preview del candidato nuevo en la última consulta. No repetir solicitudes
en bucle ni comprar una ampliación. No confundir la preview anterior con la
corrección de cookies. Tras recuperar cuota, desplegar el SHA actual elegido,
verificar build con la opción de proxy activada y fijar el alias a ese despliegue.

## Acceso y comandos

Alias estable:
`https://next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app`.
La clave de automatización ya está en el proyecto correcto `next-fit-q7uo`.
Conservar TLS, SSO y el encabezado limitado a ese hostname; no imprimir secretos.
Usar `/workspace/nextfit-setup/browser-venv/bin/python` y Chromium del sistema.
El acceso a los certificados del sistema requiere la ejecución autorizada.

```sh
python3 scripts/check-vercel-candidate.py --stable-alias --commit SHA_COMPLETO
/workspace/nextfit-setup/browser-venv/bin/python scripts/check-public-web.py --base-url https://next-fit-q7uo-git-codex-mobile-ux-ivanromo1708-6643s-projects.vercel.app
```

Los controles públicos interceptan la API. Completar después login y recarga
reales para cliente y entrenador sobre la nueva preview con cuentas temporales,
verificando baja y revocación al terminar. No relajar el bloqueo de cookies de
terceros para ocultar el fallo. Los ensayos remotos específicos de esta sesión
están en `/tmp/nextfit-authenticated-preview-check.py`; contienen lógica de prueba,
no credenciales guardadas. No ejecutar sin verificar primero origen y candidato.

## Otros límites

Los avisos móviles de braces 3.0.3, node-forge 1.4.0 y sprintf-js hasta 1.1.3
siguen sin versión estable corregida identificada. No forzar Expo/Jest ni
silenciar avisos. El escáner dinámico de mapas acota el bundle JS, sin acreditar
seguridad del proceso de firma ni de bibliotecas nativas.

Correo real aplazado por el propietario: no hay dominio/remitente ni credencial
de proveedor; las pruebas de enlaces usan buzón local de memoria. iPhone físico,
Google/Apple nativos y Apple Developer siguen aplazados. API de ejercicios de pago
queda para el final. Mantener estos límites visibles al preparar la publicación.

Detalle histórico: [Pruebas generales](testing-general.md).
