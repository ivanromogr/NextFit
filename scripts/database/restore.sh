#!/usr/bin/env bash
# Restore ONLY to an empty isolated database, never to the live application database.
set -euo pipefail
umask 077
if [ "$#" -ne 1 ]; then echo 'Usage: restore.sh BACKUP.dump.gpg' >&2; exit 2; fi
backup=$1
: "${PGDATABASE:?Set PGDATABASE to the isolated restore database name}"
: "${NEXTFIT_RESTORE_DATABASE:?Set NEXTFIT_RESTORE_DATABASE to explicitly match the isolated database name}"
if [[ ! "$PGDATABASE" =~ ^[a-zA-Z0-9_]+$ || "$PGDATABASE" != "$NEXTFIT_RESTORE_DATABASE" ]]; then
  echo 'Restore database names do not match or are not plain names.' >&2
  exit 2
fi
for executable in psql pg_restore gpg sha256sum; do command -v "$executable" >/dev/null; done
backup_dir=$(cd "$(dirname "$backup")" && pwd)
backup_name=$(basename "$backup")
(cd "$backup_dir" && sha256sum --check "$backup_name.sha256")
restore_dir=$(mktemp -d "${TMPDIR:-/tmp}/nextfit-restore.XXXXXXXX")
trap 'rm -rf "$restore_dir"' EXIT
# Finish authenticated decryption before any database write. A streaming restore
# could commit before GPG reports a damaged ciphertext at the end of the stream.
gpg --batch --no-tty --output "$restore_dir/database.dump" --decrypt "$backup_dir/$backup_name"
empty=$(psql --no-psqlrc --set=ON_ERROR_STOP=1 --tuples-only --no-align --command="SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','S','f')) THEN 'no' ELSE 'yes' END;")
if [ "$empty" != yes ]; then echo 'Target database is not empty; refusing restore.' >&2; exit 1; fi
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname "$PGDATABASE" "$restore_dir/database.dump"
printf 'Restore completed in isolated database: %s\n' "$PGDATABASE"
