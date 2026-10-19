# Operación de PostgreSQL y archivos

## Herramientas y credenciales

Los scripts de `scripts/database` usan clientes PostgreSQL de la misma versión
mayor que el servidor o una posterior compatible. Requieren Bash, GnuPG y
`sha256sum`. Configurar la conexión con las variables estándar de libpq (`PGHOST`,
`PGPORT`, `PGDATABASE`, `PGUSER`, `PGSSLMODE`) y un archivo de contraseñas con
permisos 0600 mediante `PGPASSFILE`, o con un gestor de secretos. No pasar la
contraseña en argumentos, commits ni mensajes. Para una conexión externa usar
TLS con `PGSSLMODE=verify-full` y la cadena de confianza correspondiente al
proveedor; no desactivar la verificación del certificado para resolver errores.

## Copia cifrada y ensayo de recuperación

Importar la clave pública de copia y verificar su huella completa por un canal
fiable. Conservar la clave privada de recuperación fuera del servidor de la app,
con una copia segura bajo control del propietario. El código no incluye una
clave de producción ni genera una que solo exista en este entorno temporal.

```sh
bash scripts/database/backup.sh /ruta/segura/copias HUELLA_COMPLETA_DE_LA_CLAVE
```

`pg_dump` crea un archivo de formato custom y lo cifra por una tubería, sin
escribir una copia sin cifrar en disco. Se publica el archivo terminado y su
checksum, con permisos privados. El checksum detecta alteraciones accidentales;
la integridad criptográfica la comprueba GnuPG al descifrar.

Copiar el resultado a almacenamiento separado, restringido y persistente.
Programar la ejecución y alertar si falla o la última copia es demasiado antigua.
Los scripts no configuran por sí solos un destino externo ni una periodicidad.
Definir RPO/RTO según el uso real; todavía no se ha configurado una programación
de copias de producción ni verificado las opciones del plan de PostgreSQL.

Para ensayar, configurar `PG*` apuntando a una base **aislada y vacía** e indicar
explícitamente su nombre:

```sh
export PGDATABASE=nextfit_restore_check
export NEXTFIT_RESTORE_DATABASE=nextfit_restore_check
bash scripts/database/restore.sh /ruta/segura/copias/nextfit-FECHA.dump.gpg
```

El script exige nombres coincidentes, comprueba checksum y descifrado antes de
escribir, rechaza bases que ya contienen tablas/vistas/secuencias y restaura en
una única transacción. Durante la restauración crea un dump temporal privado y
lo retira al finalizar, incluso si falla. Usar un disco cifrado para el directorio
temporal. No utiliza `--clean`, no borra bases ni incluye propietarios/permisos de
la instancia original. Verificar después datos, relaciones y comportamiento con
una instancia aislada de la API; conservar registros del ensayo sin datos privados.

Un dump de PostgreSQL contiene metadatos de imágenes y adjuntos, **no sus bytes**.
Cloudinary debe tener su propia política de copia y recuperación de originales.
No dar una copia por completa sin comprobar ambos componentes. Los archivos
locales que Render ya haya perdido no pueden recuperarse desde sus metadatos.

## Migraciones

Flyway está incorporado pero **desactivado por defecto**. No cambia el esquema
actual de producción. `baseline-on-migrate=false`, `clean-disabled=true` y la
validación de checksums impiden baselines implícitas, borrados y modificaciones
silenciosas de migraciones aplicadas.

Para una base PostgreSQL nueva y vacía:

```text
APP_DATABASE_MIGRATIONS_ENABLED=true
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
```

`V1__initial_schema.sql` crea las 28 tablas de la aplicación, índices y
restricciones; Flyway conserva su historial aparte. Hibernate valida los mapeos
sin crear ni alterar tablas. Los siguientes cambios deben ser nuevas migraciones
`V2__...sql`, `V3__...sql`; no editar V1 una vez aplicada.

La base existente requiere este orden antes de activar Flyway:

1. Obtener una copia cifrada y restaurarla en una base aislada.
2. Ejecutar `psql -X -v ON_ERROR_STOP=1 -f scripts/database/inventory.sql` y guardar
   un `pg_dump --schema-only --no-owner --no-privileges` de la copia. El inventario
   es de solo lectura y no devuelve cuentas, contraseñas ni mensajes.
3. Comprobar el esquema contra V1 y arrancar la API **sobre la copia** con Hibernate
   en `validate`, Flyway todavía desactivado. Revisar también restricciones,
   índices y defaults: Hibernate no valida todas esas diferencias.
4. Solo tras esa revisión, activar Flyway y permitir explícitamente una baseline
   de versión 1 en la copia (`SPRING_FLYWAY_BASELINE_ON_MIGRATE=true`), manteniendo
   `ddl-auto=validate`. Esto registra el esquema existente, no ejecuta V1 sobre
   tablas con datos. Retirar inmediatamente el ajuste y verificar otro reinicio.
5. Aplicar el procedimiento revisado en producción con copia reciente y ventana
   de despliegue. Mantener `baseline-on-migrate=false` en operación normal.

No activar una baseline únicamente para silenciar un error de esquema. No usar
`repair` para aceptar un checksum diferente sin investigar el cambio. Ante un
fallo, conservar la versión anterior y corregir con una migración nueva; no
asumir que revertir el JAR revierte los cambios de datos.

## Verificaciones realizadas

- 19/10/2026: copia cifrada y restauración real en PostgreSQL 16.15 con datos
  ficticios relacionados. Rechazo de destino con datos y de ciphertext alterado,
  aunque se recalculase el checksum externo; sin escrituras previas al descifrado.
- La prueba reproducible de migraciones requiere Docker y el JAR compilado:

```sh
JAVA=/ruta/al/jdk21/bin/java python3 scripts/database/verify-migrations.py
```

Crea y elimina un contenedor propio con PostgreSQL 16, sin usar producción.
Comprueba arranque desde cero, validación de Hibernate, conservación de datos al
reiniciar, rechazo de bases no vacías sin baseline, adopción explícita de un
esquema de prueba y rechazo de checksums cambiados. No valida el esquema ni la
restauración de la base real de Render.
