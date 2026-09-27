# Privacidad de perfiles y fotos

Los clientes no tienen un perfil público general. Los entrenadores solo aparecen en los endpoints públicos cuando `perfilPublico` es verdadero; las respuestas públicas usan un DTO sin email, edad, género, contraseñas, hashes ni relaciones privadas.

Una foto de perfil se carga como `PROFILE_IMAGE` (JPEG, PNG o WEBP, con validación de MIME, magic bytes y tamaño). La asignación solo acepta el `fileId` de un `UploadedFile` que pertenezca al principal autenticado y tiene ese propósito; la referencia guardada es la URL canónica `/api/upload/files/{id}`, nunca una URL arbitraria enviada por el perfil.

Al sustituir o eliminar la foto, se desasocia del perfil y, para recursos gestionados por NextFit, se borran metadata y fichero. `CHAT_ATTACHMENT` no participa en este proceso. Al eliminar una cuenta se ejecuta el mismo cleanup de `PROFILE_IMAGE` antes de anonimizarla; una URL legacy no gestionada solo se desreferencia. Las reseñas de clientes inactivos muestran autor anonimizado y foto nula.
