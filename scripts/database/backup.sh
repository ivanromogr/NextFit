#!/usr/bin/env bash
# PG* / PGSERVICE environment configures libpq. Never pass a password as an argument.
set -euo pipefail
umask 077
if [ "$#" -ne 2 ]; then
  echo 'Usage: backup.sh OUTPUT_DIRECTORY GPG_RECIPIENT_FINGERPRINT' >&2
  exit 2
fi
output_dir=$1
recipient=$2
if [[ ! "$recipient" =~ ^[[:xdigit:]]{40}$ && ! "$recipient" =~ ^[[:xdigit:]]{64}$ ]]; then
  echo 'Use the full fingerprint of the trusted backup encryption key.' >&2
  exit 2
fi
for executable in pg_dump gpg sha256sum; do command -v "$executable" >/dev/null; done
if [ -z "${PGDATABASE:-}" ] && [ -z "${PGSERVICE:-}" ]; then
  echo 'Set PGDATABASE or PGSERVICE explicitly to select the source database.' >&2
  exit 2
fi
mkdir -p "$output_dir"
# Plaintext is streamed between processes and never written to disk.
partial=$(mktemp "$output_dir/.nextfit-backup-XXXXXXXX.gpg")
trap 'rm -f "$partial"' EXIT
pg_dump --format=custom --no-owner --no-privileges |
  gpg --batch --no-tty --encrypt --recipient "$recipient" --output "$partial" --yes
unique=${partial##*-}
unique=${unique%.gpg}
backup="$output_dir/nextfit-$(date -u +%Y%m%dT%H%M%SZ)-$unique.dump.gpg"
# A unique mktemp-derived suffix avoids overwriting concurrent backups.
if [ -e "$backup" ]; then echo 'Backup name collision; refusing overwrite.' >&2; exit 1; fi
mv "$partial" "$backup"
(cd "$output_dir" && sha256sum "$(basename "$backup")" > "$(basename "$backup").sha256")
printf 'Encrypted backup created: %s\n' "$backup"
