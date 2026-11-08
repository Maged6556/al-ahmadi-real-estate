#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
COMPOSE_FILE="$ROOT/docker-compose.prod.yml"
STATE_DIR="$ROOT/.deploy"
TAG="${1:-}"

if [[ -z "$TAG" && -f "$STATE_DIR/previous-tag" ]]; then
  TAG="$(<"$STATE_DIR/previous-tag")"
fi
if [[ ! "$TAG" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$ ]]; then
  echo "Usage: bash scripts/rollback.sh <image-tag>" >&2
  echo "Or deploy a prior version first so .deploy/previous-tag is available." >&2
  exit 2
fi

mkdir -p "$STATE_DIR"
CURRENT_TAG=""
if [[ -f "$STATE_DIR/active-tag" ]]; then
  CURRENT_TAG="$(<"$STATE_DIR/active-tag")"
fi

export APP_IMAGE_TAG="$TAG"
docker compose -f "$COMPOSE_FILE" pull api web
docker compose -f "$COMPOSE_FILE" up -d --wait --remove-orphans

if [[ -n "$CURRENT_TAG" && "$CURRENT_TAG" != "$TAG" ]]; then
  printf '%s\n' "$CURRENT_TAG" > "$STATE_DIR/previous-tag"
fi
printf '%s\n' "$TAG" > "$STATE_DIR/active-tag"
echo "Rollback to $TAG is healthy."
