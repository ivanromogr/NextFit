# Privacidad y textos legales: inventario para la beta

19 de octubre de 2026. Documento de trabajo técnico; no es la política pública
ni una declaración de cumplimiento jurídico completo.

## Datos confirmados por el propietario

- País: **España**.
- Se creará un correo nuevo para soporte y privacidad; dirección pendiente.
- Falta identificar al responsable: persona física o razón social y datos de
  contacto que deban figurar. No se utiliza por defecto la cuenta personal de
  moderación como correo público.
- AI Coach está aplazado. No hay transferencia a OpenAI por ese módulo ni se
  debe incluir en la política como un servicio de IA ya habilitado.

Las páginas Terms/Privacy de web y móvil siguen indicando que su contenido es
provisional. No sustituirlas por textos supuestamente definitivos sin completar
la identidad, el contacto, las finalidades y los plazos reales.

## Categorías observadas en el código

| Categoría | Datos observados | Uso técnico actual |
|---|---|---|
| Cuenta | Nombre, apellidos, email, rol, contraseña cifrada mediante hash si existe | Registro, acceso y gestión de cuenta |
| Identidad social | Proveedor, identificador de identidad, datos verificados pertinentes | Acceso Google/Apple cuando esté habilitado; no exportar tokens o secretos |
| Perfil cliente | Edad, peso, altura, género, objetivo, avatar | Perfil, planificación y seguimiento |
| Perfil entrenador | Especialidad, formación, experiencia, biografía, tarifa y perfil público | Relación profesional y descubrimiento según visibilidad |
| Entrenamiento | Rutinas, ejercicios, pautas, eventos, sesiones, series, cargas, esfuerzo y notas | Planificación, registro y estadísticas |
| Relación | Entrenador vinculado y clientes asignados | Autorización de funciones y comunicación |
| Comunicación | Mensajes, adjuntos y metadatos | Chat entre participantes autorizados |
| Seguridad | Sesiones, hashes de tokens, estados de revocación, bloqueos y denuncias | Autenticación, prevención de abuso y moderación interna |
| Consentimientos | Tipo, versión y aceptación/retirada | Términos, privacidad y preferencia de marketing |

Texto libre, medidas corporales e información de entrenamiento pueden revelar
salud. Definir minimización y bases jurídicas adecuadas; no presentarlos como
datos anónimos porque no incluyan nombre. La base de cada finalidad y, cuando
proceda, las condiciones para datos de salud deben revisarse antes de publicar.

## Proveedores que deben verificarse para la política pública

Render (backend/BD), Vercel (web), Cloudinary (archivos y recursos), Expo/EAS
(compilación/distribución), Google/Apple (acceso social según plataforma) y Resend
(correo si está activado). La presencia de una integración en el repositorio no
prueba que esté habilitada en cada entorno. Confirmar contratación, servicios
usados, regiones, subencargados, transferencias y condiciones reales; no prometer
residencia exclusiva en España o la UE sin esa comprobación.

El correo implementado es transaccional de cuenta. Una preferencia de marketing
no demuestra que exista una campaña de envíos activa. Auditar también los medios
del catálogo y sus derechos; un campo `PROPIO` no constituye por sí solo prueba
de autoría o licencia.

## Exportación de usuario retirada

El propietario ha decidido eliminar «Exportar mis datos» de la aplicación.
Se retiran la interfaz web/móvil, sus rutas, las llamadas de cliente y el endpoint
`GET /api/auth/data-export`, junto con sus servicios específicos. Las notas
anteriores de implementación quedan como historial, no como funcionalidad activa.
La retirada no borra registros personales ni cambia el sistema operativo de copias
cifradas y restauración. El procedimiento de atención de solicitudes de privacidad
sigue pendiente de concretar con el correo y el responsable.

## Baja y conservación: no prometer un borrado que no ocurre

La baja actual desactiva la cuenta, anonimiza campos del perfil, revoca sesiones
e identidades y desvincula relaciones. **No elimina automáticamente todo el
historial de entrenamiento, los mensajes o las denuncias.** Las cuentas sociales
sin contraseña también necesitan revisión del recorrido de baja.

El mantenimiento automático tiene reglas para tokens y archivos huérfanos;
no sustituye una política de conservación de todas las categorías. Concretar
plazos, motivos de conservación y procedimiento de supresión. Las copias reales
de PostgreSQL y su restauración siguen pendientes de verificar.

## Antes de publicar textos definitivos

1. Completar responsable y correo público operativo; verificar que recibe y
   atiende solicitudes y que existe un procedimiento de respuesta.
2. Fijar finalidades/bases, destinatarios, conservación, derechos, reclamación
   ante la autoridad competente y condiciones de uso, incluida la política de
   edad. Confirmar que coinciden con el comportamiento real.
3. Revisar y corregir las diferencias entre baja, conservación y lo que se
   promete al usuario. No afirmar eliminación inmediata de todos los datos.
4. Determinar contratación/precios, responsabilidad profesional y condiciones
   del servicio; no inventar una empresa, domicilio o condiciones comerciales.
5. Mantener web y móvil coherentes y coordinar versiones de documentos con el
   backend. La aceptación guardada de una versión provisional no demuestra que
   se haya aceptado una futura versión distinta. Hoy no hay un flujo completo
   para volver a aceptar textos revisados: debe prepararse antes de exigirlo.
6. Preparar las declaraciones de privacidad/datos de App Store y Google Play
   sobre las integraciones realmente activas, con revisión jurídica apropiada.

Este documento no modifica versiones legales, consentimientos existentes,
configuración de producción o el esquema de la base de datos.
