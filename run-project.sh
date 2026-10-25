#!/usr/bin/env bash
# macOS/Linux launcher for ClearTitle.
# Same flow as run-project.bat / RUN_ALL.bat:
#   1. Hardhat node on 127.0.0.1:8545
#   2. Deploy LandRegistry and assign registrar roles
#   3. Express API on port 5001 (5000 is often taken by macOS AirPlay)
#   4. Vite app on port 5173
#
# Usage:
#   ./run-project.sh            start everything (default)
#   ./run-project.sh stop       stop services this script started
#   ./run-project.sh restart    stop, then start
#   ./run-project.sh install    copy missing .env files and npm install
#   ./run-project.sh logs       follow service logs
#   ./run-project.sh status     show what is running

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$ROOT_DIR/contracts"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"

HARDHAT_PORT=8545
BACKEND_PORT=5001
FRONTEND_PORT=5173
FRONTEND_URL="http://localhost:${FRONTEND_PORT}"

step() {
  printf '\n[%s] %s\n' "$1" "$2"
}

info() {
  printf '    %s\n' "$1"
}

die() {
  printf '\nError: %s\n' "$1" >&2
  exit 1
}

require_node() {
  command -v node >/dev/null 2>&1 || die "Node.js is not installed. Install it from https://nodejs.org"
  command -v npm >/dev/null 2>&1 || die "npm is not installed."
  local major
  major="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$major" -lt 18 ]]; then
    die "Node.js 18 or newer is required (found $(node -v))."
  fi
}

copy_env_if_missing() {
  local dir="$1"
  local label="$2"
  if [[ ! -f "$dir/.env" && -f "$dir/.env.example" ]]; then
    cp "$dir/.env.example" "$dir/.env"
    info "Created ${label}/.env from .env.example"
  fi
}

ensure_env() {
  copy_env_if_missing "$CONTRACTS_DIR" "contracts"
  copy_env_if_missing "$BACKEND_DIR" "backend"
  copy_env_if_missing "$FRONTEND_DIR" "frontend"
}

ensure_deps() {
  local dir="$1"
  local label="$2"
  if [[ ! -d "$dir/node_modules" ]]; then
    info "Installing ${label} dependencies (first run)..."
    (cd "$dir" && npm install)
  fi
}

install_all() {
  require_node
  ensure_env
  info "Installing smart contract dependencies..."
  (cd "$CONTRACTS_DIR" && npm install)
  info "Installing backend dependencies..."
  (cd "$BACKEND_DIR" && npm install)
  info "Installing frontend dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
  printf '\nDependencies installed.\n'
}

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

read_pid() {
  local pidfile="$LOG_DIR/$1.pid"
  if [[ -f "$pidfile" ]]; then
    tr -d '[:space:]' < "$pidfile"
  fi
}

kill_tree() {
  local pid="$1"
  local signal="${2:-TERM}"
  local child
  local children
  children="$(pgrep -P "$pid" 2>/dev/null || true)"
  for child in $children; do
    kill_tree "$child" "$signal"
  done
  kill "-$signal" "$pid" 2>/dev/null || true
}

stop_one() {
  local name="$1"
  local pid
  pid="$(read_pid "$name")"
  if [[ -z "${pid:-}" ]]; then
    return 0
  fi
  if kill -0 "$pid" 2>/dev/null; then
    info "Stopping ${name} (pid ${pid})"
    kill_tree "$pid" TERM
    sleep 1
    if kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid" KILL
    fi
  fi
  rm -f "$LOG_DIR/${name}.pid"
}

stop_services() {
  mkdir -p "$LOG_DIR"
  stop_one frontend
  stop_one backend
  stop_one hardhat
}

wait_for_ports_to_close() {
  local port
  local i
  for port in "$HARDHAT_PORT" "$BACKEND_PORT" "$FRONTEND_PORT"; do
    for i in 1 2 3 4 5 6 7 8 9 10; do
      if ! port_in_use "$port"; then
        break
      fi
      sleep 0.5
    done
  done
}

start_service() {
  local name="$1"
  local dir="$2"
  shift 2
  local logfile="$LOG_DIR/${name}.log"
  local pidfile="$LOG_DIR/${name}.pid"
  : > "$logfile"
  (
    cd "$dir" || exit 1
    nohup "$@" >>"$logfile" 2>&1 </dev/null &
    echo $! > "$pidfile"
  )
  local pid
  pid="$(read_pid "$name")"
  if [[ -z "${pid:-}" ]] || ! kill -0 "$pid" 2>/dev/null; then
    die "Failed to start ${name}. See logs/${name}.log"
  fi
  info "${name} started (pid ${pid}, log logs/${name}.log)"
}

hardhat_ready() {
  curl -sf -m 2 -X POST \
    -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
    "http://127.0.0.1:${HARDHAT_PORT}" | grep -q '"result"'
}

