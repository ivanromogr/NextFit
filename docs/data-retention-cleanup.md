# Retención y cleanup técnico

El scheduler diario configurable limpia refresh tokens inutilizables y reset tokens expirados o consumidos después de sus ventanas de retención. Nunca borra credenciales activas o reset tokens aún válidos.

Los `PROFILE_IMAGE` y `CHAT_ATTACHMENT` sólo se eliminan si no tienen referencia y superan el grace period. Las imágenes asignadas y los adjuntos vinculados a mensajes se conservan. Si el borrado físico falla, la metadata permanece para reintento.

Las cuentas eliminadas permanecen anonimizadas (soft-delete) y `UserConsent` se conserva como evidencia técnica. Configuración: `app.cleanup.enabled`, `app.cleanup.cron`, `app.cleanup.refresh-retention-days`, `app.cleanup.password-reset-retention-days` y `app.cleanup.orphan-upload-grace-hours`.
