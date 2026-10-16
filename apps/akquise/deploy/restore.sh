#!/bin/sh
# Restore ONLY into a separately created empty database. No DROP/TRUNCATE/CLEAN.
set -eu
: "${RESTORE_CONFIRMED:?Set RESTORE_CONFIRMED=empty-staging-database after verifying the target}"
[ "$RESTORE_CONFIRMED" = empty-staging-database ] || exit 1
: "${TARGET_PGSERVICE:?Set the pg_service.conf name of the empty restore-test database}"
: "${BACKUP_FILE:?Set the dump filename}"
# Credentials belong in PGPASSFILE, not the shell arguments or repository.
count=$(psql "service=$TARGET_PGSERVICE" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')")
[ "$count" = 0 ] || { echo 'Zieldatenbank ist nicht leer. Abbruch.' >&2; exit 1; }
pg_restore --exit-on-error --single-transaction --no-owner --no-privileges --dbname="service=$TARGET_PGSERVICE" "$BACKUP_FILE"