http_ready() {
  curl -sf -m 2 -o /dev/null "$1"
}

wait_until() {
  local attempts="$1"
  local label="$2"
  shift 2
  local i
  for ((i = 1; i <= attempts; i++)); do
    if "$@"; then
      return 0
    fi
    sleep 1
  done
  printf 'Timed out waiting for %s.\n' "$label" >&2
  return 1
}

refuse_if_port_busy() {
  local port="$1"
  local label="$2"
  if port_in_use "$port"; then
    local owner
    owner="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN | awk 'NR==2 {print $1, $2}')"
    die "Port ${port} (${label}) is already in use${owner:+ by ${owner}}. Stop that process, then run ./run-project.sh again."
  fi
}

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp
  if [[ ! -f "$file" ]]; then
    printf '%s=%s\n' "$key" "$value" > "$file"
    return 0
  fi
  tmp="$(mktemp)"
  if grep -q "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" 'BEGIN { FS = OFS = "=" } $1 == k { $0 = k "=" v } { print }' "$file" > "$tmp"
  else
    cat "$file" > "$tmp"
    printf '\n%s=%s\n' "$key" "$value" >> "$tmp"
  fi
  mv "$tmp" "$file"
}

# macOS Control Center listens on 5000 for AirPlay. Use the port in
# backend/.env when it is free, otherwise take the next open one and
# point the web app at it.
resolve_backend_port() {
  local configured="5001"
  local line=""
  local candidate
  local port
  if [[ -f "$BACKEND_DIR/.env" ]]; then
    line="$(grep -E '^PORT=' "$BACKEND_DIR/.env" | head -1 | cut -d= -f2- | tr -d '[:space:]' || true)"
  fi
  if [[ -n "$line" ]]; then
    configured="$line"
  fi
  port="$configured"
  if port_in_use "$port"; then
    local owner
    owner="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN | awk 'NR==2 {print $1, $2}')"
    info "Port ${port} is already in use${owner:+ by ${owner}}. Switching the API to a free port."
    port=""
    for candidate in 5001 5050 5055 5080 8000 8080; do
      if ! port_in_use "$candidate"; then
        port="$candidate"
        break
      fi
    done
    if [[ -z "$port" ]]; then
      die "Could not find a free port for the API."
    fi
  fi
  BACKEND_PORT="$port"
  set_env_value "$BACKEND_DIR/.env" "PORT" "$port"
  set_env_value "$FRONTEND_DIR/.env" "VITE_API_URL" "http://localhost:${port}/api"
  info "API port is ${port}"
}

warn_if_mongo_missing() {
  local uri=""
  if [[ -f "$BACKEND_DIR/.env" ]]; then
    uri="$(grep -E '^MONGODB_URI=' "$BACKEND_DIR/.env" | head -1 | cut -d= -f2- || true)"
  fi
  if [[ -n "$uri" && "$uri" != *"cluster0.xxxxx.mongodb.net"* && "$uri" != *"<username>"* ]]; then
    return 0
  fi
  if command -v nc >/dev/null 2>&1 && nc -z -G 1 127.0.0.1 27017 >/dev/null 2>&1; then
    return 0
  fi
  cat <<'EOF'

    MongoDB is not running on 127.0.0.1:27017.
    The API uses that address until backend/.env has a real MONGODB_URI.
    The blockchain node and the website can still start. The API will exit until MongoDB is up.
    Start it, then run ./run-project.sh again. For example:
      brew tap mongodb/brew
      brew install mongodb-community
      brew services start mongodb-community

EOF
}

sync_frontend_address() {
  local json="$CONTRACTS_DIR/deployments/localhost.json"
  [[ -f "$json" && -f "$FRONTEND_DIR/.env" ]] || return 0
  DEPLOY_JSON="$json" FRONTEND_ENV="$FRONTEND_DIR/.env" node <<'EOF'
const fs = require("fs");
const dep = JSON.parse(fs.readFileSync(process.env.DEPLOY_JSON, "utf8"));
const envPath = process.env.FRONTEND_ENV;
let env = fs.readFileSync(envPath, "utf8");
const line = `VITE_CONTRACT_ADDRESS=${dep.contractAddress}`;
if (/^VITE_CONTRACT_ADDRESS=/m.test(env)) {
  env = env.replace(/^VITE_CONTRACT_ADDRESS=.*/m, line);
} else {
  if (!env.endsWith("\n")) env += "\n";
  env += line + "\n";
}
fs.writeFileSync(envPath, env);
process.stdout.write(dep.contractAddress + "\n");
EOF
}

show_log_tail() {
  local name="$1"
  local logfile="$LOG_DIR/${name}.log"
  if [[ -f "$logfile" ]]; then
    printf '\n--- last lines of logs/%s.log ---\n' "$name"
    tail -n 40 "$logfile" || true
  fi
}

