# ============================================================
# Stage 1 — deps: instala node_modules con build-essential
# (node-pty requiere compilación nativa via node-gyp).
# Este stage se descarta al final; build-essential NO llega
# a la imagen runtime.
# ============================================================
FROM ghcr.io/astral-sh/uv:0.13.6@sha256:af22a52f5eafef3d78e551599d405c02df61919d18028f0cea8eda93bc9986d0 AS uv-bin

FROM node:24-bookworm-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# devDependencies incluidas: vite y esbuild compilan el frontend
# aquí en build-time; dist/ se copia al stage runtime más abajo.
RUN npm install

# Copiar código y compilar en build-time para no depender de Vite
# en el arranque del contenedor (evita ENOENT en .vite-temp en arm64).
COPY . .
RUN npm run build

# ============================================================
# Stage 2 — runtime: imagen final AUTÓNOMA (self-contained).
# Contiene código + node_modules + .venv. El despliegue usa
# docker compose con volumen nombrado para /app/data.
# ============================================================
FROM node:24-bookworm-slim

WORKDIR /app

# Solo runtime: python para ejecutar los paquetes, uv para crear
# el venv y administrarlos, gosu para bajar privilegios.
# Sin build-essential ni pip.
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    python3 \
    gosu \
    p7zip-full \
    && rm -rf /var/lib/apt/lists/*

COPY --from=uv-bin /uv /usr/local/bin/uv

# npm is only needed in the build stage. The runtime launches Node directly.
RUN rm -rf /usr/local/lib/node_modules/npm && \
    rm -f /usr/local/bin/npm /usr/local/bin/npx

# node_modules compilado desde el stage deps.
# --chown fija ownership en la misma instrucción COPY, evitando
# el antiguo `RUN chown -R /app` que duplicaba toda la capa.
COPY --chown=node:node --from=deps /app/node_modules ./node_modules

# Crear el .venv como usuario node para que sea escribible en
# runtime (PackageManager instala paquetes desde la UI).
# Evita un `chown -R .venv` posterior que duplicaría ~2 GB.
COPY --chown=node:node requirements.txt ./
RUN chown node:node /app
USER node
RUN uv venv --python /usr/bin/python3 --no-managed-python .venv && \
    UV_CACHE_DIR=/tmp/uv-cache uv pip install --python .venv/bin/python -r requirements.txt && \
    rm -rf /tmp/uv-cache
USER root

# Código fuente de la app — propiedad de node en una sola capa.
# .dockerignore excluye node_modules/.venv/dist/.claude/docs
# para no pisar lo ya construido arriba y reducir el contexto.
COPY --chown=node:node . .
# dist/ compilado en el stage deps (no está en .dockerignore de host).
COPY --chown=node:node --from=deps /app/dist ./dist

# Un volumen nombrado nuevo hereda estos permisos; la app escribe
# db.json y proyectos en /app/data desde el primer arranque.
RUN install -d -o node -g node /app/data /app/data/app_data

# Por defecto el entrypoint y la app corren como node. gosu solo se
# usa al iniciar explícitamente como root para reparar datos antiguos.
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
USER node

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
# dist/ ya compilado en el stage deps — arrancar directamente el servidor.
CMD ["node", "dist/server.cjs"]
