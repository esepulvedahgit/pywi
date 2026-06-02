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
| 🎓 Estudiantes / Students | Aprende Python y Data Science sin instalar nada localmente / Learn Python and Data Science without installing anything locally |
| 👨‍🏫 Docentes / Teachers | Entorno listo para clases, configurable y auto-alojable / Ready-to-use classroom environment, configurable and self-hostable |
| 🔬 Entusiastas de ML / ML enthusiasts | Experimenta con pandas, sklearn y matplotlib desde el navegador / Experiment with pandas, sklearn and matplotlib from the browser |
| 🏠 Self-hosters | Control total sobre tu entorno de desarrollo Python / Full control over your Python development environment |

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
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/.env.example

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
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/docker-compose.arm64.yml
curl -O https://raw.githubusercontent.com/tuusuario/pywi/main/.env.example

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

| Documento / Document | Descripción / Description |
|---|---|
| [Funcionalidades / Features](docs/FEATURES.md) | Guía completa de funcionalidades para el usuario final / Complete feature guide for end users |
| [Despliegue amd64](docs/DEPLOY-AMD64.md) | Despliegue detallado con GPU NVIDIA / Detailed deployment with NVIDIA GPU |
| [Despliegue arm64 / NPU](docs/DEPLOY-ARM64.md) | Guía para Radxa 5A, Orange Pi 5 y similares / Guide for Radxa 5A, Orange Pi 5 and similar boards |
| [Configuración avanzada / Advanced Config](docs/CONFIGURATION.md) | Variables de entorno, tutor IA, gestión de usuarios / Environment variables, AI tutor, user management |

---

## Licencia / License

MIT License — libre para uso personal y comercial.
MIT License — free for personal and commercial use.
