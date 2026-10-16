#!/bin/sh
set -eu
umask 077
cd "$(dirname "$0")/.."
: "${BACKUP_DIR:?Set an encrypted backup destination outside this repository}"
mkdir -p "$BACKUP_DIR"
file="$BACKUP_DIR/akquise-$(date -u +%Y%m%dT%H%M%SZ).dump"
temporary="$file.partial"
trap 'rm -f "$temporary"' EXIT HUP INT TERM
docker compose --env-file deploy/production.env -f compose.production.yaml exec -T db pg_dump --username=akquise --dbname=akquise --format=custom > "$temporary"
[ -s "$temporary" ]
mv "$temporary" "$file"
# Validate archive readability. A separate restore test is still required.
docker compose --env-file deploy/production.env -f compose.production.yaml exec -T db pg_restore --list < "$file" >/dev/null
printf 'Backup erstellt: %s\n' "$file"
