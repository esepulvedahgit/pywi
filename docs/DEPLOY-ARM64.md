# Guía de despliegue PyWI en arm64 — NPU Rockchip RK3588S

Placa de referencia: **Radxa Rock 5A** (kernel 6.1.84-8-rk2410, aarch64, Debian 12 bookworm,
driver RKNPU v0.9.8). Compatible también con Orange Pi 5, Rock 5B y otras placas con RK3588/RK3588S.

---

## Requisitos previos

- Debian 12 (bookworm) o Ubuntu 22.04 arm64 con kernel BSP Rockchip (sufijo `-rk*`)
- Driver RKNPU cargado en el kernel (se verifica en el paso 1)
- Docker Engine instalado (ver sección al final)
- Conexión a internet para descargar la imagen y los binarios RKNN durante el build

---

## Paso 1 — Verificar el hardware antes de empezar

Ejecuta estos comandos en la placa y confirma que la salida es la esperada:

```bash
# Arquitectura del sistema
uname -m
# Esperado: aarch64

# Kernel con sufijo BSP Rockchip
uname -r
# Esperado: algo como 6.1.84-8-rk2410

# Driver RKNPU cargado
sudo cat /sys/kernel/debug/rknpu/version
# Esperado: RKNPU driver: v0.9.8

# Carga de la NPU — ruta primaria (sin root)
ls /sys/class/devfreq/ | grep -i npu && cat /sys/class/devfreq/fdab0000.npu/load
# Esperado: 0@1000000000Hz  (carga%@frecuenciaHz)

# Carga de la NPU — ruta de reserva con detalle por núcleo (requiere root)
sudo cat /sys/kernel/debug/rknpu/load
# Esperado: NPU load:  Core0:  0%, Core1:  0%, Core2:  0%,

# Render nodes de la DRI (deben existir renderD128, 129, 130)
ls -l /dev/dri/
# Esperado: renderD128, renderD129, renderD130 con grupo "render"
```

Si la ruta primaria devfreq no existe, la NPU no está accesible y el despliegue
no podrá reportar su carga. Si solo falla la ruta debugfs, el monitoreo básico
sigue funcionando (sin detalle por núcleo).

---

## Paso 2 — Obtener el GID del grupo `render`

El contenedor necesita pertenecer al grupo `render` del host para acceder a `/dev/dri`.

```bash
getent group render
# Salida ejemplo: render:x:103:
#                         ^^^
#                     este es el GID que necesitas
```

Anota ese número (en la Radxa 5A suele ser `103`).

---

## Paso 3 — Editar el override arm64

Abre el archivo `docker-compose.arm64.yml` en el repositorio y reemplaza
`<RENDER_GID>` con el número obtenido en el paso 2:

```yaml
# Antes:
    group_add:
      - "<RENDER_GID>"

# Después (ejemplo con GID 103):
    group_add:
      - "103"
```

Puedes hacerlo con `sed` directamente:

```bash
# Desde el directorio del repositorio (python-web-ide/)
GID=$(getent group render | cut -d: -f3)
sed -i "s/<RENDER_GID>/${GID}/" docker-compose.arm64.yml
echo "Render GID configurado: $GID"
```

---

## Paso 4 — Configurar las variables de entorno

Copia el archivo de ejemplo y rellena los valores:

```bash
cp .env.example .env
```

Edita `.env` y asegúrate de tener al menos:

```env
JWT_SECRET=<genera con: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
ENCRYPTION_KEY=<genera con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
APP_URL=http://<IP-de-tu-placa>:3000
```

Para generar los secretos si no tienes Node instalado en la placa:

