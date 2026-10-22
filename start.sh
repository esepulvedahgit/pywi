#!/usr/bin/env bash
# start.sh — Levanta PyWI con docker compose.
# Uso: ./start.sh [--down]
#   --down : ejecuta 'docker compose down' antes de levantar
#
# Requisitos previos:
#   1. Imagen cargada: docker load < python-web-ide-arm64.tar.gz
#   2. Archivo .env.local con JWT_SECRET, ENCRYPTION_KEY y APP_URL

set -euo pipefail

DO_DOWN=false
for arg in "$@"; do
  case "$arg" in
    --down) DO_DOWN=true ;;
  esac
done

echo ""
echo "  ██████╗ ██╗   ██╗██╗    ██╗██╗"
echo "  ██╔══██╗╚██╗ ██╔╝██║    ██║██║"
echo "  ██████╔╝ ╚████╔╝ ██║ █╗ ██║██║"
echo "  ██╔═══╝   ╚██╔╝  ██║███╗██║██║"
echo "  ██║        ██║   ╚███╔███╔╝██║"
echo "  ╚═╝        ╚═╝    ╚══╝╚══╝ ╚═╝"
echo ""
echo "  Python Web IDE — start.sh"
echo ""

if [[ "$DO_DOWN" == "true" ]]; then
  echo "  → Bajando contenedores anteriores..."
  docker compose down
fi

echo "  → Levantando PyWI..."
docker compose up -d

echo ""
echo "  Comandos útiles:"
echo "    Ver logs : docker compose logs -f"
echo "    Bajar    : docker compose down"
echo ""
echo "  ✓ PyWI disponible en http://localhost:3000"
echo ""
