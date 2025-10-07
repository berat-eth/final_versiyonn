#!/usr/bin/env bash

set -euo pipefail

# Usage:
#   ./scripts/setup-redis.sh \
#     --host 127.0.0.1 \
#     --port 6379 \
#     --password '38cdfD8217..' \
#     --db 0 \
#     --app-dir /root/final_versiyonn/server \
#     --pm2-name huglu-api \
#     [--docker]
#
# What it does:
# 1) Builds REDIS_URL and exports env (app .env and current shell)
# 2) Ensures npm 'redis' package installed in app dir
# 3) Tests connectivity and auth with redis-cli
# 4) If not reachable and --docker flag given, starts a Redis container
# 5) Restarts PM2 app if pm2 name provided

HOST="127.0.0.1"
PORT="6379"
PASSWORD=""
DB_INDEX="0"
APP_DIR=""
PM2_NAME=""
USE_DOCKER="false"

print_err() { echo -e "\e[31mERROR:\e[0m $*" >&2; }
print_ok() { echo -e "\e[32mOK:\e[0m $*"; }
print_info() { echo -e "\e[34mINFO:\e[0m $*"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --password) PASSWORD="$2"; shift 2;;
    --db) DB_INDEX="$2"; shift 2;;
    --app-dir) APP_DIR="$2"; shift 2;;
    --pm2-name) PM2_NAME="$2"; shift 2;;
    --docker) USE_DOCKER="true"; shift 1;;
    -h|--help)
      grep '^#' "$0" | sed -e 's/^# \{0,1\}//'; exit 0;;
    *) print_err "Unknown arg: $1"; exit 1;;
  esac
done

if [[ -z "$APP_DIR" ]]; then
  print_err "--app-dir is required (e.g., /root/final_versiyonn/server)"; exit 1
fi

if [[ -n "$PASSWORD" ]]; then
  REDIS_URL="redis://:${PASSWORD}@${HOST}:${PORT}/${DB_INDEX}"
else
  REDIS_URL="redis://${HOST}:${PORT}/${DB_INDEX}"
fi

print_info "Using REDIS_URL=${REDIS_URL}"

# 1) Export env for current shell and write .env for the app
export REDIS_URL="$REDIS_URL"
if [[ -n "$PASSWORD" ]]; then export REDIS_PASSWORD="$PASSWORD"; fi

ENV_FILE="$APP_DIR/.env"
mkdir -p "$APP_DIR"
if [[ -f "$ENV_FILE" ]]; then
  # Update or append REDIS_URL / REDIS_PASSWORD
  grep -q '^REDIS_URL=' "$ENV_FILE" && sed -i "s#^REDIS_URL=.*#REDIS_URL=${REDIS_URL//#/\\#}#" "$ENV_FILE" || echo "REDIS_URL=$REDIS_URL" >> "$ENV_FILE"
  if [[ -n "$PASSWORD" ]]; then
    grep -q '^REDIS_PASSWORD=' "$ENV_FILE" && sed -i "s#^REDIS_PASSWORD=.*#REDIS_PASSWORD=${PASSWORD//#/\\#}#" "$ENV_FILE" || echo "REDIS_PASSWORD=$PASSWORD" >> "$ENV_FILE"
  fi
else
  echo "REDIS_URL=$REDIS_URL" > "$ENV_FILE"
  if [[ -n "$PASSWORD" ]]; then echo "REDIS_PASSWORD=$PASSWORD" >> "$ENV_FILE"; fi
fi
print_ok ".env updated at $ENV_FILE"

# 2) Ensure npm 'redis' package installed in app dir
if [[ -f "$APP_DIR/package.json" ]]; then
  pushd "$APP_DIR" >/dev/null
  if ! node -e "require.resolve('redis')" >/dev/null 2>&1; then
    print_info "Installing npm 'redis' package in $APP_DIR"
    npm install redis --production --no-fund --no-audit
  else
    print_ok "npm 'redis' already present"
  fi
  popd >/dev/null
else
  print_err "package.json not found at $APP_DIR"
fi

# Helper to test TCP connectivity
tcp_test() {
  local h="$1" p="$2"
  if command -v nc >/dev/null 2>&1; then
    nc -z -w 2 "$h" "$p" && return 0 || return 1
  elif command -v timeout >/dev/null 2>&1; then
    timeout 2 bash -c "</dev/tcp/${h}/${p}" >/dev/null 2>&1 && return 0 || return 1
  else
    print_info "nc/timeout not found; skipping raw TCP test"; return 0
  fi
}

# 3) Test connectivity and auth with redis-cli
if ! command -v redis-cli >/dev/null 2>&1; then
  print_info "Installing redis-tools (redis-cli) if available"
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y && sudo apt-get install -y redis-tools
  elif command -v yum >/dev/null 2>&1; then
    sudo yum install -y redis
  else
    print_err "redis-cli not found and package manager unsupported; please install redis-cli manually"
  fi
fi

if ! tcp_test "$HOST" "$PORT"; then
  print_err "TCP connection to ${HOST}:${PORT} failed"
  if [[ "$USE_DOCKER" == "true" ]] && command -v docker >/dev/null 2>&1; then
    print_info "Starting Redis via Docker..."
    docker rm -f huglu-redis >/dev/null 2>&1 || true
    if [[ -n "$PASSWORD" ]]; then
      docker run -d --name huglu-redis -p ${PORT}:6379 redis:7 \
        bash -lc "exec docker-entrypoint.sh redis-server --requirepass '${PASSWORD}' --bind 0.0.0.0 --appendonly yes"
    else
      docker run -d --name huglu-redis -p ${PORT}:6379 redis:7 \
        bash -lc "exec docker-entrypoint.sh redis-server --bind 0.0.0.0 --appendonly yes"
    fi
    sleep 2
  else
    print_info "You can enable --docker to auto-start Redis in Docker or ensure a Redis service is running."
  fi
fi

if command -v redis-cli >/dev/null 2>&1; then
  if [[ -n "$PASSWORD" ]]; then
    redis-cli -h "$HOST" -p "$PORT" -a "$PASSWORD" PING || true
  else
    redis-cli -h "$HOST" -p "$PORT" PING || true
  fi
fi

print_info "Final REDIS_URL: $REDIS_URL"

# 5) Restart PM2 app if requested
if [[ -n "$PM2_NAME" ]]; then
  if command -v pm2 >/dev/null 2>&1; then
    print_info "Restarting PM2 app: $PM2_NAME"
    pm2 restart "$PM2_NAME" || pm2 start "$APP_DIR/server.js" --name "$PM2_NAME" --cwd "$APP_DIR"
  else
    print_info "pm2 not found; skipping PM2 restart"
  fi
fi

print_ok "Redis setup script completed."


