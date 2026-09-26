# NextFit — Diseño de identidad, autorización y JWT (Fase 1.2)

**Estado:** diseño aprobado para implementación posterior. Este documento no implementa JWT ni cambia la seguridad actual.

## 1. Decisiones de alcance

### Identidad autenticada

La identidad canónica de Fase 1 es el registro existente de `Cliente` o `Entrenador`. Se representa lógicamente así:

```text
AuthenticatedUser
- userId: UUID
- email: String normalizado
- role: CLIENTE | ENTRENADOR
```

`userId` será el identificador principal y el claim `sub` del access token. Es compatible con las entidades reales actuales, cuyos IDs son UUID, y evita depender de un email que puede cambiarse. El email se mantiene como claim auxiliar para diagnóstico y carga de usuario, no como autorización.

No se cambia el modelo JPA en esta fase de diseño. Durante el login, el backend debe buscar el email en ambas tablas y rechazar de manera segura una ambigüedad (existencia en ambas) hasta que una futura migración unifique identidad. El registro ya debe impedir dicha duplicidad de forma consistente y transaccional.

### ADMIN

**Decisión: excluir ADMIN del login y del JWT de producción en Fase 1.**

`Administrador` es residual: no contiene email ni contraseña operativa, no forma parte de `UserDetailsService` y no tiene UI o permisos reales. Incluirlo ahora exigiría diseñar y migrar una tercera identidad, ampliando el alcance y el riesgo.

Las operaciones administrativas se deshabilitarán en producción hasta una fase explícita de administración. No se usará query string secreto, cabecera estática ni credencial compartida temporal. En desarrollo/test podrán estar disponibles sólo mediante perfil/configuración segura que se defina en la tarea de implementación correspondiente.

## 2. Convención de roles

El dominio soportado en Fase 1 tiene exactamente dos roles:

| Capa | Cliente | Entrenador |
|---|---|---|
| Enum Java propuesto | `Role.CLIENTE` | `Role.ENTRENADOR` |
| Authority Spring | `ROLE_CLIENTE` | `ROLE_ENTRENADOR` |
| Claim JWT `role` | `CLIENTE` | `ENTRENADOR` |
| JSON API | `CLIENTE` | `ENTRENADOR` |
| Web y móvil | `CLIENTE` | `ENTRENADOR` |

La API no aceptará roles creados por el cliente en login, refresh ni actualización de perfil. La capa de persistencia puede conservar temporalmente valores `ROLE_*`; el adaptador de autenticación será el único responsable de normalizarlos. No se mezclarán `cliente`, `CLIENTE` y `ROLE_CLIENTE` fuera de esa frontera.

## 3. Access token JWT

### Claims

| Claim | Obligatorio | Fuente | Validación / motivo |
|---|---:|---|---|
| `sub` | Sí | UUID de Cliente o Entrenador | UUID válido; identidad estable y principal canónico |
| `role` | Sí | Rol persistido normalizado | Sólo `CLIENTE` o `ENTRENADOR`; autorización inicial |
| `email` | Sí | Email persistido normalizado | Sólo informativo y para carga de usuario; no autoriza por sí solo |
| `iat` | Sí | Servidor | Momento de emisión |
| `exp` | Sí | Servidor | Caducidad estricta |
| `iss` | Sí | Configuración | Debe coincidir exactamente con `nextfit-api` por entorno |
| `aud` | Sí | Configuración | Debe incluir el consumidor esperado (`nextfit-web`, `nextfit-mobile` o audiencia común definida) |
| `jti` | Sí | UUID aleatorio servidor | Trazabilidad y futura revocación selectiva |

No se incluirán contraseña, datos físicos, entrenador asignado, lista de clientes, perfil, permisos derivados ni decisiones de ownership. Éstas se consultan en servidor.

### Parámetros

- Algoritmo inicial: **HS256** con una clave aleatoria de al menos 256 bits, codificada en Base64 y sólo en secretos de entorno. La elección podrá migrar a RS256 cuando exista gestión de claves/asimetría.
- Duración: **15 minutos**.
- `issuer`: `nextfit-api` configurable por entorno.
- `audience`: audiencia común `nextfit-clients` inicialmente; la aplicación receptora se identifica por cliente de refresh, no se confía en una cabecera proporcionada por navegador.
- Skew máximo: **60 segundos**.
- Al expirar: `401 TOKEN_EXPIRED`; el cliente intenta refresh una vez y, si falla, elimina sesión y vuelve a login.
- Firma, `iss`, `aud`, `exp`, `sub` UUID y rol permitido son obligatorios antes de crear `SecurityContext`.

