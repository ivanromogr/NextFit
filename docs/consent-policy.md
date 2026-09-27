# Consentimientos técnicos

NextFit registra `TERMS_OF_SERVICE`, `PRIVACY_POLICY` y `MARKETING` por usuario técnico y rol. Las versiones y timestamps son del backend; términos y privacidad son obligatorios durante el registro, marketing es opcional y modificable.

Usuarios existentes sin registros se devuelven como `LEGACY_MISSING`; no se inventa aceptación histórica. Los consentimientos se incluyen en la exportación de datos únicamente con tipo, versión, estado y timestamps, y se conservan tras el soft-delete como evidencia técnica sin nombre ni email. La identidad del JWT es la única autoridad para consultar o actualizar marketing; términos y privacidad no son modificables desde la interfaz.

Las pantallas web y móvil ofrecen los textos provisionales de Términos y Política, el registro requiere ambas aceptaciones y la sección «Privacidad y comunicaciones» permite cambiar sólo marketing. Futuras versiones podrán detectar una aceptación desactualizada con `requiresUpdatedConsent` sin bloquear todavía la aplicación.