```bash
# JWT_SECRET (96 chars hex)
python3 -c "import secrets; print(secrets.token_hex(48))"

# ENCRYPTION_KEY (64 chars hex = 32 bytes)
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Paso 5 — Verificar la versión de Docker Compose

El override arm64 usa `devices: !reset []` (Compose Spec 2.24+) para anular la
reserva GPU NVIDIA del archivo base. Verifica que tu versión lo soporta:

```bash
docker compose version
# Necesitas: Docker Compose version v2.24.0 o superior
```

**Si tu versión es anterior a 2.24**, aplica este workaround antes del paso 6:

```bash
# Comenta temporalmente el bloque de reserva NVIDIA en docker-compose.yml
sed -i 's/        reservations:/        # reservations:/' docker-compose.yml
sed -i 's/          devices:/          # devices:/' docker-compose.yml
sed -i 's/            - driver: nvidia/            # - driver: nvidia/' docker-compose.yml
sed -i 's/              count: all/              # count: all/' docker-compose.yml
sed -i 's/              capabilities: \[gpu\]/              # capabilities: [gpu]/' docker-compose.yml
```

---

## Paso 6 — Build y arranque

```bash
# Desde el directorio del repositorio
docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d --build
```

El build tardará varios minutos la primera vez. Durante el build el Dockerfile:
1. Construye el frontend (Vite)
2. Instala dependencias Python en el venv
3. **Descarga `librknnrt.so` v2.3.0** desde GitHub (airockchip/rknn-toolkit2)
4. **Instala `rknn-toolkit-lite2` v2.3.0** en el venv del contenedor

Puedes seguir el progreso:

```bash
docker compose -f docker-compose.yml -f docker-compose.arm64.yml logs -f
```

---

## Paso 7 — Verificar que todo quedó bien

### 7a. Que el contenedor arrancó

```bash
docker compose -f docker-compose.yml -f docker-compose.arm64.yml ps
# Estado esperado: web-ide  running  0.0.0.0:3000->3000/tcp
```

### 7b. Que la librería RKNN está instalada

```bash
docker compose -f docker-compose.yml -f docker-compose.arm64.yml exec web-ide \
  python3 -c "from rknnlite.api import RKNNLite; print('rknn-toolkit-lite2 OK')"
# Esperado: rknn-toolkit-lite2 OK
```

### 7c. Que el contenedor puede leer la carga de la NPU

El backend usa dos rutas en orden de preferencia:

**Ruta primaria — devfreq sysfs (sin root, siempre disponible):**
```bash
docker compose -f docker-compose.yml -f docker-compose.arm64.yml exec web-ide \
  cat /sys/class/devfreq/fdab0000.npu/load
# Esperado: 0@1000000000Hz   (carga%@frecuenciaHz en reposo)
```

**Ruta de reserva — debugfs (requiere el volumen descomentado en el override):**
```bash
docker compose -f docker-compose.yml -f docker-compose.arm64.yml exec web-ide \
  cat /sys/kernel/debug/rknpu/load
# Esperado: NPU load:  Core0:  0%, Core1:  0%, Core2:  0%,
```

Con la configuración por defecto (devfreq, sin volumen debugfs) solo la primera
ruta es accesible. Eso es suficiente para la monitorización básica.

### 7d. Panel de la interfaz web

Abre `http://<IP-de-tu-placa>:3000`, inicia sesión y en el Sidebar (panel de
rendimiento) deberías ver:

```
NPU   0.0%
[══════════════════] (barra cyan vacía en reposo)
```

Cuando la NPU esté procesando, el porcentaje y la barra subirán.

> **Nota:** El detalle por núcleo (`C0 0% · C1 0% · C2 0%`) solo aparece cuando
> el contenedor usa la ruta debugfs (volumen comentado en `docker-compose.arm64.yml`).
> Con la ruta devfreq (por defecto) se muestra únicamente el porcentaje agregado.

---

## Usar la NPU en código Python dentro de PyWI

### Flujo de trabajo

La NPU RK3588S **no ejecuta modelos directamente desde PyTorch/TensorFlow**.
Requiere modelos pre-convertidos al formato `.rknn`:

```
PC con Linux x86_64                    Radxa 5A (PyWI)
─────────────────────────────          ──────────────────────────
1. Instalar rknn-toolkit2 (completo)   3. Subir modelo.rknn como dataset
   pip install rknn_toolkit2              (arrastrar al panel de datasets)

2. Convertir el modelo:                4. Escribir script Python:
   from rknn.api import RKNN              from rknnlite.api import RKNNLite
   rknn = RKNN()                          rknn = RKNNLite()
   rknn.load_pytorch(...)                 rknn.load_rknn('./modelo.rknn')
   rknn.build(...)                        rknn.init_runtime(
   rknn.export_rknn('modelo.rknn')            core_mask=RKNNLite.NPU_CORE_AUTO
                                          )
                                          outputs = rknn.inference(inputs=[x])
                                          rknn.release()
```

### Ejemplo completo de inferencia en PyWI

