# Punto de conexión de la API de ejercicios y revisión posterior

Orden confirmado por el propietario el 26 de octubre de 2026:

1. Completar el trabajo restante que no requiera contratar servicios ni inventar
   datos del responsable o del proveedor.
2. **Avisar expresamente antes de contratar o conectar la API de ejercicios.**
3. Tras integrar y verificar el catálogo real, revisar con el propietario si el
   entrenamiento predeterminado se adapta a las características seleccionadas.

No se ha conectado, contratado ni consultado la API de pago durante esta preparación.
No se ha dado por completada la revisión de adaptación del entrenamiento.

## Preparación técnica offline

El código existente apunta a ExerciseDB/RapidAPI, pero eso no decide el proveedor
ni el plan que se contratará. Se corrige una ruta antigua que persistía la clave
en URLs de imagen: las nuevas URLs usan el proxy local y la serialización protege
también valores antiguos cargados por Hibernate. Las credenciales de enlaces de
medios no se entregan al navegador o móvil. El código nuevo no limpia por sí solo
los valores originales que pudieran existir en backups o filas antiguas.

El transporte preparado tiene límites de conexión/lectura, no sigue redirecciones
con credenciales y acota descargas de imágenes a 5 MiB con tipos de imagen permitidos.
El proxy valida el identificador y su existencia en el catálogo. La importación
se detiene ante páginas repetidas y tiene un techo de 50 páginas. Ese techo es
una protección contra bucles, **no** la cuota del plan ni un presupuesto diario.
Las pruebas usan dobles y servidores HTTP loopback, con claves ficticias.

## Condiciones antes de activar

- Confirmar proveedor, versión de API, precio y plan con el propietario. No usar
  una clave heredada para hacer llamadas de prueba sin esa decisión.
- Revisar licencia de datos, imágenes/vídeos, traducción, almacenamiento, caché,
  proxy y redistribución en web/iOS. Confirmar condiciones antes de copiar medios.
- Ajustar cuota, límites de peticiones y caché permitida al plan contratado. El
  proxy público no debe convertirse en una fuente ilimitada de llamadas pagadas.
- Acordar el importador operativo autorizado. Los endpoints de importación actuales
  siguen bloqueados por seguridad; no abrirlos al público para facilitar la carga.
- Obtener copia recuperable antes de modificar el catálogo real. Conservar UUID y
  referencias de rutinas/sesiones, el catálogo propio y los medios autorizados.
  No usar `replace=true` como método de integración con historial existente.
- Validar primero una muestra autorizada: ID, nombre/traducción, músculos,
  equipamiento, instrucciones, nivel y medios. Mapear la respuesta real: el DTO
  heredado no demuestra compatibilidad con una versión futura del proveedor.
- Gestionar fallos y progreso sin presentar una importación parcial como completa.
  El techo de páginas no prueba que se haya recibido todo el catálogo.
- Guardar la clave solo en el backend. Revisar datos heredados y rotar cualquier
  clave anterior que hubiera sido expuesta; nunca volver a incluirla en URLs.

## Revisión del entrenamiento, después de la integración

Recorrer las selecciones reales de web y móvil hasta el DTO y el generador del
backend. Para cada característica, indicar si se usa, se ignora o es solo informativa;
no inferir personalización porque la interfaz muestre un selector.

Preparar casos comparables de objetivo, nivel/experiencia, días disponibles,
equipamiento, duración y las demás restricciones que realmente recoja la app.
Comprobar ejercicios elegibles, volumen, repeticiones, descansos, distribución
semanal y la explicación de la propuesta. Datos corporales o información de salud
requieren justificación y revisión adecuada, no reglas inventadas para aparentar
personalización.

Si el catálogo no cubre una restricción, informar o pedir que se ajuste; no elegir
silenciosamente material incompatible. Verificar que cliente y entrenador respetan
el mismo contrato y que no se mezclan recursos de otros usuarios. Esta revisión
no implementa ni activa AI Coach, que continúa aplazado.
