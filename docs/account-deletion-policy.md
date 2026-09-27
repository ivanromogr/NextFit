# Eliminación de cuenta y archivos

La eliminación de cuenta es un soft-delete con anonimización. Antes de anonimizar Cliente o Entrenador, se ejecuta el cleanup de su `PROFILE_IMAGE` gestionada: se limpia la referencia, se elimina la metadata `UploadedFile` y se borra el fichero físico.

Las referencias legacy que no son `/api/upload/files/{uuid}` solo se ponen a `null`; no se usan como rutas de fichero. Los `CHAT_ATTACHMENT` históricos no se eliminan por este proceso.
