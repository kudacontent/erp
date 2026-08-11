#!/bin/sh
set -eu

APP_DIR="${APP_DIR:-/volume1/docker/kudalabs-erp}"
STATE_FILE="${STATE_FILE:-$APP_DIR/.nas-auto-build.state}"
LOCK_DIR="${LOCK_DIR:-$APP_DIR/.nas-auto-build.lock}"
LOG_FILE="${LOG_FILE:-$APP_DIR/.nas-auto-build.log}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-kudalabs-erp}"

cd "$APP_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

trap cleanup EXIT HUP INT TERM

hash_stream() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum
  else
    shasum -a 256
  fi
}

fingerprint="$(
  find \
    Dockerfile \
    docker-compose.yml \
    docker-compose.live.yml \
    next.config.mjs \
    package.json \
    package-lock.json \
    postcss.config.mjs \
    tailwind.config.ts \
    tsconfig.json \
    prisma \
    public \
    scripts \
    src \
    .env \
    -type f \
    -not -path '*/node_modules/*' \
    -not -path '*/.next/*' \
    -not -path '*/postgres-data/*' \
    -not -path '*/redis-data/*' \
    -not -path '*/uploads/*' \
    -not -path '*/backups/*' \
    -print \
    | sort \
    | while IFS= read -r file; do
        if command -v sha256sum >/dev/null 2>&1; then
          sha256sum "$file"
        else
          shasum -a 256 "$file"
        fi
      done \
    | hash_stream \
    | awk '{print $1}'
)"

previous=""
if [ -f "$STATE_FILE" ]; then
  previous="$(cat "$STATE_FILE")"
fi

if [ "$fingerprint" = "$previous" ]; then
  exit 0
fi

{
  printf '[%s] source change detected; rebuilding %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$COMPOSE_PROJECT_NAME"
  docker compose -p "$COMPOSE_PROJECT_NAME" up -d --build --remove-orphans

  web_id="$(docker compose -p "$COMPOSE_PROJECT_NAME" ps -q web)"
  if [ -z "$web_id" ] || [ "$(docker inspect -f '{{.State.Running}}' "$web_id")" != "true" ]; then
    echo "web container is not running; keeping the previous fingerprint for retry"
    exit 1
  fi

  printf '%s\n' "$fingerprint" > "$STATE_FILE"
  printf '[%s] rebuild completed\n' "$(date '+%Y-%m-%d %H:%M:%S')"
} >> "$LOG_FILE" 2>&1