start_all() {
  require_node
  mkdir -p "$LOG_DIR"

  printf '\n====================================================================\n'
  printf '       LAND OWNERSHIP REGISTRY — macOS LAUNCHER\n'
  printf '====================================================================\n'

  step "1/4" "Preparing environment"
  stop_services
  wait_for_ports_to_close
  ensure_env
  ensure_deps "$CONTRACTS_DIR" "contracts"
  ensure_deps "$BACKEND_DIR" "backend"
  ensure_deps "$FRONTEND_DIR" "frontend"
  resolve_backend_port
  warn_if_mongo_missing

  refuse_if_port_busy "$HARDHAT_PORT" "Hardhat"
  refuse_if_port_busy "$FRONTEND_PORT" "frontend"

  step "2/4" "Starting Hardhat node on port ${HARDHAT_PORT}"
  start_service hardhat "$CONTRACTS_DIR" npx hardhat node
  info "Waiting for the node (the first compile can take a minute)..."
  if ! wait_until 90 "Hardhat RPC" hardhat_ready; then
    show_log_tail hardhat
    stop_one hardhat
    die "Hardhat node did not become ready. See logs/hardhat.log"
  fi
  info "Hardhat RPC is up at http://127.0.0.1:${HARDHAT_PORT}"

  step "3/4" "Deploying LandRegistry and setting up roles"
  if ! (cd "$CONTRACTS_DIR" && npx hardhat run scripts/deploy.js --network localhost); then
    stop_one hardhat
    die "Contract deployment failed."
  fi
  if ! (cd "$CONTRACTS_DIR" && npx hardhat run scripts/setup-roles.js --network localhost); then
    stop_one hardhat
    die "Role setup failed."
  fi
  local address
  address="$(sync_frontend_address || true)"
  if [[ -n "${address:-}" ]]; then
    info "frontend/.env now points at ${address}"
  fi

  step "4/4" "Starting API (port ${BACKEND_PORT}) and web app (port ${FRONTEND_PORT})"
  start_service backend "$BACKEND_DIR" npm run dev
  start_service frontend "$FRONTEND_DIR" npm run dev

  info "Waiting for the web app..."
  if wait_until 40 "Vite" http_ready "$FRONTEND_URL"; then
    if [[ "$(uname -s)" == "Darwin" ]] && command -v open >/dev/null 2>&1; then
      open "$FRONTEND_URL" || true
    fi
  else
    show_log_tail frontend
    info "The web app did not answer yet. Check logs/frontend.log"
  fi

  sleep 2
  local backend_pid
  backend_pid="$(read_pid backend)"
  if [[ -z "${backend_pid:-}" ]] || ! kill -0 "$backend_pid" 2>/dev/null; then
    show_log_tail backend
    info "The API is not running. It needs MongoDB (see the note above, or set MONGODB_URI in backend/.env)."
  fi

  cat <<EOF

====================================================================
  Services launched:
    Hardhat RPC  : http://127.0.0.1:${HARDHAT_PORT}
    Backend API  : http://localhost:${BACKEND_PORT}
    Web app      : ${FRONTEND_URL}

  Logs:  logs/hardhat.log  logs/backend.log  logs/frontend.log
  Watch: ./run-project.sh logs
  Stop:  ./run-project.sh stop
====================================================================
EOF
}

show_status() {
  local name pid state
  printf '%-12s %s\n' "SERVICE" "STATUS"
  for name in hardhat backend frontend; do
    pid="$(read_pid "$name")"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      state="running (pid ${pid})"
    else
      state="stopped"
    fi
    printf '%-12s %s\n' "$name" "$state"
  done
}

follow_logs() {
  mkdir -p "$LOG_DIR"
  touch "$LOG_DIR/hardhat.log" "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
  printf 'Following logs. Ctrl+C stops following. Services keep running.\n'
  printf 'Stop them with ./run-project.sh stop\n\n'
  tail -n 30 -F "$LOG_DIR/hardhat.log" "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
}

usage() {
  cat <<'EOF'
Usage: ./run-project.sh [start|stop|restart|install|logs|status]

  start     Start Hardhat, deploy contracts, then start the API and web app
  stop      Stop the Hardhat node, API, and web app started by this script
  restart   Stop, then start
  install   Copy missing .env files and install npm dependencies
  logs      Follow service logs
  status    Show whether each service is running
EOF
}

main() {
  local cmd="${1:-start}"
  case "$cmd" in
    start) start_all ;;
    stop)
      stop_services
      wait_for_ports_to_close
      printf 'Stopped Hardhat, the API, and the web app.\n'
      ;;
    restart)
      stop_services
      wait_for_ports_to_close
      start_all
      ;;
    install) install_all ;;
    logs) follow_logs ;;
    status) show_status ;;
    -h|--help|help) usage ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
}

main "$@"
