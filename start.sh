#!/usr/bin/env bash
# start.sh — Levanta PyWI con el override Docker Compose correcto según arquitectura.
# Uso: ./start.sh [--down] [--no-build]
#   --down       : ejecuta 'docker compose down' antes de levantar (limpiar contenedores anteriores)
#   --no-build   : omite --build (usa la imagen en caché)
#
# Arquitecturas detectadas:
#   x86_64 / amd64  → docker-compose.amd64.yml  (GPU NVIDIA)
#   aarch64 / arm64 → docker-compose.arm64.yml  (NPU Rockchip RK3588S)

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

if [[ "$ARCH" == "aarch64" || "$ARCH" == "arm64" ]]; then
  OVERRIDE="docker-compose.arm64.yml"
  ACCEL="NPU Rockchip RK3588S"
else
  OVERRIDE="docker-compose.amd64.yml"
  ACCEL="GPU NVIDIA (amd64)"
fi

echo ""
echo "  ██████╗ ██╗   ██╗██╗    ██╗██╗"
echo "  ██╔══██╗╚██╗ ██╔╝██║    ██║██║"
echo "  ██████╔╝ ╚████╔╝ ██║ █╗ ██║██║"
echo "  ██╔═══╝   ╚██╔╝  ██║███╗██║██║"
echo "  ██║        ██║   ╚███╔███╔╝██║"
echo "  ╚═╝        ╚═╝    ╚══╝╚══╝ ╚═╝"
echo ""
echo "  Python Web IDE — start.sh"
echo "  Arquitectura detectada : $ARCH"
echo "  Acelerador             : $ACCEL"
echo "  Override               : $OVERRIDE"
echo ""

if [[ "$DO_DOWN" == "true" ]]; then
  echo "  → Bajando contenedores anteriores..."
  docker compose -f "$BASE" -f "$OVERRIDE" down
fi

echo "  → Levantando PyWI con override $OVERRIDE..."
docker compose -f "$BASE" -f "$OVERRIDE" up -d $BUILD_FLAG

echo ""
echo "  ✓ PyWI disponible en http://localhost:3000"
echo ""
echo "  Comandos útiles:"
echo "    Ver logs    : docker compose -f $BASE -f $OVERRIDE logs -f"
echo "    Verificar GPU: docker compose -f $BASE -f $OVERRIDE exec web-ide nvidia-smi"
echo "    Bajar       : docker compose -f $BASE -f $OVERRIDE down"
echo ""