## 4. Refresh token

Se adopta refresh token rotativo, opaco y aleatorio; no será un JWT. Cada token se almacena en backend sólo como hash, con `userId`, familia de token, cliente, expiración, fecha de revocación y metadatos mínimos de auditoría.

| Aspecto | Diseño |
|---|---|
| Duración | 30 días; menor si el producto requiere política más estricta |
| Rotación | Cada refresh invalida el token anterior y crea uno nuevo |
| Replay | Reutilizar un token ya rotado revoca toda su familia y exige login |
| Logout | Revoca el token/familia actual; logout global será una operación explícita futura |
| Web | Cookie `HttpOnly`, `Secure`, `Path=/api/auth`, `SameSite` estricto/lax según dominios finales |
| Móvil | Valor en `expo-secure-store`/Keychain/Keystore, nunca AsyncStorage |
| Access token | Sólo memoria en web y móvil; no localStorage/sessionStorage/AsyncStorage |

El endpoint de refresh web requerirá cookie `Secure`, origen CORS estricto y protección CSRF adicional: comprobación de `Origin`/`Referer` permitido y token anti-CSRF de doble envío o cabecera anti-CSRF. El refresh móvil manda el refresh token mediante body/cabecera sobre TLS, nunca depende de cookies de navegador.

## 5. Contratos de autenticación

### Login

`POST /api/auth/login`

```json
{
  "email": "persona@ejemplo.com",
  "password": "..."
}
```

