#!/bin/sh
# NAS 자동 배포 스크립트.
#
# 동작:
#   1) GitHub 의 origin/main 을 받아와 작업 트리를 그 상태로 맞춘다
#   2) 소스 파일 지문(fingerprint)이 이전과 다르면 컨테이너를 다시 빌드한다
#
# 이 폴더는 "배포 대상"이지 작업 공간이 아니다. 여기서 직접 고친 내용은
# git reset 으로 사라지므로, 수정은 항상 GitHub 로 push 한 뒤 반영시킨다.
#
# Synology 작업 스케줄러에 root 사용자로 등록해 두는 것을 전제로 한다.
# root 가 아니면 docker 호출에 sudo 를 붙여 시도한다.
set -eu

APP_DIR="${APP_DIR:-/volume1/docker/kudalabs-erp}"
STATE_FILE="${STATE_FILE:-$APP_DIR/.nas-auto-build.state}"
LOCK_DIR="${LOCK_DIR:-$APP_DIR/.nas-auto-build.lock}"
LOG_FILE="${LOG_FILE:-$APP_DIR/.nas-auto-build.log}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-kudalabs-erp}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
# GIT_SYNC=0 으로 두면 git 동기화를 건너뛰고 파일 변화만 감지한다
GIT_SYNC="${GIT_SYNC:-1}"

cd "$APP_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

trap cleanup EXIT HUP INT TERM

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "$LOG_FILE"
}

# ── docker 실행 (root 가 아니면 sudo -n 으로 시도) ──────────────────
if [ -x /usr/local/bin/docker ]; then
  DOCKER_BIN="/usr/local/bin/docker"
else
  DOCKER_BIN="$(command -v docker 2>/dev/null || true)"
fi

if [ -z "$DOCKER_BIN" ]; then
  log "docker 를 찾을 수 없습니다. PATH 를 확인하세요."
  exit 1
fi

docker_exec() {
  if [ "$(id -u)" -eq 0 ]; then
    "$DOCKER_BIN" "$@"
  else
    sudo -n "$DOCKER_BIN" "$@"
  fi
}

# docker 소켓에 접근 가능한지 먼저 확인한다.
# 접근이 막힌 채로 진행하면 절반만 실행되고 애매한 상태가 된다.
if ! docker_exec version >/dev/null 2>&1; then
  log "docker 데몬에 접근할 수 없습니다 (권한 문제). 작업 스케줄러의 사용자를 root 로 설정하세요."
  exit 1
fi

compose() {
  docker_exec compose -p "$COMPOSE_PROJECT_NAME" "$@"
}

# ── 1) GitHub 에서 최신 코드 받기 ─────────────────────────────────
if [ "$GIT_SYNC" = "1" ] && [ -d .git ]; then
  # 스케줄러가 root 로 돌면 폴더 소유자와 달라 git 이 거부할 수 있다
  git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

  # 시놀로지는 색인용 @eaDir 폴더를 아무 데나 만든다.
  # 이게 .git/refs 안에 생기면 git 이 잘못된 ref 로 읽어
  #   fatal: bad object refs/.../@eaDir/...@SynoEAStream
  # 으로 fetch 가 통째로 실패한다. 매번 지우고 시작한다.
  find "$APP_DIR/.git" -type d -name "@eaDir" -prune -exec rm -rf {} + 2>/dev/null || true

  if GIT_TERMINAL_PROMPT=0 git fetch --quiet origin "$DEPLOY_BRANCH" 2>>"$LOG_FILE"; then
    local_head="$(git rev-parse HEAD 2>/dev/null || echo none)"
    remote_head="$(git rev-parse "origin/$DEPLOY_BRANCH" 2>/dev/null || echo none)"

    if [ "$local_head" != "$remote_head" ] && [ "$remote_head" != "none" ]; then
      log "origin/$DEPLOY_BRANCH 로 동기화: $(echo "$local_head" | cut -c1-7) -> $(echo "$remote_head" | cut -c1-7)"
      # 배포 대상 폴더이므로 로컬 수정은 버리고 원격 상태로 맞춘다.
      # .env, uploads, postgres-data 등 gitignore 대상은 그대로 남는다.
      git reset --hard --quiet "origin/$DEPLOY_BRANCH" 2>>"$LOG_FILE"
    fi
  else
    log "git fetch 실패. 이번 회차는 로컬 파일 상태로만 진행합니다."
  fi
fi

# ── 2) 소스 지문 계산 ─────────────────────────────────────────────
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

# ── 3) 재빌드 ─────────────────────────────────────────────────────
{
  printf '[%s] source change detected; rebuilding %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$COMPOSE_PROJECT_NAME"
  compose up -d --build --remove-orphans

  web_id="$(compose ps -q web)"
  if [ -z "$web_id" ] || [ "$(docker_exec inspect -f '{{.State.Running}}' "$web_id")" != "true" ]; then
    echo "web container is not running; keeping the previous fingerprint for retry"
    exit 1
  fi

  printf '%s\n' "$fingerprint" > "$STATE_FILE"
  printf '[%s] rebuild completed\n' "$(date '+%Y-%m-%d %H:%M:%S')"
} >> "$LOG_FILE" 2>&1
