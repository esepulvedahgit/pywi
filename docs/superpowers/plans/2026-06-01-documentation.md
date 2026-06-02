# PyWI Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create complete bilingual (ES/EN) GitHub documentation for PyWI — a self-hosted Python Web IDE for studying Python, libraries and basic ML.

**Architecture:** Single comprehensive `README.md` as entry point with logo, tech stack, and quick deploy instructions. Supporting pages in `docs/` cover features, deployment details, and configuration. No code changes — documentation only.

**Tech Stack:** Markdown, GitHub-flavored MD (tables, badges, collapsible sections), existing logo assets at `public/images/logo_pywi.png`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `README.md` | Rewrite | Entry point: logo, description, tech stack, quick deploy, links |
| `docs/FEATURES.md` | Create | User-facing feature guide (bilingual) |
| `docs/DEPLOY-AMD64.md` | Create | Full amd64 + NVIDIA GPU deployment guide |
| `docs/DEPLOY-ARM64.md` | Rename + update | Full arm64 + NPU deployment guide |
| `docs/CONFIGURATION.md` | Create | All env vars, AI config, advanced settings |
| `.env.example` | Update | Clean up AI Studio leftovers, keep only PyWI vars |

---

## Task 1: Rewrite README.md

**Files:**
- Modify: `README.md` (full rewrite)

- [ ] **Step 1: Replace README.md with the full bilingual content**

Write the following content to `README.md`:

```markdown
<div align="center">
  <img src="public/images/logo_pywi.png" alt="PyWI Logo" width="180" />

  <h1>PyWI — Python Web IDE</h1>

  <p>
    <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-20-green?logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" />
    <img src="https://img.shields.io/badge/platform-amd64%20%7C%20arm64-lightgrey" />
  </p>

  <p>
    <strong>IDE web Python auto-alojable para estudio y experimentación</strong><br/>
    <em>Self-hosted Python Web IDE for learning and experimentation</em>
  </p>
</div>

---

## ¿Qué es PyWI? / What is PyWI?

**ES:** PyWI es un entorno de desarrollo Python accesible desde el navegador, diseñado para estudiar Python, librerías de datos y machine learning básico. Incluye editor de código, ejecución con salida en vivo, visualización de gráficos, gestor de paquetes, visor de datasets y un tutor IA integrado. Funciona completamente desde móvil y es 100% auto-alojable.

**EN:** PyWI is a browser-based Python development environment designed for studying Python, data libraries, and basic machine learning. It includes a code editor, live output streaming, chart visualization, package manager, dataset viewer, and an integrated AI tutor. Fully mobile-friendly and 100% self-hostable.

---

## ¿Para quién es? / Who is it for?

| Perfil / Profile | Descripción / Description |
|---|---|
| 🎓 Estudiantes / Students | Aprende Python y Data Science sin instalar nada localmente |
| 👨‍🏫 Docentes / Teachers | Entorno listo para clases, configurable y auto-alojable |
| 🔬 Entusiastas de ML / ML enthusiasts | Experimenta con pandas, sklearn y matplotlib desde el navegador |
| 🏠 Self-hosters | Control total sobre tu entorno de desarrollo Python |

---

## Tecnologías / Tech Stack

| Capa / Layer | Tecnologías / Technologies |
|---|---|
| **Frontend** | React 19, Vite, CodeMirror 6, Tailwind CSS, TypeScript |
| **Backend** | Node.js 20, Express, TypeScript, esbuild |
| **Runtime Python** | Python 3.11, venv, pandas, numpy, matplotlib, seaborn, scikit-learn |
| **Tutor IA / AI Tutor** | OpenAI, DeepSeek, Google Gemini, custom (OpenAI-compatible) |
| **Seguridad / Security** | JWT, bcryptjs, AES-256-GCM (API keys at rest) |
| **Infraestructura** | Docker, Docker Compose |
| **Hardware soportado** | NVIDIA GPU (amd64), Rockchip RK3588S NPU (arm64) |

---

## Despliegue rápido / Quick Deploy

### amd64 — PC / Servidor con GPU NVIDIA

```bash
# 1. Descarga los archivos de despliegue / Download deployment files
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/.env.example

# 2. Configura las variables de entorno / Configure environment variables
cp .env.example .env
# Edita .env con tus valores / Edit .env with your values

