#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
if [[ "$BACKUP_DIR" != /* ]]; then
  BACKUP_DIR="$ROOT/$BACKUP_DIR"
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
umask 077
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="db-$STAMP.dump"
TEMP="$BACKUP_DIR/.$NAME.tmp"
DEST="$BACKUP_DIR/$NAME"
CHECKSUM_TEMP="$BACKUP_DIR/.$NAME.sha256.tmp"

cleanup() {
  rm -f -- "$TEMP" "$CHECKSUM_TEMP"
}
trap cleanup EXIT

docker compose -f "$COMPOSE_FILE" exec -T db sh -c \
  'exec pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --no-owner' \
  > "$TEMP"
if [[ ! -s "$TEMP" ]]; then
  echo "Database backup is empty; refusing to publish it." >&2
  exit 1
fi

mv -- "$TEMP" "$DEST"
(
  cd "$BACKUP_DIR"
  sha256sum "$NAME" > "$CHECKSUM_TEMP"
)
mv -- "$CHECKSUM_TEMP" "$DEST.sha256"
chmod 600 "$DEST" "$DEST.sha256"
find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'db-*.dump' -o -name 'db-*.dump.sha256' \) \
  -mtime +30 -delete
echo "Backup created: $DEST"
