# Exportación de datos

NextFit ofrece al titular autenticado una exportación JSON mediante `GET /api/auth/data-export`.

- La web descarga el JSON como `nextfit-data-YYYY-MM-DD.json` usando un Blob y una URL temporal que se revoca al terminar.
- La aplicación móvil escribe el JSON sólo en su caché temporal, abre la hoja nativa de compartir y elimina el fichero al cerrar el flujo, incluso ante error.
- Ninguna interfaz persiste el contenido de la exportación en localStorage, AsyncStorage o SecureStore, ni lo muestra o registra en pantalla/consola.
- El backend excluye secretos y rutas internas de almacenamiento. Los datos de terceros se reducen a referencias mínimas cuando existe una relación legítima.

Limitaciones actuales: el formato es únicamente JSON; no se generan PDF, ZIP, envíos por email ni exportaciones administrativas.