# 3. Levanta la aplicación / Start the application
docker compose up -d
```

> 💡 La GPU NVIDIA se activa automáticamente si Docker Desktop o nvidia-container-toolkit están configurados.
> The NVIDIA GPU is automatically enabled if Docker Desktop or nvidia-container-toolkit are configured.

Guía detallada → [docs/DEPLOY-AMD64.md](docs/DEPLOY-AMD64.md)

---

### arm64 — Radxa Rock 5A / Orange Pi 5 (NPU RK3588S)

```bash
# 1. Descarga los archivos / Download files
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/docker-compose.arm64.yml
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/.env.example

# 2. Configura el GID del grupo render y las variables de entorno
# Configure render group GID and environment variables
getent group render  # anota el GID / note the GID
cp .env.example .env  # edita con tus valores / edit with your values

# 3. Levanta con el override arm64 / Start with arm64 override
docker compose -f docker-compose.yml -f docker-compose.arm64.yml up -d
```

Guía detallada → [docs/DEPLOY-ARM64.md](docs/DEPLOY-ARM64.md)

---

## Variables de entorno / Environment Variables

| Variable | Requerida / Required | Descripción / Description | Por defecto / Default |
|---|---|---|---|
| `JWT_SECRET` | ✅ | Secreto para firmar tokens JWT / JWT signing secret | — |
| `ENCRYPTION_KEY` | ✅ | Clave AES-256-GCM para cifrar API keys (hex 64 chars) | — |
| `APP_URL` | ✅ | URL pública de la app / Public app URL | `http://localhost:3000` |
| `EXEC_TIMEOUT_MS` | ❌ | Timeout de ejecución Python en ms / Python execution timeout | `120000` |

Generar los secretos / Generate secrets:
```bash
# JWT_SECRET
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Configuración completa → [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

---

## Documentación / Documentation

| Documento | Descripción |
|---|---|
| [Funcionalidades / Features](docs/FEATURES.md) | Guía completa de todas las funcionalidades para el usuario final |
| [Despliegue amd64](docs/DEPLOY-AMD64.md) | Guía detallada de despliegue en amd64 con GPU NVIDIA |
| [Despliegue arm64 / NPU](docs/DEPLOY-ARM64.md) | Guía detallada para Radxa 5A, Orange Pi 5 y similares |
| [Configuración avanzada](docs/CONFIGURATION.md) | Variables de entorno, tutor IA, gestión de usuarios |

---

## Licencia / License

MIT License — libre para uso personal y comercial.
MIT License — free for personal and commercial use.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: reescribir README.md bilingüe con logo, tech stack y deploy rápido"
```

---

## Task 2: Crear docs/FEATURES.md

**Files:**
- Create: `docs/FEATURES.md`

- [ ] **Step 1: Crear el archivo con todo el contenido de funcionalidades**

```markdown
# Funcionalidades de PyWI / PyWI Features

> Guía completa de funcionalidades para el usuario final.
> Complete feature guide for end users.

---

## Editor de código / Code Editor

**ES:** PyWI incluye un editor de código Python completo basado en CodeMirror 6, con resaltado de sintaxis, numeración de líneas y guardado automático.

**EN:** PyWI includes a full Python code editor based on CodeMirror 6, with syntax highlighting, line numbers, and auto-save.

- Resaltado de sintaxis Python / Python syntax highlighting
- Guardado automático cada segundo / Auto-save every second
- Indentación configurable: 2 o 4 espacios / Configurable indentation: 2 or 4 spaces
- Temas: light (claro), vibrant-dark, midnight-obsidian

### Barra de teclas especiales (móvil) / Special Keys Bar (mobile)

En dispositivos móviles, una barra de teclas inserta los caracteres más usados en Python que son difíciles de escribir en teclados táctiles:

`Tab` `:` `=` `_` `[` `]` `{` `}` `(` `)` `"` `'` `,` `.` `/` `+` `-` `*` `#`

On mobile, a special keys bar inserts the most common Python characters that are hard to type on touch keyboards.

---

## Ejecución de código / Code Execution

**ES:** Ejecuta scripts Python directamente desde el navegador. La salida aparece en tiempo real (streaming) sin esperar a que termine el script completo.

**EN:** Run Python scripts directly from the browser. Output appears in real time (streaming) without waiting for the full script to finish.

