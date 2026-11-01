#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
STATE_DIR="$ROOT/.deploy"
TAG="${1:-}"

if [[ ! "$TAG" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]]; then
  echo "Usage: bash scripts/deploy.sh <image-tag>" >&2
  exit 2
fi

mkdir -p "$STATE_DIR"
PREVIOUS_TAG=""
if [[ -f "$STATE_DIR/active-tag" ]]; then
  PREVIOUS_TAG="$(<"$STATE_DIR/active-tag")"
fi

rollback_on_failure() {
  local status=$?
  trap - ERR
  if (( status != 0 )) && [[ -n "$PREVIOUS_TAG" ]]; then
    echo "Deployment failed; restoring application image $PREVIOUS_TAG." >&2
    bash "$ROOT/scripts/rollback.sh" "$PREVIOUS_TAG" || {
      echo "Automatic rollback failed. Inspect docker compose logs immediately." >&2
    }
  fi
  exit "$status"
}
trap rollback_on_failure ERR

export APP_IMAGE_TAG="$TAG"
docker compose -f "$COMPOSE_FILE" pull api web
docker compose -f "$COMPOSE_FILE" up -d --wait --remove-orphans

if [[ -n "$PREVIOUS_TAG" && "$PREVIOUS_TAG" != "$TAG" ]]; then
  printf '%s\n' "$PREVIOUS_TAG" > "$STATE_DIR/previous-tag"
fi
printf '%s\n' "$TAG" > "$STATE_DIR/active-tag"
echo "Deployment $TAG is healthy."
