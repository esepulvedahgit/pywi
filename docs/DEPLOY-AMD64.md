# Despliegue en amd64 — GPU NVIDIA / amd64 Deployment — NVIDIA GPU

> Guía detallada para desplegar PyWI en sistemas amd64 (x86_64) con soporte de GPU NVIDIA.
> Detailed guide for deploying PyWI on amd64 (x86_64) systems with NVIDIA GPU support.

---

## Requisitos / Requirements

- **Docker Desktop** (Windows/Mac) ≥ 4.0, o **Docker Engine** (Linux) ≥ 24.0
- **Driver NVIDIA** instalado en el host / installed on host (`nvidia-smi` debe funcionar / must work)
- **Linux nativo:** `nvidia-container-toolkit` instalado (ver sección al final / see section below)
- 4 GB RAM mínimo / minimum, 8 GB recomendado / recommended
- 10 GB espacio en disco / disk space

---

## Paso 1 — Descargar los archivos / Step 1 — Download files

```bash
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/.env.example
```

> ⚠️ Reemplaza `tuusuario/pywi` con la URL real del repositorio.
> Replace `tuusuario/pywi` with the real repository URL.

---

## Paso 2 — Configurar variables de entorno / Step 2 — Configure environment variables

```bash
cp .env.example .env
```

Edita `.env` con tus valores / Edit `.env` with your values:

```env
JWT_SECRET=<genera con el comando de abajo / generate with command below>
ENCRYPTION_KEY=<genera con el comando de abajo / generate with command below>
APP_URL=http://localhost:3000
```

Generar los secretos / Generate secrets:
```bash
# JWT_SECRET (96 hex chars)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# ENCRYPTION_KEY (64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Sin Node.js / Without Node.js:
python3 -c "import secrets; print(secrets.token_hex(48))"  # JWT_SECRET
python3 -c "import secrets; print(secrets.token_hex(32))"  # ENCRYPTION_KEY
```

---

## Paso 3 — Arrancar PyWI / Step 3 — Start PyWI

```bash
docker compose up -d
```

La GPU NVIDIA se activa automáticamente. Sin GPU instalada, el servicio arranca igualmente sin aceleración.
With no GPU installed, the service starts normally without acceleration.

Sigue el progreso / Follow progress:
```bash
docker compose logs -f
```

Cuando veas / When you see `Server running on port 3000`, abre / open: **http://localhost:3000**

---

## Paso 4 — Verificar GPU / Step 4 — Verify GPU

```bash
docker compose exec web-ide nvidia-smi
```

Salida esperada / Expected output:
```
+-----------------------------------------------------------------------------+
| NVIDIA-SMI ...   Driver Version: ...   CUDA Version: ...                    |
|-------------------------------+----------------------+----------------------+
| GPU  Name        ...          |                      |                      |
+-----------------------------------------------------------------------------+
```

Si este comando falla, ve a la sección de solución de problemas.
If this command fails, see the troubleshooting section.

---

## Primer acceso / First Access

1. Abre **http://localhost:3000** (o la IP de tu servidor / or your server IP)
2. El primer usuario en registrarse se convierte en **administrador** / The first user to register becomes **admin**
3. Registra tu cuenta / Register your account
4. Configura el tutor IA en **Ajustes → Asistente IA** (opcional / optional)

---

## Comandos de gestión / Management Commands

```bash
# Ver estado / Check status
docker compose ps

# Ver logs en vivo / Live logs
docker compose logs -f

# Reiniciar / Restart
docker compose restart web-ide

# Parar y eliminar contenedor / Stop and remove container
docker compose down

# Actualizar imagen / Update image
docker compose pull && docker compose up -d

# Backup de datos de usuario / User data backup
docker compose exec web-ide tar -czf /tmp/backup.tar.gz /app/data
docker compose cp web-ide:/tmp/backup.tar.gz ./pywi-backup.tar.gz
```

---

## Instalación nvidia-container-toolkit (Linux nativo)

Solo necesario en Linux sin Docker Desktop.
Only needed on Linux without Docker Desktop.

```bash
distribution=$(. /etc/os-release; echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/nvidia-docker/gpgkey | sudo gpg --dearmor \
  -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

---

## Solución de problemas / Troubleshooting

### El panel GPU muestra "Sin acceso a GPU" / GPU panel shows "GPU not accessible"

1. Verifica que `nvidia-smi` funciona en el host / Verify `nvidia-smi` works on the host
2. **Docker Desktop (Windows/Mac):** Settings → Resources → verifica que la GPU está habilitada / verify GPU is enabled
3. **Linux:** Verifica el runtime: `docker info | grep -i runtime` — debe mostrar `nvidia`
4. Reinstala `nvidia-container-toolkit` y reinicia Docker

### El contenedor no arranca / Container doesn't start

```bash
docker compose logs web-ide  # ver el error exacto / see exact error
```

Causas comunes / Common causes:
- `JWT_SECRET` o `ENCRYPTION_KEY` no configurados en `.env` / not configured in `.env`
- Puerto 3000 ocupado / Port 3000 in use: cambia el mapeo / change mapping: `"3001:3000"`

### La app tarda en iniciar la primera vez / App takes long to start the first time

El primer arranque instala los paquetes Python base (numpy, pandas, matplotlib, seaborn, scikit-learn). Puede tardar 1-2 minutos. Los arranques siguientes son inmediatos.
First startup installs base Python packages. May take 1-2 minutes. Subsequent starts are immediate.