- Salida stdout/stderr en vivo / Live stdout/stderr output
- Timeout configurable (defecto 120s) / Configurable timeout (default 120s)
- Muestra duración y código de salida / Shows duration and exit code
- Errores de Python con traceback formateado / Python errors with formatted traceback
- Botón **Run** en el header (también funciona en móvil)

---

## Gráficos matplotlib / Matplotlib Charts

**ES:** Los gráficos generados con `plt.savefig()` se muestran automáticamente en la pestaña **Plots** de la consola al terminar la ejecución.

**EN:** Charts generated with `plt.savefig()` are automatically displayed in the **Plots** tab of the console after execution.

```python
import matplotlib.pyplot as plt
import numpy as np

x = np.linspace(0, 10, 100)
plt.plot(x, np.sin(x))
plt.title('Seno / Sine')
plt.savefig('grafico.png')  # ← se muestra automáticamente / auto-displayed
```

- Soporta PNG, JPG, SVG, GIF
- Descarga individual de cada gráfico / Individual chart download
- Compatible con matplotlib, seaborn, pandas `.plot()`

---

## Visor de datasets / Dataset Viewer

**ES:** Previsualiza archivos de datos directamente en la interfaz sin necesidad de ejecutar código.

**EN:** Preview data files directly in the interface without running code.

**Formatos soportados / Supported formats:** CSV, TSV, Excel (.xlsx/.xls), Parquet, JSON

Al hacer click en un dataset del Sidebar se abre el visor con:
Clicking a dataset in the Sidebar opens the viewer with:

- **Datos / Data tab**: tabla con scroll horizontal, índice de filas, tipo de dato por columna con badge de color
- **Estadísticas / Stats tab**: resultado de `df.describe()` con count, mean, std, min, max, percentiles
- Badge con dimensiones: `N filas × M columnas` / dimensions badge: `N rows × M columns`

El botón 📋 copia la ruta del archivo para usarla en el script:
The 📋 button copies the file path for use in scripts:
```python
import pandas as pd
df = pd.read_csv('mis_datos.csv')
```

---

## Gestor de paquetes / Package Manager

**ES:** Instala, actualiza y elimina paquetes Python del entorno virtual directamente desde la interfaz.

**EN:** Install, update, and remove Python packages from the virtual environment directly from the interface.

- Busca e instala cualquier paquete de PyPI / Search and install any PyPI package
- Lista de paquetes instalados con versiones / Installed packages list with versions
- Notificación de paquetes desactualizados / Outdated packages notification
- Actualización individual o masiva / Individual or bulk update
- Paquetes base preinstalados: `numpy`, `pandas`, `matplotlib`, `seaborn`, `scikit-learn`

---

## Tutor IA / AI Tutor

**ES:** Asistente de chat integrado que ayuda a entender código, explicar errores y sugerir mejoras. Soporta múltiples proveedores de IA.

**EN:** Integrated chat assistant that helps understand code, explain errors, and suggest improvements. Supports multiple AI providers.

**Proveedores soportados / Supported providers:**
- OpenAI (GPT-4o, GPT-4o-mini, etc.)
- DeepSeek (deepseek-chat, deepseek-coder)
- Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- Custom: cualquier API compatible con OpenAI / any OpenAI-compatible API

**Acciones rápidas / Quick actions:**
- 💬 **Explicar error** — analiza el traceback actual / analyze current traceback
- 📖 **Explicar código** — explica el código del editor / explain editor code
- ✨ **Sugerir mejora** — propone optimizaciones / suggest improvements

Las API keys se almacenan cifradas (AES-256-GCM) en el servidor.
API keys are stored encrypted (AES-256-GCM) on the server.

---

## Gestión de proyectos y archivos / Project & File Management

- Crea múltiples proyectos / Create multiple projects
- Organiza scripts en carpetas / Organize scripts in folders
- Sube datasets hasta 30 MB / Upload datasets up to 30 MB
- Renombra y elimina archivos y carpetas / Rename and delete files and folders
- Descarga backup completo de todos tus proyectos en `.tar.gz` / Download full backup as `.tar.gz`

**Formatos de dataset soportados:** `.csv` `.txt` `.xlsx` `.xls` `.json` `.parquet` `.log`

---

## Panel de rendimiento / Performance Panel

