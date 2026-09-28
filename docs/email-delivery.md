# Entrega de email

NextFit usa Resend detrás de `EmailService`; `PasswordResetService` sólo depende de `PasswordResetNotifier`. Con `EMAIL_ENABLED=false` el servicio es no-op para desarrollo. Producción activa `EMAIL_ENABLED=true` y necesita `RESEND_API_KEY`, `EMAIL_FROM` y `APP_PASSWORD_RESET_URL` (además de `EMAIL_PROVIDER=resend`).

El enlace contiene exclusivamente el token URL-encoded. El token no se persiste ni se registra; Resend y la URL completa tampoco se exponen en logs. Un fallo de proveedor se registra como evento técnico sin destinatario ni token y el endpoint forgot mantiene su respuesta neutral. No hay retry/cola todavía; será mejora futura. Esta capa servirá también para verificación de email.