Respuesta `200` para web:

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "persona@ejemplo.com",
    "role": "CLIENTE"
  }
}
```

El refresh se entrega exclusivamente como cookie HTTP-only para el flujo web. Para móvil, el mismo endpoint debe usar un mecanismo explícito de cliente (por ejemplo, cabecera/versionado de cliente) y devolver el refresh token sólo a la app, que lo guarda en SecureStore. No se expondrá el refresh token web en JSON.

### Refresh y logout

- `POST /api/auth/refresh`: emite access token nuevo y rota refresh token.
- `POST /api/auth/logout`: revoca refresh actual; en web borra cookie con mismos atributos; en móvil invalida el token presentado y la app borra SecureStore.
- `GET /api/auth/me`: devuelve la identidad canónica a partir del principal, no de IDs enviados por el cliente.

### Errores

```json
{
  "status": 401,
  "code": "INVALID_CREDENTIALS",
  "message": "Credenciales no válidas"
}
```

| HTTP | Código | Exposición |
|---:|---|---|
| 401 | `INVALID_CREDENTIALS` | Login; no revela si el email existe |
| 401 | `MISSING_TOKEN` | Ruta protegida sin Bearer |
| 401 | `INVALID_TOKEN` | Firma/formato/claims inválidos |
| 401 | `TOKEN_EXPIRED` | Access token expirado |
| 403 | `FORBIDDEN` | Rol u ownership insuficiente |
| 404 | `ACCOUNT_NOT_FOUND` | Sólo para operaciones autenticadas donde no filtra enumeración; si es login se usa `INVALID_CREDENTIALS` |
| 423 | `ACCOUNT_DISABLED` | Reservado; no se implementa hasta tener estado de cuenta |

No se devolverán trazas, nombres de tablas, diferencias entre usuario inexistente y contraseña incorrecta, ni información de tokens.

## 6. Política deny-by-default y ownership

La configuración final declara sólo rutas públicas. Toda ruta restante exige autenticación. La autorización se aplica en dos capas:

1. Spring Security: autenticación y rol general.
2. Servicios/controladores: ownership basado exclusivamente en `AuthenticatedUser` derivado del token.

### Reglas formales

**Cliente** puede operar sobre su propio perfil, sus rutinas, su calendario, sus sesiones, sus estadísticas y conversaciones en las que sea participante.

**Entrenador** puede operar sobre su propio perfil y sobre clientes actualmente asignados. Puede gestionar sólo rutinas que creó o que el dominio le permite asignar; calendario, progreso, sesiones y chat de un cliente requieren relación activa entrenador-cliente. No obtiene acceso por enviar `entrenadorId` en path o query.

**Excepciones públicas**: catálogo de ejercicios de lectura, listado de entrenadores públicos, perfil público de entrenador limitado, login/registro/recuperación de contraseña, raíz y health. Los perfiles públicos no incluyen contraseña, email privado ni relaciones.

## 7. Matriz definitiva endpoint–rol

La columna Ownership se aplica después de que la ruta haya pasado el control de rol. `—` significa que no aplica; `REVISAR` implica que el contrato de negocio debe confirmarse antes de codificar.

| Método | Ruta | Público | CLIENTE | ENTRENADOR | Ownership requerido | Notas |
|---|---|:---:|:---:|:---:|---|---|
| POST | `/api/auth/login` | Sí | — | — | — | Nuevo contrato |
| POST | `/api/auth/refresh` | Sí* | — | — | Refresh válido | Público sólo en sentido de no requerir access JWT |
| POST | `/api/auth/logout` | No | Sí | Sí | Token/familia propia | |
| GET | `/api/auth/me` | No | Sí | Sí | Principal propio | |
| POST | `/api/register` | Sí | — | — | — | Sólo CLIENTE/ENTRENADOR normalizados |
| POST | `/api/auth/password/forgot` | Sí | — | — | — | Respuesta no enumera emails |
| POST | `/api/auth/password/reset` | Sí | — | — | Token reset válido | |
| GET | `/` y `/api` | Sí | — | — | — | No incluir datos sensibles |
| GET | `/actuator/health` | Sí | — | — | — | Sólo health; no exponer otros actuator |
| GET | `/api/clientes` | No | No | REVISAR | Relación/uso operativo | Preferir eliminar o paginar y limitar |
| GET | `/api/clientes/{id}` | No | Sí | Sí | Cliente: `id==sub`; entrenador: asignación activa | |
| GET | `/api/clientes/buscar` | No | No | Sí | Uso de captación; resultado mínimo | Evitar enumeración indiscriminada |
| PUT | `/api/clientes/{id}` | No | Sí | No | `id==sub` | Nunca acepta rol/password genérico |
| POST | `/api/clientes/onboarding` | No | Sí | No | `idCliente==sub` | Consolidar con ruta auth/perfil posteriormente |
| POST | `/api/clientes/{id}/desvincular-entrenador` | No | Sí | No | `id==sub` | |
| GET | `/clientes/{id}` | No | Sí | Sí | Igual a perfil cliente | Ruta legado: retirar o redirigir |
| GET | `/entrenadores/{id}` | Sí | — | — | Perfil público limitado | Ruta legado: consolidar |
| GET | `/api/entrenador/publicos` | Sí | — | — | — | Sólo perfiles `perfilPublico` |
| GET | `/api/entrenador/{id}` | Sí | — | — | Perfil público limitado | Si el perfil no es público, 404/403 según contrato |
| GET | `/api/entrenador/{id}/reviews` | Sí | — | — | Perfil público | |
| POST | `/api/entrenador/{id}/resena` | No | Sí | No | Cliente no puede reseñarse; REVISAR una reseña por relación | |
| PUT | `/api/entrenador/{id}` | No | No | Sí | `id==sub` | Sin rol/password genérico |
| GET | `/api/entrenador/{id}/clientes` | No | No | Sí | `id==sub` | |
| GET | `/api/entrenador/{id}/dashboard-resumen` | No | No | Sí | `id==sub` | |
| POST | `/api/entrenador/{id}/fichar` | No | No | Sí | `id==sub`; cliente elegible | |
| POST | `/api/entrenador/{idEntrenador}/desvincular/{idCliente}` | No | No | Sí | `idEntrenador==sub` y asignación activa | |
| POST | `/api/entrenador/onboarding` | No | No | Sí | `idEntrenador==sub` | Consolidar posteriormente |
| POST | `/api/rutinas/manual` | No | Sí | Sí | Cliente: propio; entrenador: cliente asignado y creador derivado | Ignorar IDs/creador que contradigan principal |
| POST | `/api/rutinas/auto` | No | Sí | No | `idCliente==sub` | |
| GET | `/api/rutinas/cliente/{idCliente}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/rutinas/cliente/{idCliente}/entrenador` | No | Sí | Sí | Cliente propio; entrenador asignado y filtro derivado | No confiar en query `entrenadorId` |
| GET | `/api/rutinas/plantillas/{entrenadorId}` | No | No | Sí | `entrenadorId==sub` | |
| PUT | `/api/rutinas/{id}` | No | Sí | Sí | Cliente dueño; entrenador creador/asignado | |
| DELETE | `/api/rutinas/{id}` | No | Sí | Sí | Cliente dueño; entrenador creador/asignado | |
| POST | `/api/rutinas/clonar/{plantillaId}/cliente/{clienteId}` | No | No | Sí | Plantilla propia y cliente asignado | |
| GET | `/api/calendario/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado | Filtro entrenador derivado de principal |
| POST | `/api/calendario/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado y rutina autorizada | |
| DELETE | `/api/calendario/{eventoId}` | No | Sí | Sí | Evento de cliente propio/asignado; entrenador creador cuando aplique | |
| PUT | `/api/calendario/{eventoId}/toggle` | No | Sí | No | Evento de cliente propio | |
| PUT | `/api/calendario/{eventoId}/mover` | No | Sí | Sí | Evento de cliente propio/asignado | |
| POST | `/api/sesiones` | No | Sí | No | `clienteId` derivado de principal | Entrenador no registra sesiones como cliente |
| GET | `/api/sesiones/cliente/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/sesiones/evento/{eventoId}` | No | Sí | Sí | Evento de cliente propio/asignado | |
| GET | `/api/sesiones/ultima` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/sesiones/{entrenadorId}/dashboard-resumen` | No | No | Sí | `entrenadorId==sub` | Consolidar con dashboard entrenador |
| GET | `/api/dashboard/resumen/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/stats/global/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/stats/ejercicio/{clienteId}/{ejercicioId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/stats/prs/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/stats/ejercicios/{clienteId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/stats/progreso/{clienteId}/{ejercicioId}` | No | Sí | Sí | Cliente propio; entrenador asignado | |
| GET | `/api/chat/historial` | No | Sí | Sí | Principal debe ser uno de los participantes | No aceptar ambos IDs como autoridad |
| GET | `/api/chat/contactos` | No | Sí | Sí | `usuarioId` derivado de principal | |
| POST | `/api/upload` | No | Sí | Sí | Archivo asociado a principal/uso permitido | |
| GET | `/api/upload/files/{filename}` | REVISAR | REVISAR | REVISAR | Según visibilidad del recurso | Perfil público puede ser público; adjuntos chat privados |
| GET | `/api/ejercicios`, `/total`, `/buscar`, `/imagen/{apiId}` | Sí | — | — | — | Catálogo de lectura público |
| POST | `/api/ejercicios/importar` | No | No | No | Operación deshabilitada en producción | Futuro ADMIN |
| POST | `/api/ejercicios/importar-json` | No | No | No | Operación deshabilitada en producción | Futuro ADMIN |
| POST | `/api/ejercicios/retraducir` | No | No | No | Operación deshabilitada en producción | Futuro ADMIN |
| GET/POST | Rutas MVC legado `/menucliente/**`, `/cliente/perfil/**`, `/cliente/editar/**`, `/menuentrenador` | No | REVISAR | REVISAR | Igual que equivalente REST | Inventariar y retirar/consolidar antes de producción |