**ES:** Panel en tiempo real en la barra lateral mostrando el uso de recursos del contenedor.

**EN:** Real-time panel in the sidebar showing container resource usage.

| Métrica | Descripción |
|---|---|
| **RAM** | Memoria usada / total del contenedor |
| **CPU** | Porcentaje de uso de CPU |
| **GPU** (amd64) | Uso de GPU NVIDIA en % + memoria usada/total |
| **NPU** (arm64) | Uso de NPU RK3588S en % + carga por núcleo (C0/C1/C2) |

El panel se actualiza cada 5 segundos. Si el acelerador no está disponible, aparece en gris con el mensaje "Sin acceso a GPU/NPU".

---

## Temas visuales / Visual Themes

| Tema | Descripción |
|---|---|
| ☀️ **Light** (Professional Polish) | Fondo claro, ideal para ambientes con luz |
| 🌙 **Vibrant Dark** (Vibrant Slate) | Oscuro con acentos vibrantes |
| 🌑 **Midnight Obsidian** (Deep Obsidian) | Negro profundo, mínimo contraste |

El tema se guarda automáticamente por usuario.
Theme is automatically saved per user.

---

## Diseño responsive / Responsive Design

PyWI está optimizado para funcionar completamente desde dispositivos móviles:

- Sidebar como drawer off-canvas en móvil / Off-canvas drawer sidebar on mobile
- Consola y tutor IA como bottom-sheets deslizables con drag táctil / Console and AI tutor as draggable bottom-sheets
- Barra de teclas especiales para teclados táctiles / Special keys bar for touch keyboards
- Menú de opciones compacto en móvil (tema, descarga, teclado) / Compact options menu on mobile
```

- [ ] **Step 2: Commit**

```bash
git add docs/FEATURES.md
git commit -m "docs: crear guía de funcionalidades bilingüe para usuario final"
```

---

## Task 3: Crear docs/DEPLOY-AMD64.md

**Files:**
- Create: `docs/DEPLOY-AMD64.md`

- [ ] **Step 1: Crear el archivo**

```markdown
# Despliegue en amd64 — GPU NVIDIA / amd64 Deployment — NVIDIA GPU

> Guía detallada para desplegar PyWI en sistemas amd64 (x86_64) con soporte de GPU NVIDIA.
> Detailed guide for deploying PyWI on amd64 (x86_64) systems with NVIDIA GPU support.

---

## Requisitos / Requirements

- **Docker Desktop** (Windows/Mac) ≥ 4.0, o **Docker Engine** (Linux) ≥ 24.0
- **Driver NVIDIA** instalado en el host / installed on host (`nvidia-smi` debe funcionar)
- **Linux nativo:** `nvidia-container-toolkit` instalado (ver sección al final)
- 4 GB RAM mínimo / minimum, 8 GB recomendado / recommended
- 10 GB espacio en disco / disk space

---

## Paso 1 — Descargar los archivos de despliegue / Step 1 — Download deployment files

```bash
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/<usuario>/pywi/main/.env.example
```

O clona solo los archivos necesarios / Or clone only the necessary files:
```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/<usuario>/pywi
cd pywi
git sparse-checkout set docker-compose.yml .env.example
```

---

## Paso 2 — Configurar variables de entorno / Step 2 — Configure environment variables

```bash
cp .env.example .env
```

Edita `.env` con tus valores / Edit `.env` with your values:

```env
JWT_SECRET=<genera con el comando de abajo>
ENCRYPTION_KEY=<genera con el comando de abajo>
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

La GPU NVIDIA se activa automáticamente. Sigue el progreso con:
```bash
docker compose logs -f
```

Cuando veas `Server running on port 3000`, abre http://localhost:3000

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
| GPU  Name        ...          |   00000000:01:00.0   |                      |
```

Si falla, ver sección de solución de problemas / If it fails, see troubleshooting section.

---

## Primer acceso / First Access

1. Abre http://localhost:3000 (o la IP de tu servidor)
2. El primer usuario en registrarse se convierte en **administrador**
3. Registra tu cuenta
4. Configura el tutor IA en **Ajustes → Asistente IA** (opcional)

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