```python
import numpy as np
from rknnlite.api import RKNNLite

# Inicializar
rknn = RKNNLite(verbose=False)
ret = rknn.load_rknn('./mi_modelo.rknn')   # archivo subido como dataset
if ret != 0:
    print('Error cargando modelo:', ret)
    exit()

# Usar los 3 núcleos NPU automáticamente
ret = rknn.init_runtime(core_mask=RKNNLite.NPU_CORE_AUTO)
if ret != 0:
    print('Error inicializando runtime:', ret)
    exit()

# Preparar entrada (ajusta según tu modelo)
input_data = np.random.randn(1, 3, 224, 224).astype(np.float32)

# Inferencia
outputs = rknn.inference(inputs=[input_data])
print('Salida del modelo:', outputs[0].shape)

# Liberar recursos
rknn.release()
```

### Opciones de `core_mask`

| Constante | Descripción |
|---|---|
| `RKNNLite.NPU_CORE_AUTO` | Asigna núcleo automáticamente (recomendado) |
| `RKNNLite.NPU_CORE_0` | Fuerza Core0 |
| `RKNNLite.NPU_CORE_1` | Fuerza Core1 |
| `RKNNLite.NPU_CORE_2` | Fuerza Core2 |
| `RKNNLite.NPU_CORE_0_1_2` | Los 3 núcleos en paralelo (modelos grandes) |

---

## Herramientas para convertir modelos a .rknn (en tu PC)

Instala `rknn-toolkit2` **en una PC x86_64 con Linux** (no en la placa):

```bash
pip install rknn-toolkit2==2.3.0
```

Repositorio oficial con ejemplos y modelos:
`https://github.com/airockchip/rknn-toolkit2`

> La versión **2.3.0** es la compatible con el driver RKNPU v0.9.8 de tu Radxa 5A.
> No mezcles versiones o el modelo no cargará.

---

## Comandos de gestión

```bash
# Arrancar
docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d

# Arrancar con rebuild (tras actualizar el código)
docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d --build

# O usar el script automático
./start.sh

# Ver logs en vivo
docker compose -f docker-compose.yml -f docker-compose.arm64.yml logs -f

# Reiniciar el contenedor
docker compose -f docker-compose.yml -f docker-compose.arm64.yml restart web-ide

# Parar y eliminar
docker compose -f docker-compose.yml -f docker-compose.arm64.yml down
```

---

## Instalar Docker en la Radxa 5A (si no está instalado)

```bash
# Método oficial (apt)
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Añadir tu usuario al grupo docker (para no necesitar sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verificar
docker compose version   # debe ser >= 2.24.0
```

---

## Solución de problemas frecuentes

### `devices: !reset []` da error de sintaxis

Tu versión de Docker Compose es anterior a 2.24. Actualiza:
```bash
sudo apt-get update && sudo apt-get install -y docker-compose-plugin
```
O aplica el workaround del paso 5 de esta guía.

### El contenedor arranca pero `rknnlite` no se importa

El build no ejecutó el bloque arm64 del Dockerfile. Verifica:
```bash
docker compose -f docker-compose.yml -f docker-compose.arm64.yml build --no-cache
```

### La carga NPU siempre muestra 0%

El backend lee la carga en dos pasos; verifica cada uno:

**Paso 1 — ruta primaria (devfreq, sin root):**
```bash
# Desde el host:
ls /sys/class/devfreq/ | grep -i npu
# Esperado: fdab0000.npu  (o similar)

cat /sys/class/devfreq/fdab0000.npu/load
# Esperado: 0@1000000000Hz
```
Si este archivo existe y es legible, el backend ya puede leer la carga. No se
necesita nada más. Si el problema persiste, reinicia el contenedor.

**Paso 2 — ruta de reserva (debugfs) — solo si la ruta primaria falla:**
1. Descomenta el volumen debugfs en `docker-compose.arm64.yml`.
2. Verifica que `debugfs` está montado en el host: `mount | grep debugfs`
3. Si no lo está: `sudo mount -t debugfs debugfs /sys/kernel/debug`
   Para que persista tras reboot: añadir `debugfs /sys/kernel/debug debugfs defaults 0 0` a `/etc/fstab`
4. Vuelve a levantar el contenedor:
   `docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d`

### Error de acceso a `/dev/dri`

El GID de `group_add` no corresponde al grupo `render` del host. Repite el paso 2 y 3.