## 8. Chat/STOMP

El handshake STOMP debe validar JWT (en cabecera STOMP `Authorization: Bearer ...` o mecanismo equivalente compatible con SockJS) y asociar un `Principal` al socket. Un interceptor de canal validará CONNECT y SUBSCRIBE.

- El servidor deriva el remitente desde `Principal`; `senderId/remitenteId` enviado por payload se ignora o se rechaza.
- El servidor valida que el destinatario existe y que ambos participantes tienen relación permitida.
- Sólo se permite suscribir al canal del `userId` del principal. Alternativamente se usarán destinos de usuario Spring (`/user/queue/mensajes`), evitando IDs en topics públicos.
- Historial REST requiere que el principal sea participante y, cuando aplique, que exista relación activa cliente-entrenador.
- Marcar leído deriva destinatario del principal y valida que es receptor real.

## 9. Recuperación y cambio de contraseña

### Recuperación

1. `POST /api/auth/password/forgot` recibe `{ "email": "..." }` y siempre devuelve una respuesta neutra.
2. Si existe cuenta, genera token criptográficamente aleatorio de un uso.
3. Persiste sólo hash, `userId`, expiración corta (15–30 min), consumo y metadatos mínimos.
4. Envía enlace por correo en una fase posterior; no se implementa correo en esta tarea.
5. `POST /api/auth/password/reset` recibe token y nueva contraseña, valida, aplica BCrypt y consume/invalida token.

