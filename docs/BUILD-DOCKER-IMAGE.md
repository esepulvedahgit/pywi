# Construir y publicar imagen Docker de PyWI

Guía para crear la imagen de producción para amd64 (PC/servidor NVIDIA) y arm64 (Radxa 5A / Orange Pi 5).

---

## Requisitos previos

- Docker Desktop instalado en Windows con **buildx** habilitado (viene incluido por defecto)
- Cuenta en Docker Hub o GitHub Container Registry (ghcr.io)
- Estar autenticado en el registry desde la terminal

---

## Paso 1 — Autenticarse en el registry

### Docker Hub
```powershell
docker login
# Ingresa tu usuario y contraseña de Docker Hub
```

### GitHub Container Registry (ghcr.io)
```powershell
# Genera un Personal Access Token en GitHub con permisos: write:packages, read:packages, delete:packages
# Settings → Developer settings → Personal access tokens → Tokens (classic)

docker login ghcr.io -u TU_USUARIO_GITHUB
# Pega el token cuando pida la contraseña
```

---

## Paso 2 — Crear el builder multi-arquitectura

Solo se hace una vez. Crea un builder que puede compilar para amd64 y arm64 desde tu PC Windows.

```powershell
docker buildx create --name pywi-builder --driver docker-container --bootstrap --use
```

Verifica que está activo:
```powershell
docker buildx ls
# Debe mostrar pywi-builder con * (activo) y plataformas linux/amd64, linux/arm64
```

---

## Paso 3 — Construir y publicar la imagen

Ejecuta desde el directorio raíz del proyecto (`cd` a donde está el `Dockerfile`).

### Opción A — Imagen multi-arquitectura en un solo comando (recomendado)

Construye amd64 y arm64 simultáneamente y las sube al registry como una sola imagen multi-arch:

**Docker Hub:**
```powershell
docker buildx build `
  --platform linux/amd64,linux/arm64 `
  --tag tuusuario/pywi:latest `
  --tag tuusuario/pywi:1.0.0 `
  --push `
  .
```

**GitHub Container Registry:**
```powershell
docker buildx build `
  --platform linux/amd64,linux/arm64 `
  --tag ghcr.io/tuusuario/pywi:latest `
  --tag ghcr.io/tuusuario/pywi:1.0.0 `
  --push `
  .
```

> ⚠️ El flag `--push` es obligatorio en builds multi-arch. No se puede cargar en el daemon local con `--load` cuando se construyen múltiples plataformas a la vez.

---

### Opción B — Construir cada arquitectura por separado

Útil si quieres probar cada imagen localmente antes de publicar.

**amd64:**
```powershell
# Construir y cargar en Docker local para probar
docker buildx build --platform linux/amd64 --tag pywi:amd64-test --load .

# Una vez verificada, publicar
docker buildx build --platform linux/amd64 --tag tuusuario/pywi:latest --push .
```

**arm64:**
```powershell
# Solo publicar (no se puede cargar arm64 en Docker Desktop Windows)
docker buildx build --platform linux/arm64 --tag tuusuario/pywi:latest-arm64 --push .
```

---

## Paso 4 — Verificar la imagen publicada

```powershell
# Ver los manifiestos de la imagen multi-arch
docker buildx imagetools inspect tuusuario/pywi:latest
```

La salida debe mostrar dos entradas:
```
linux/amd64   sha256:...
linux/arm64   sha256:...
```

---

## Paso 5 — Actualizar docker-compose.yml para usar la imagen publicada

El `docker-compose.yml` actual construye desde el código fuente. Para distribución pública, reemplaza el bloque `build:` con `image:`:

```yaml
services:
  web-ide:
    image: tuusuario/pywi:latest   # ← cambiar esto
    # build:                        # ← comentar o eliminar esto
    #   context: .
    #   dockerfile: Dockerfile
```

> El `docker-compose.yml` del repo ya está configurado para `build:` (útil para desarrollo). Para la distribución pública puedes mantener ambos o tener un `docker-compose.prod.yml` separado con `image:`.

---

## Versionado de imágenes

Convenio recomendado de tags:

```powershell
# Versión específica + latest
--tag tuusuario/pywi:1.0.0
--tag tuusuario/pywi:latest

# Con fecha si no usas semver
--tag tuusuario/pywi:2026.06
--tag tuusuario/pywi:latest
```

---

## Actualizar la imagen (nuevas versiones)

Cuando hagas cambios en el código y quieras publicar una nueva versión:

```powershell
# 1. Asegúrate de estar en la rama correcta con los cambios
git pull

# 2. Construir y publicar con nueva versión
docker buildx build `
  --platform linux/amd64,linux/arm64 `
  --tag tuusuario/pywi:1.1.0 `
  --tag tuusuario/pywi:latest `
  --push `
  .

# 3. Los usuarios solo necesitan ejecutar para actualizar:
#    docker compose pull && docker compose up -d
```

---

## Notas sobre el build arm64

El `Dockerfile` detecta automáticamente `TARGETARCH=arm64` durante el build multi-arch y:
- Descarga `librknnrt.so` v2.3.0 desde GitHub (airockchip/rknn-toolkit2)
- Instala `rknn-toolkit-lite2` v2.3.0 en el venv

Esto puede hacer el build arm64 más lento (~5-10 min extra) por las descargas.
Si la placa Rockchip actualiza el driver RKNPU, actualiza `RKNN_VER=2.3.0` en el `Dockerfile`.

---

## Solución de problemas

### El builder no encuentra la plataforma arm64

```powershell
# Verificar que QEMU está disponible (necesario para emular arm64 en x86)
docker run --privileged --rm tonistiigi/binfmt --install all

# Recrear el builder
docker buildx rm pywi-builder
docker buildx create --name pywi-builder --driver docker-container --bootstrap --use
```

### Error de autenticación al hacer push

```powershell
# Re-autenticarse
docker logout
docker login  # o docker login ghcr.io
```

### Build muy lento en arm64

Es normal. Docker emula arm64 con QEMU en tu PC amd64. El build arm64 puede tardar 15-30 min la primera vez. Los builds siguientes son más rápidos por la caché de capas.
