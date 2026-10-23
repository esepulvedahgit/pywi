# Configuración avanzada / Advanced Configuration

---

## Variables de entorno / Environment Variables

| Variable | Requerida / Required | Descripción / Description | Valor por defecto / Default |
|---|---|---|---|
| `ENCRYPTION_KEY` | ✅ | Clave AES-256-GCM de 64 hex chars para cifrar API keys en reposo / AES-256-GCM key (64 hex chars) for encrypting API keys at rest | — |
| `APP_URL` | ✅ | URL pública exacta (HTTPS si Sophos termina TLS) / Exact public URL (HTTPS if Sophos terminates TLS) | `http://localhost:3000` |
| `TRUSTED_PROXY_IPS` | ❌ | IPs exactas de proxies cuyos X-Forwarded-For se aceptan / Exact proxy IPs whose X-Forwarded-For is accepted | vacío / empty |
| `EXEC_TIMEOUT_MS` | ❌ | Timeout máximo de ejecución Python en milisegundos / Max Python execution timeout in milliseconds | `180000` (3 min) |
| `PORT` | ❌ | Puerto interno del servidor Node.js / Internal Node.js server port | `3000` |
| `NODE_ENV` | ❌ | Entorno de Node.js / Node.js environment | `production` |
| `UV_BIN` | ❌ | Ruta del ejecutable `uv` al ejecutar el servidor directamente / Path to the `uv` executable when running the server directly | `uv` (`uv.exe` en Windows / on Windows) |
| `AI_ALLOWED_BASE_URLS` | ❌ | URLs base personalizadas permitidas para el tutor IA, separadas por comas / Comma-separated custom AI tutor base URLs allowed by the deployment operator | vacío / empty |

El contenedor oficial ya incluye `uv`. Si ejecutas el servidor fuera de Docker, instala `uv` y déjalo disponible en `PATH`, o configura `UV_BIN` con su ruta completa. El gestor de paquetes de la interfaz utiliza `uv` para crear el entorno virtual e instalar, listar, actualizar y desinstalar paquetes.

The official container already includes `uv`. When running the server outside Docker, install `uv` and make it available on `PATH`, or set `UV_BIN` to its full path. The package manager in the UI uses `uv` to create the virtual environment and install, list, update, and uninstall packages.

### Generar ENCRYPTION_KEY / Generate ENCRYPTION_KEY

```bash
# Con Node.js / With Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY

# Sin Node.js / Without Node.js
python3 -c "import secrets; print(secrets.token_hex(32))"  # ENCRYPTION_KEY
```

### EXEC_TIMEOUT_MS — para scripts de ML / for ML scripts

El valor por defecto es 3 minutos. Para entrenamientos más largos / Default is 3 minutes. For longer training:

```env
# 5 minutos / 5 minutes
EXEC_TIMEOUT_MS=300000

# 10 minutos / 10 minutes
EXEC_TIMEOUT_MS=600000
```

---

## Configuración del Tutor IA / AI Tutor Configuration

El tutor IA se configura desde la interfaz web en **Ajustes → Asistente IA**.
The AI tutor is configured from the web interface in **Settings → AI Assistant**.

### Proveedores soportados / Supported providers

#### OpenAI
- **API Key:** obtén en / get at: https://platform.openai.com/api-keys
- **Modelo recomendado / Recommended model:** `gpt-4o-mini` (balance costo/capacidad / cost-performance balance)
- **Modelos alternativos / Alternative models:** `gpt-4o`, `gpt-3.5-turbo`

#### DeepSeek
- **API Key:** obtén en / get at: https://platform.deepseek.com
- **Modelo recomendado / Recommended model:** `deepseek-chat`
- **Alternativa para código / Code alternative:** `deepseek-coder`

#### Google Gemini
- **API Key:** obtén en / get at: https://aistudio.google.com/apikey
- **Modelo recomendado / Recommended model:** `gemini-1.5-flash` (gratuito con límites / free with limits)
- **Alternativa / Alternative:** `gemini-1.5-pro`

#### Custom (compatible con OpenAI / OpenAI-compatible)
- Introduce la URL base de tu API / Enter your API base URL (ej. / e.g. `http://ollama:11434/v1` para / for Ollama)
- El nombre del modelo según tu proveedor / Model name per your provider
- Un administrador debe agregar esa URL exacta a AI_ALLOWED_BASE_URLS en .env. Para Ollama en Docker, usa el nombre del servicio y asegúrate de que ambos contenedores compartan una red.
- An administrator must add that exact URL to AI_ALLOWED_BASE_URLS in .env. For Ollama in Docker, use the service name and make sure both containers share a network.

### Seguridad de las API keys / API keys security

Las API keys se almacenan cifradas con AES-256-GCM en el servidor. Nunca se envían al navegador.
API keys are stored encrypted with AES-256-GCM on the server. They are never sent to the browser.

---

## Gestión de usuarios / User Management

### Primer usuario = Administrador / First user = Administrator

El primer usuario en registrarse en una instalación nueva obtiene automáticamente el rol de **administrador**.
The first user to register on a new installation automatically gets the **administrator** role.

### Roles / Roles

| Rol / Role | Capacidades / Capabilities |
|---|---|
| **admin** | Gestión de usuarios, configuración SMTP, configuración del sistema / User management, SMTP config, system settings |
| **user** | Crear proyectos, ejecutar código, usar el tutor IA / Create projects, run code, use AI tutor |

### Panel de administración / Admin panel

Los administradores acceden a la gestión de usuarios en **Ajustes → Administración**.
Admins access user management in **Settings → Administration**.

### Reset de contraseña / Password reset

- **Con SMTP configurado / With SMTP configured:** Los usuarios pueden solicitar reset por email / Users can request password reset by email
- **Sin SMTP / Without SMTP:** El administrador puede resetear contraseñas manualmente desde el panel de administración / Admin can reset passwords manually from the admin panel

---

## Configuración SMTP (opcional) / SMTP Configuration (optional)

Necesario para el reset de contraseñas por email.
Required for email-based password reset.

Se configura en **Ajustes → SMTP** (solo admin / admin only).

| Campo / Field | Descripción / Description |
|---|---|
| Host | Servidor SMTP / SMTP server (ej. / e.g. `smtp.gmail.com`) |
| Puerto / Port | Normalmente / Usually `587` (TLS) o / or `465` (SSL) |
| Usuario / Username | Email remitente / Sender email |
| Contraseña / Password | Contraseña de la cuenta o app password / Account password or app password |

---

## Configuración por usuario / Per-User Settings

Cada usuario puede personalizar desde **Ajustes / Settings**:
Each user can customize from **Settings**:

| Opción / Option | Valores / Values |
|---|---|
| Indentación / Indentation | 2 espacios / spaces — 4 espacios / spaces |
| Idioma de la interfaz / Interface language | Español — English |
| Tema visual / Visual theme | Light — Vibrant Dark — Midnight Obsidian |