### Cambio autenticado

`PUT /api/auth/password` recibe:

```json
{ "currentPassword": "...", "newPassword": "..." }
```

Requiere access token válido, comprueba la contraseña actual con BCrypt, aplica BCrypt a la nueva y puede revocar refresh tokens de la cuenta. Los `PUT` genéricos de perfil no aceptarán `password`, `contrasena`, `role`, `id` ni campos de autorización.

## 10. Uploads

Todo upload requiere `AUTHENTICATED`. El backend genera nombre opaco/UUID, no conserva el nombre original como ruta y asocia metadatos de propietario, tipo de uso y visibilidad.

| Uso | Actor | Tipos y tamaño | Acceso |
|---|---|---|---|
| Foto de perfil | Propietario | JPEG/PNG/WebP; límite reducido, p.ej. 5 MB | Público sólo si el perfil lo es |
| Adjunto de chat | Participante de chat | Lista explícita de imágenes/documentos; límite definido | Sólo participantes autorizados |
| Vídeo | Sólo flujo explícito futuro | MIME validado por contenido, límite específico | Privado/Cloudinary con autorización |

Se validan MIME real y extensión, tamaño, número de archivos y se bloquean ejecutables/SVG activo según política. Para contenido privado se usa URL firmada o endpoint autorizado, no un nombre de archivo adivinable.

## 11. CORS y CSRF futuros

- REST con access JWT en `Authorization`: backend stateless y CSRF desactivado es aceptable.
- CORS REST permite sólo orígenes explícitos por entorno; no `*.vercel.app` en producción salvo control estricto de subdominios.
- `allowCredentials` sólo se mantiene para la ruta de refresh/logout web que usa cookie; no es necesario para la mayoría de API Bearer.
- WebSocket comparte una única lista explícita de orígenes con REST, pero valida token y destino de manera independiente.
- Refresh basado en cookie usa `Secure`, `HttpOnly`, `SameSite` adecuado, validación de `Origin`/`Referer` y mecanismo anti-CSRF.
- Móvil usa TLS y refresh token en almacenamiento seguro; no depende de CORS/cookies.

## 12. Tareas posteriores verificables

| Tarea | Objetivo | Archivos probables | Pruebas / depende de |
|---|---|---|---|
| 1.3 | Consolidar contrato de entidades/roles y eliminar ambigüedad de identidad | entidades, DAOs, DTOs | tests de búsqueda única; depende de 1.2 |
| 1.4 | Actualizar e integrar librería JWT | `pom.xml`, configuración de entorno | arranque y parsing JWT; depende de 1.2 |
| 1.5 | Crear DTOs y `AuthService` para login/me/errores | DTOs, servicio, controlador auth | login correcto/incorrecto; depende de 1.3–1.4 |
| 1.6 | Implementar `JwtService` | servicio JWT, propiedades | firma, exp, iss/aud, skew; depende de 1.4 |
| 1.7 | Implementar filtro JWT y SecurityConfig stateless | config y filtro | rutas públicas, 401, roles; depende de 1.5–1.6 |
| 1.8 | Retirar formLogin/sesión y migrar login web/móvil | backend, web, móvil | login/logout y token en memoria; depende de 1.7 |
| 1.9 | Implementar ownership de cliente/entrenador | servicios/controladores/DAOs | matriz IDOR; depende de 1.7 |
| 1.10 | Proteger REST/STOMP de chat | WebSocket config, interceptor, chat | subscribe/sender/participant; depende de 1.7 y 1.9 |
| 1.11 | Recuperación y cambio de contraseña seguro | auth, persistencia reset token | token único, BCrypt, expiración; depende de 1.5 |
| 1.12 | Refresh token rotativo/logout | entidad/tabla, auth, web, móvil | rotación, replay, revocación; depende de 1.5–1.8 |
| 1.13 | Endurecer uploads y exposición de archivos | UploadController, almacenamiento | MIME, tamaño, ownership; depende de 1.7 y 1.9 |
| 1.14 | CORS/CSRF final y pruebas de integración | Security/WebSocket config | CORS, refresh CSRF, deny-by-default; depende de 1.7 y 1.12 |

No se inicia ninguna de estas tareas mediante este documento.
