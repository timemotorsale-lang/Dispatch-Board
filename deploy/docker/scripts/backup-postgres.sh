#!/bin/sh
set -eu

backup_directory="${BACKUP_DIR:-/backups}"
interval_seconds="${BACKUP_INTERVAL_SECONDS:-86400}"
retention_days="${BACKUP_RETENTION_DAYS:-14}"

case "$interval_seconds" in
  *[!0-9]*|"") echo "BACKUP_INTERVAL_SECONDS must be a positive integer." >&2; exit 1 ;;
esac

case "$retention_days" in
  *[!0-9]*|"") echo "BACKUP_RETENTION_DAYS must be a positive integer." >&2; exit 1 ;;
esac

mkdir -p "$backup_directory"

while true; do
  timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
  final_path="${backup_directory}/dispatch-board-${timestamp}.dump"
  temporary_path="${final_path}.partial"

  if pg_dump --format=custom --no-owner --no-privileges --file="$temporary_path"; then
    mv "$temporary_path" "$final_path"
    echo "Created PostgreSQL backup: $final_path"
    find "$backup_directory" -type f -name 'dispatch-board-*.dump' -mtime "+$retention_days" -delete
  else
    rm -f "$temporary_path"
    echo "PostgreSQL backup failed at $timestamp." >&2
  fi

  sleep "$interval_seconds"
done
