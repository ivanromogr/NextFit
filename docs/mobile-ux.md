# Experiencia móvil: acceso y registro

Cambios del 19 de octubre de 2026 en `Frontend_App`:

- Los campos compartidos permiten mostrar y ocultar contraseñas, conservando
  exactamente la credencial. Respetan el estado de edición y exponen etiquetas
  accesibles para el control de visibilidad.
- Los campos aceptan referencias, autocompletado y eventos del teclado. En
  acceso y registro, «Siguiente» mueve el foco y «Entrar» envía el formulario.
- El desplazamiento y la adaptación al teclado permiten interactuar con el
  formulario mientras está abierto. Debe confirmarse su comportamiento visual
  en dispositivos reales Android e iOS.
- Registro apila nombre/apellido y cabecera en anchos menores de 400 puntos o
  con escala de fuente superior a 1,2. Los campos crecen con su contenido.
- Botones y consentimientos tienen semántica accesible; los consentimientos y
  controles de contraseña disponen de una zona táctil mínima de 44 puntos.
- Los envíos concurrentes de acceso y registro quedan bloqueados. Se recortan
  espacios de nombres/correo y se normaliza el correo; la contraseña no se
  modifica. Registro deja de imprimir el objeto de error HTTP completo, que
  podría contener el cuerpo de la petición.

No cambia la obligatoriedad de aceptar términos y privacidad ni se activa el
consentimiento opcional de comunicaciones.

## Validación

Desde `Frontend_App`, `npm test -- --runInBand`: 19 suites, 84 pruebas correctas.
Incluye recuperación, consentimientos, Google/Apple, chat y las pruebas nuevas
para visibilidad, eventos del campo y bloqueo de peticiones concurrentes.

La exportación JavaScript de Expo para Android/iOS se comprueba por separado de
una compilación nativa firmada. Estas modificaciones requieren una nueva
compilación de la aplicación para llegar al APK instalado; una publicación web
no las entrega. La instalación en un móvil real continúa pendiente por decisión
del propietario. No se da por terminado el bloque completo de UX móvil.

La copia recuperable de la base de datos real y la adopción de migraciones
siguen pendientes como se indica en `production-readiness.md`.

## Navegación inferior

Las barras de cliente y entrenador comparten el cálculo del área segura:
reservan como mínimo el margen inferior del sistema y mantienen 52 puntos
útiles para icono/etiqueta (además de ese margen y del relleno superior).
También respetan los márgenes laterales. La raíz proporciona `SafeAreaProvider`
y ambas barras se ocultan cuando aparece el teclado.

Tres pruebas comprueban la separación respecto al indicador de inicio, el
espacio táctil cuando no hay margen inferior y la actualización del diseño al
cambiar los márgenes del sistema. La comprobación visual y con teclado real en
un teléfono sigue pendiente; las pruebas de componentes y exportaciones no la
sustituyen.
