#!/usr/bin/env bash
# deploy.sh — despliegue en un clic de PyWI (Python Web IDE)
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/esepulvedahgit/pywi/main/deploy.sh | bash
#
# Clona el repo, genera JWT_SECRET/ENCRYPTION_KEY, pide el dominio de forma
# interactiva, construye la imagen Docker y levanta el servicio con
# docker compose up -d.

set -eu

REPO_URL="https://github.com/esepulvedahgit/pywi.git"
TARGET_DIR="${PYWI_DEPLOY_DIR:-pywi}"

log()  { printf '\n\033[1;36m==>\033[0m %s\n' "$1"; }
err()  { printf '\n\033[1;31mERROR:\033[0m %s\n' "$1" >&2; }

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Falta '$1' en el PATH. Instálalo y vuelve a ejecutar el script."
    exit 1
  fi
}

log "Verificando prerrequisitos"
require git
require docker
if ! docker compose version >/dev/null 2>&1; then
  err "Se requiere el plugin 'docker compose' (v2)."
  exit 1
fi

log "Obteniendo el código fuente"
if [ -d "$TARGET_DIR/.git" ]; then
  git -C "$TARGET_DIR" pull --ff-only
else
  git clone "$REPO_URL" "$TARGET_DIR"
fi
cd "$TARGET_DIR"

log "Preparando .env"
if [ ! -f .env ]; then
  cp .env.example .env
fi

set_env_var() {
  # set_env_var KEY VALUE — reemplaza o añade KEY=VALUE en .env
  key="$1"
  value="$2"
  if grep -q "^${key}=" .env; then
    tmp_file="$(mktemp)"
    awk -v k="$key" -v v="$value" -F'=' 'BEGIN{OFS="="} $1==k{$0=k"="v} {print}' .env > "$tmp_file"
    mv "$tmp_file" .env
  else
    printf '%s=%s\n' "$key" "$value" >> .env
  fi
}

gen_hex() {
  # gen_hex BYTES — genera BYTES aleatorios en hex, con openssl o python3
  bytes="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$bytes"
  elif command -v python3 >/dev/null 2>&1; then
    python3 -c "import secrets; print(secrets.token_hex($bytes))"
  else
    err "Se necesita 'openssl' o 'python3' para generar secretos."
    exit 1
  fi
}

log "Generando secretos (JWT_SECRET, ENCRYPTION_KEY)"
current_jwt="$(grep '^JWT_SECRET=' .env | cut -d= -f2- || true)"
case "$current_jwt" in
  ""|CHANGE_ME*)
    set_env_var JWT_SECRET "$(gen_hex 48)"
    ;;
esac

current_enc="$(grep '^ENCRYPTION_KEY=' .env | cut -d= -f2- || true)"
case "$current_enc" in
  ""|CHANGE_ME*)
    set_env_var ENCRYPTION_KEY "$(gen_hex 32)"
    ;;
esac

log "Configuración del dominio"
DOMAIN=""
read -r -p "Dominio público (ej: pywi.midominio.com), Enter para usar localhost: " DOMAIN < /dev/tty || true

if [ -n "$DOMAIN" ]; then
  SCHEME="https"
  read -r -p "¿Usar https? [S/n]: " USE_HTTPS < /dev/tty || true
  case "$USE_HTTPS" in
    n|N|no|No|NO) SCHEME="http" ;;
  esac
  APP_URL="${SCHEME}://${DOMAIN}"
else
  APP_URL="http://localhost:3000"
fi
set_env_var APP_URL "$APP_URL"

log "Detectando arquitectura"
ARCH_RAW="$(uname -m)"
case "$ARCH_RAW" in
  x86_64|amd64) ARCH="amd64" ;;
  aarch64|arm64) ARCH="arm64" ;;
  *) ARCH="amd64" ;;
esac
IMAGE_NAME="python-web-ide:${ARCH}"
set_env_var IMAGE_NAME "$IMAGE_NAME"

if [ "$ARCH" = "arm64" ]; then
  log "Arquitectura arm64 detectada"
  echo "Este script no aplica el overlay docker-compose.arm64.yml (GPU/NPU)."
  echo "Para aceleración NPU en Radxa/Orange Pi revisa docs/DEPLOY-ARM64.md."
fi

log "Construyendo la imagen Docker ($IMAGE_NAME)"
docker build -t "$IMAGE_NAME" .

log "Levantando el servicio (docker compose up -d)"
docker compose up -d

log "Esperando a que el servicio responda"
READY=0
for i in $(seq 1 30); do
  if docker compose logs 2>/dev/null | grep -q "Server running on port 3000"; then
    READY=1
    break
  fi
  if curl -sf "http://localhost:3000" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 2
done

if [ "$READY" -ne 1 ]; then
  err "El servicio no respondió a tiempo. Últimos logs:"
  docker compose logs --tail=50
  exit 1
fi

log "¡Listo! PyWI está arriba"
echo "Accede en: $APP_URL"
echo "El primer usuario en registrarse se convierte en administrador."
echo
echo "Comandos útiles:"
echo "  docker compose logs -f     # ver logs en vivo"
echo "  docker compose ps          # ver estado"
echo "  docker compose down        # detener"
