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

La GPU NVIDIA está **incluida por defecto** en `docker-compose.yml`. No se necesita
ningún override ni flag extra:

```bash
docker compose up -d --build
```

**Requisitos:**
- Driver NVIDIA instalado en el host (verifica: `nvidia-smi`)
- **Docker Desktop (Windows/Mac):** soporte GPU integrado. Si no funciona, asegúrate
  de tener Docker Desktop actualizado (≥ 4.x) y el driver NVIDIA instalado.
- **Linux nativo:** instala `nvidia-container-toolkit`:
  ```bash
  distribution=$(. /etc/os-release; echo $ID$VERSION_ID)
  curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
  curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
  sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
  sudo systemctl restart docker
  ```

**Verificar que la GPU está accesible dentro del contenedor:**

```bash
docker compose exec web-ide nvidia-smi
```

Deberías ver tu GPU listada (ej. RTX 3060). Si falla, el driver o Docker Desktop
no tienen habilitado el soporte GPU.

---

### Arranque con NPU Rockchip RK3588S (arm64 — Radxa 5A, Orange Pi 5)

El override arm64 **anula** la reserva GPU NVIDIA del base y monta la NPU:

```bash
# Antes del primer arranque: obtén el GID del grupo render
getent group render   # anota el número, reemplaza <RENDER_GID> en docker-compose.arm64.yml

# Opción A — Script automático (detecta arm64 solo)
./start.sh

# Opción B — Comando directo
docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d --build
```

---

### Comandos útiles

| Acción | Comando (amd64) |
|--------|---------|
| Ver logs en vivo | `docker compose logs -f` |
| Reiniciar | `docker compose restart web-ide` |
| Parar y eliminar | `docker compose down` |
| Rebuild completo | `docker compose up -d --build --force-recreate` |
| Verificar GPU | `docker compose exec web-ide nvidia-smi` |

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