# Backup de datos / Data backup
docker compose exec web-ide tar -czf /tmp/backup.tar.gz /app/data
docker compose cp web-ide:/tmp/backup.tar.gz ./pywi-backup.tar.gz
```

---

## Instalación de nvidia-container-toolkit (Linux nativo)

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

### El panel GPU aparece como "Sin acceso a GPU"

1. Verifica que `nvidia-smi` funciona en el host
2. En Docker Desktop: Settings → Resources → comprueba que GPU está habilitada
3. Verifica el runtime: `docker info | grep -i runtime`
4. Reinstala nvidia-container-toolkit (Linux)

### El contenedor no arranca

```bash
docker compose logs web-ide  # ver el error exacto
```

Causas comunes / Common causes:
- `JWT_SECRET` o `ENCRYPTION_KEY` no configurados en `.env`
- Puerto 3000 ocupado: cambia el mapeo en `docker-compose.yml` (`"3001:3000"`)

### La app es muy lenta para iniciar

El primer arranque puede tardar 1-2 minutos mientras se instalan los paquetes Python base
(numpy, pandas, matplotlib, seaborn, scikit-learn). Los arranques siguientes son inmediatos.
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOY-AMD64.md
git commit -m "docs: crear guía detallada de despliegue amd64 + GPU NVIDIA"
```

---

## Task 4: Renombrar ARM64-NPU-SETUP.md → DEPLOY-ARM64.md

**Files:**
- Rename: `docs/ARM64-NPU-SETUP.md` → `docs/DEPLOY-ARM64.md`

- [ ] **Step 1: Renombrar con git mv**

```bash
git mv docs/ARM64-NPU-SETUP.md docs/DEPLOY-ARM64.md
```

- [ ] **Step 2: Commit**

```bash
git add docs/DEPLOY-ARM64.md
git commit -m "docs: renombrar ARM64-NPU-SETUP.md → DEPLOY-ARM64.md para consistencia"
```

---

## Task 5: Crear docs/CONFIGURATION.md

**Files:**
- Create: `docs/CONFIGURATION.md`

- [ ] **Step 1: Crear el archivo**

```markdown
# Configuración avanzada / Advanced Configuration

---

## Variables de entorno / Environment Variables

| Variable | Requerida | Descripción | Valor por defecto |
|---|---|---|---|
| `JWT_SECRET` | ✅ | Secreto para firmar tokens de sesión JWT | — |
| `ENCRYPTION_KEY` | ✅ | Clave AES-256-GCM (hex 64 chars) para cifrar API keys en reposo | — |
| `APP_URL` | ✅ | URL pública de la aplicación | `http://localhost:3000` |
| `EXEC_TIMEOUT_MS` | ❌ | Timeout máximo de ejecución Python en milisegundos | `120000` (2 min) |
| `PORT` | ❌ | Puerto interno del servidor Node.js | `3000` |
| `NODE_ENV` | ❌ | Entorno de Node.js | `production` |

### Generar JWT_SECRET y ENCRYPTION_KEY

```bash
# Con Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY

# Sin Node.js
python3 -c "import secrets; print(secrets.token_hex(48))"  # JWT_SECRET
python3 -c "import secrets; print(secrets.token_hex(32))"  # ENCRYPTION_KEY
```

### EXEC_TIMEOUT_MS — para scripts de ML

El valor por defecto es 2 minutos. Para entrenamientos más largos:

```env
# 5 minutos
EXEC_TIMEOUT_MS=300000

# 10 minutos
EXEC_TIMEOUT_MS=600000
```

---

## Configuración del Tutor IA / AI Tutor Configuration

El tutor IA se configura desde la interfaz web en **Ajustes → Asistente IA**.
The AI tutor is configured from the web interface in **Settings → AI Assistant**.

### Proveedores soportados / Supported providers

#### OpenAI
- **API Key:** obtén en https://platform.openai.com/api-keys
- **Modelo recomendado:** `gpt-4o-mini` (balance costo/capacidad)
- **Modelos alternativos:** `gpt-4o`, `gpt-3.5-turbo`

#### DeepSeek
- **API Key:** obtén en https://platform.deepseek.com
- **Modelo recomendado:** `deepseek-chat`
- **Alternativa para código:** `deepseek-coder`

#### Google Gemini
- **API Key:** obtén en https://aistudio.google.com/apikey
- **Modelo recomendado:** `gemini-1.5-flash` (gratuito con límites)
- **Alternativa:** `gemini-1.5-pro`

