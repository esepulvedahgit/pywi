#!/bin/sh
set -e

# Solo una ejecución explícita como root repara volúmenes antiguos.
# El arranque normal conserva el usuario node (UID 1000) de la imagen.
if [ "$(id -u)" -eq 0 ]; then
  mkdir -p /app/data/app_data
  chown -R node:node /app/data
  exec gosu node "$@"
fi

mkdir -p /app/data/app_data
exec "$@"
