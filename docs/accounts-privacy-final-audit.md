# Auditoría final: cuentas y privacidad (Bloque 3)

## Garantías verificadas

La identidad de las operaciones de cuenta procede del principal JWT. Registro normaliza email, exige términos y privacidad, mantiene marketing opcional y registra versiones/timestamps del servidor. Cambio de email y contraseña usan endpoints dedicados, contraseña actual y revocación de sesiones/tokens cuando corresponde. Las cuentas se anonimizan mediante soft-delete; no se borran consentimientos ni el historial de chat válido.

Las sesiones se limitan al principal y no exponen tokens. Exportación está autenticada, usa `no-store` y omite contraseñas, hashes, tokens y storage keys. Las fotos de perfil usan `fileId` y ownership; los adjuntos de chat se preservan mientras estén referenciados. El cleanup sólo procesa credenciales inútiles y uploads huérfanos tras grace period.

Los perfiles públicos de entrenador y reviews emplean DTOs minimizados. Los endpoints de cuenta, sesiones, consentimientos, exportación y perfil permanecen autenticados; no se añadió CORS permisivo ni endpoint público de cleanup.

## Retención y privacidad

Referencias: [eliminación de cuenta](account-deletion-policy.md), [exportación](data-export-policy.md), [fotos](profile-privacy-policy.md), [consentimientos](consent-policy.md) y [cleanup](data-retention-cleanup.md).

## Deuda abierta

### A — Bloqueantes de producción

- Migraciones SQL explícitas para los nuevos esquemas antes de desplegar en una base existente.
- Storage local no durable para despliegues efímeros como Render; requiere almacenamiento persistente gestionado.
- Rotación y gestión operativa de secretos antes de producción.

### B — Antes de App Store

- Verificación real del nuevo email.
- Recuperación de contraseña con correo real.
- Revisión de la advertencia móvil de `SafeAreaView`.

### C — No bloqueante

- `logout-others` no existe (sí logout de una familia y logout-all).
- Posible carrera de unicidad cross-table de email que debe reforzarse a nivel de persistencia.
- Google Sign-In y Sign in with Apple fuera de alcance.
- Fallos históricos de web ajenos a este bloque: onboarding, App, perfil, AuthContext y cliente API.