#### Custom (compatible con OpenAI)
- Introduce la URL base de tu API (ej. `http://localhost:11434/v1` para Ollama)
- El nombre del modelo según tu proveedor

### Seguridad de las API keys
Las API keys se almacenan cifradas con AES-256-GCM en el servidor. Nunca se envían al navegador.
API keys are stored encrypted with AES-256-GCM on the server. They are never sent to the browser.

---

## Gestión de usuarios / User Management

### Primer usuario = Administrador

El primer usuario en registrarse en una instalación nueva obtiene automáticamente el rol de **administrador**.

### Roles

| Rol | Capacidades |
|---|---|
| **admin** | Gestión de usuarios, configuración SMTP, gestión del sistema |
| **user** | Crear proyectos, ejecutar código, usar el tutor IA |

### Gestión desde la interfaz

Los administradores acceden a la gestión de usuarios en **Ajustes → Administración**.

### Reset de contraseña

Si tienes SMTP configurado, los usuarios pueden solicitar reset por email.
Sin SMTP, el administrador puede resetear contraseñas manualmente desde el panel de administración.

---

## Configuración SMTP (opcional) / SMTP Configuration (optional)

Necesario para el reset de contraseñas por email. Se configura en **Ajustes → SMTP** (solo admin).

| Campo | Descripción |
|---|---|
| Host | Servidor SMTP (ej. `smtp.gmail.com`) |
| Puerto | Normalmente `587` (TLS) o `465` (SSL) |
| Usuario | Email remitente |
| Contraseña | Contraseña de la cuenta o app password |

---

## Configuración por usuario / Per-User Settings

Cada usuario puede personalizar desde **Ajustes**:

| Opción | Valores |
|---|---|
| Indentación | 2 espacios / 4 espacios |
| Idioma de la interfaz | Español / English |
| Tema visual | Light / Vibrant Dark / Midnight Obsidian |
```

- [ ] **Step 2: Commit**

```bash
git add docs/CONFIGURATION.md
git commit -m "docs: crear guía de configuración avanzada bilingüe"
```

---

## Task 6: Actualizar .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Reemplazar contenido del .env.example**

Eliminar las referencias a AI Studio/Gemini que son residuos del proyecto original
y dejar solo las variables relevantes de PyWI:

```env
# ─────────────────────────────────────────────────────────────────
# PyWI — Python Web IDE · Environment Variables
# Copia este archivo a .env y rellena los valores
# Copy this file to .env and fill in the values
# ─────────────────────────────────────────────────────────────────

# REQUIRED — JWT secret for signing session tokens
# Generate: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET="CHANGE_ME_GENERATE_A_STRONG_RANDOM_SECRET"

# REQUIRED — AES-256-GCM key for encrypting AI API keys at rest (64 hex chars = 32 bytes)
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# WARNING: changing this after users have saved AI configs will invalidate their keys.
ENCRYPTION_KEY="CHANGE_ME_64_HEX_CHARS_HERE"

# REQUIRED — Public URL of the application
APP_URL="http://localhost:3000"

# OPTIONAL — Python execution timeout in milliseconds (default: 2 minutes)
# Increase for long-running ML training. Example: 300000 = 5 minutes.
# EXEC_TIMEOUT_MS=120000
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: limpiar .env.example — eliminar residuos AI Studio"
```

---

## Task 7: Commit final de verificación

- [ ] **Step 1: Verificar que todos los links del README apuntan a archivos existentes**

```bash
# Verificar que existen todos los archivos referenciados en README.md
ls docs/FEATURES.md docs/DEPLOY-AMD64.md docs/DEPLOY-ARM64.md docs/CONFIGURATION.md
```

- [ ] **Step 2: Verificar estructura completa**

```bash
find . -name "*.md" -not -path "./.git/*" -not -path "./node_modules/*" | sort
```

Salida esperada / Expected output:
```
./README.md
./docs/CONFIGURATION.md
./docs/DEPLOY-AMD64.md
./docs/DEPLOY-ARM64.md
./docs/FEATURES.md
./docs/ARM64-NPU-SETUP.md  ← ya no debe existir (renombrado en Task 4)
./docs/superpowers/...
```

- [ ] **Step 3: Commit de cierre si hay ajustes menores**

```bash
git add -A
git commit -m "docs: ajustes finales de documentación GitHub"
```
