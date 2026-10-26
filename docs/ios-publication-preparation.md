# Preparación iOS y puntos pendientes del propietario

26 de octubre de 2026. Esta preparación no genera ni distribuye una app firmada.

## Configuración preparada

- Nombre visible: NextFit. Proyecto Expo/slug y UUID EAS existentes conservados.
- Identificador iOS preparado: `com.iviromo.nextfit`. Debe registrarse en la cuenta
  Apple correspondiente; configurarlo en un archivo no crea ese registro.
- Paquete Android existente conservado: `com.iviromo.Frontend_App`; no cambiarlo
  sin revisar las credenciales Google y de firma ya asociadas.
- Apariencia oscura, nuevo icono basado en el símbolo de la marca y splash con
  el logo existente. El icono fuente es cuadrado y opaco; los tamaños finales de
  los catálogos nativos se verifican al construir, no se da por aprobado App Store.
- Selector de fotos con explicación en español. Los plugins deshabilitan cámara
  y micrófono porque los flujos actuales usan galería y reproducción, sin captura.
  La introspección iOS no contiene esos textos de permiso; Android contiene
  `tools:node=remove` para CAMERA y RECORD_AUDIO. No confundir esos marcadores con
  permisos concedidos ni con una inspección de un APK/IPA ya construido.
- Términos y privacidad registrados antes y después de acceder, con navegación de
  vuelta. Ajustes de privacidad permite abrirlos aunque falle su API.
- La preferencia de marketing se valida, serializa y aísla por cuenta; una carga o
  guardado antiguos no cambian la cuenta nueva. No se inventan consentimientos.
- Google solo se ofrece si hay configuración para la plataforma. En iOS necesita
  cliente OAuth iOS además del cliente web, no el cliente Android.

## Información y operaciones que faltan

1. Identidad del responsable y correo público operativo. Los textos siguen
   provisionales y las versiones legales no cambian. Revisar el
   [borrador legal](legal-publication-draft.md), conservación, edad y datos de salud.
2. Para correo transaccional con Resend, disponer de remitente autorizado y dominio
   verificado, credencial guardada como secreto y URLs de recuperación reales. Un
   buzón Gmail de soporte no permite por sí solo enviar con un dominio propio no
   verificado. No activar correo ni prometer entrega antes de probar recepción.
3. Cuenta Apple Developer con distribución habilitada y equipo que vaya a ser
   titular de la aplicación. Su alta o renovación requiere decisión del propietario;
   no se ha contratado nada. No compartir contraseña, códigos ni claves en el chat.
4. Registrar bundle ID, Sign in with Apple y cliente OAuth iOS de Google; coordinar
   audiencias del backend y URL scheme. No habilitar botones con datos ficticios.
5. Preparar App Store Connect/TestFlight y la compilación firmada solo cuando esos
   datos estén disponibles. Las exportaciones Hermes no sustituyen esa compilación.
6. Revisar uso de cifrado y declaraciones de datos de App Store según los SDK y
   servicios activos; no marcar exenciones o ausencia de datos sin revisión.
7. Probar en iPhone real acceso, permisos, adjuntos, teclado, tamaño de texto,
   navegación, entrenamiento, chat, sesión y baja. No sustituirlo por Safari.

La política de privacidad necesita URL pública definitiva y un canal operativo de
soporte. Las rutas web existen pero contienen texto provisional: no presentar esas
páginas como documentos definitivos en la ficha de la tienda.

## Persistencia y despliegue

Una copia cifrada de producción con recuperación comprobada y la adopción revisada
de migraciones siguen pendientes; la conexión disponible de DBeaver permite
prepararlas desde el equipo del propietario. Este entorno usa un proxy HTTP y no
dispone actualmente de conexión directa a PostgreSQL. No pedir otro secreto ni
activar una baseline para evitar ese límite. Véase [operación de BD](database-operations.md).

Las mejoras están en la rama de trabajo, sin alterar la versión actual del backend
de producción. Publicación y contratación siguen separadas de esta preparación.
