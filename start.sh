#!/usr/bin/env bash
# start.sh — Levanta PyWI eligiendo el override correcto según arquitectura.
# Uso: ./start.sh [--down] [--no-build]
#   --down       : ejecuta 'docker compose down' antes de levantar
#   --no-build   : omite --build (usa la imagen en caché)
#
# amd64 / x86_64 → docker compose up (GPU NVIDIA ya incluida en el base)
# aarch64 / arm64 → override docker-compose.arm64.yml (anula GPU, activa NPU RK3588S)

set -euo pipefail

DO_DOWN=false
BUILD_FLAG="--build"

for arg in "$@"; do
  case "$arg" in
    --down)      DO_DOWN=true ;;
    --no-build)  BUILD_FLAG="" ;;
  esac
done

ARCH=$(uname -m)
BASE="docker-compose.yml"

echo ""
echo "  ██████╗ ██╗   ██╗██╗    ██╗██╗"
echo "  ██╔══██╗╚██╗ ██╔╝██║    ██║██║"
echo "  ██████╔╝ ╚████╔╝ ██║ █╗ ██║██║"
echo "  ██╔═══╝   ╚██╔╝  ██║███╗██║██║"
echo "  ██║        ██║   ╚███╔███╔╝██║"
echo "  ╚═╝        ╚═╝    ╚══╝╚══╝ ╚═╝"
echo ""
echo "  Python Web IDE — start.sh"
echo "  Arquitectura : $ARCH"
echo ""

if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  OVERRIDE="docker-compose.arm64.yml"
  ACCEL="NPU Rockchip RK3588S"
  COMPOSE_CMD="docker compose -f $BASE -f $OVERRIDE"
  echo "  Acelerador   : $ACCEL"
  echo "  Override     : $OVERRIDE"
  echo ""

  if [[ "$DO_DOWN" == "true" ]]; then
    echo "  → Bajando contenedores anteriores..."
    $COMPOSE_CMD down
  fi

  echo "  → Levantando PyWI (arm64 + NPU)..."
  $COMPOSE_CMD up -d $BUILD_FLAG

  echo ""
  echo "  Comandos útiles:"
  echo "    Ver logs : $COMPOSE_CMD logs -f"
  echo "    Bajar    : $COMPOSE_CMD down"
else
  ACCEL="GPU NVIDIA (vía docker-compose.yml base)"
  COMPOSE_CMD="docker compose"
  echo "  Acelerador   : $ACCEL"
  echo ""

  if [[ "$DO_DOWN" == "true" ]]; then
    echo "  → Bajando contenedores anteriores..."
    $COMPOSE_CMD down
  fi

  echo "  → Levantando PyWI (amd64 + GPU NVIDIA)..."
  $COMPOSE_CMD up -d $BUILD_FLAG

  echo ""
  echo "  Verificar GPU dentro del contenedor:"
  echo "    docker compose exec web-ide nvidia-smi"
  echo "  Ver logs:"
  echo "    docker compose logs -f"
  echo "  Bajar:"
  echo "    docker compose down"
fi

echo ""
echo "  ✓ PyWI disponible en http://localhost:3000"
echo ""
