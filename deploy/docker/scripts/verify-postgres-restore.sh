#!/bin/sh
set -eu

# This drill restores into a new disposable database, never over the live database.
test_database="import_restore_$(date -u +%Y%m%d%H%M%S)_$$"
case "$test_database" in import_restore_*) ;; *) exit 1 ;; esac
test "$test_database" != "$PGDATABASE"
backup_directory="${BACKUP_DIR:-/backups}"
backup="${backup_directory}/import-pre-release-$(date -u +%Y%m%dT%H%M%SZ).dump"
umask 077
mkdir -p "$backup_directory"
pg_dump --format=custom --no-owner --no-privileges --file="$backup.partial"
pg_restore --list "$backup.partial" >/dev/null
mv "$backup.partial" "$backup"
createdb "$test_database"
cleanup() { dropdb --if-exists "$test_database"; }
trap cleanup EXIT INT TERM
pg_restore --exit-on-error --no-owner --no-privileges --dbname="$test_database" "$backup"
restored_count="$(PGDATABASE="$test_database" psql -X -A -t -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM public."VehicleEvidenceObject";')"
# PostgreSQL sha256(bytea) verifies originals without installing an extension.
PGDATABASE="$test_database" psql -X -v ON_ERROR_STOP=1 <<'SQL'
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public."VehicleEvidenceObject"
    WHERE "storageKey" LIKE 'purchase-import:%' AND status <> 'DELETED'
      AND encode(sha256(content), 'hex') <> "checksumSha256") THEN
    RAISE EXCEPTION 'Restored purchase source checksum mismatch';
  END IF;
END $$;
SQL
printf '{"restorePassed":true,"backup":"%s","sourceCount":%s}\n' "$backup" "$restored_count"
find "$backup_directory" -type f -name 'import-pre-release-*.dump' -mtime +14 -delete
