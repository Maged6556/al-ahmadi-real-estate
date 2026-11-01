#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
BACKUP_FILE="${1:-}"
RESTORE_DB="${RESTORE_DB:-al_ahmadi_restore}"

if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: RESTORE_DB=al_ahmadi_restore bash scripts/restore.sh <backup.dump>" >&2
  exit 2
fi
if [[ ! "$RESTORE_DB" =~ ^[A-Za-z][A-Za-z0-9_]{0,62}$ ]]; then
  echo "RESTORE_DB must be a PostgreSQL identifier." >&2
  exit 2
fi
if [[ "$RESTORE_DB" == "al_ahmadi" ]]; then
  echo "Refusing to restore over the live application database." >&2
  exit 2
fi

if [[ -f "$BACKUP_FILE.sha256" ]]; then
  (
    cd "$(dirname "$BACKUP_FILE")"
    sha256sum --check "$(basename "$BACKUP_FILE").sha256"
  )
else
  echo "No adjacent SHA-256 file found; validating the archive format only." >&2
fi

docker compose -f "$COMPOSE_FILE" exec -T db pg_restore --list \
  < "$BACKUP_FILE" > /dev/null
docker compose -f "$COMPOSE_FILE" exec -T db sh -c \
  'exec createdb --username="$POSTGRES_USER" "$1"' sh "$RESTORE_DB"
docker compose -f "$COMPOSE_FILE" exec -T db sh -c \
  'exec pg_restore --username="$POSTGRES_USER" --role="$POSTGRES_USER" --dbname="$1" --no-owner' \
  sh "$RESTORE_DB" < "$BACKUP_FILE"
echo "Restored $BACKUP_FILE into the new database $RESTORE_DB."
echo "The existing application database was not modified."
