<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1abd6a0c-71c6-4c47-9e34-65c1b6389246

## Run Locally (desarrollo)

**Prerequisites:** Node.js 20+

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and configura `JWT_SECRET` y `ENCRYPTION_KEY`
3. Start dev server: `npm run dev` → http://localhost:3000

---

## Docker (producción)

### Arranque rápido — sin acelerador

```bash
docker compose up -d --build
```

> El contenedor arranca **sin GPU ni NPU**. El panel de rendimiento muestra
> "Sin acceso a GPU" en tenue — esto es correcto y esperado.

---

### Arranque con GPU NVIDIA (amd64 — Docker Desktop / Linux)

```bash
# Opción A — Script automático (recomendado)
./start.sh          # WSL / bash
.\start.ps1         # PowerShell (Windows)

# Opción B — Comando directo
docker compose -f docker-compose.yml -f docker-compose.amd64.yml up -d --build
```

**Requisitos:**
- Driver NVIDIA instalado en el host (verifica: `nvidia-smi`)
- **Docker Desktop (Windows/Mac):** el soporte GPU viene integrado. Actívalo en
  _Settings → Resources → GPU_ (si no aparece, actualiza Docker Desktop).
- **Linux nativo:** instala `nvidia-container-toolkit` y añade `"default-runtime": "nvidia"`
  al `/etc/docker/daemon.json`.

**Verificar que la GPU está accesible dentro del contenedor:**

```bash
docker compose -f docker-compose.yml -f docker-compose.amd64.yml exec web-ide nvidia-smi
```

Deberías ver tu GPU listada (ej. RTX 3060). Si falla, el toolkit o el runtime
de Docker no está configurado correctamente.

---

### Arranque con NPU Rockchip RK3588S (arm64 — Radxa 5A, Orange Pi 5)

```bash
# Antes del primer arranque: obtén el GID del grupo render
getent group render   # anota el número, reemplaza <RENDER_GID> en docker-compose.arm64.yml

./start.sh            # detecta arm64 automáticamente y usa el override
```

---

### Comandos útiles

| Acción | Comando |
|--------|---------|
| Ver logs en vivo | `docker compose … logs -f` |
| Reiniciar | `docker compose … restart web-ide` |
| Parar y eliminar | `docker compose … down` |
| Rebuild completo | `docker compose … up -d --build --force-recreate` |

---

### Panel de rendimiento (Sidebar)

El panel muestra RAM, CPU y el acelerador según la arquitectura detectada:

| Arquitectura | Acelerador mostrado |
|---|---|
| amd64 / x64 | GPU (barra morada) |
| arm64 | NPU (barra cyan, núcleos C0/C1/C2) |

> El panel **monitorea** el uso de GPU/NPU. Para **ejecutar cómputo** en GPU
> necesitas instalar frameworks CUDA (p.ej. PyTorch con CUDA) vía el gestor
> de paquetes integrado (icono 📦 en el Sidebar).
