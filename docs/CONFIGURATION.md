# Configuración avanzada / Advanced Configuration

---

## Variables de entorno / Environment Variables

| Variable | Requerida / Required | Descripción / Description | Valor por defecto / Default |
|---|---|---|---|
| `JWT_SECRET` | ✅ | Secreto para firmar tokens de sesión JWT / JWT session token signing secret | — |
| `ENCRYPTION_KEY` | ✅ | Clave AES-256-GCM de 64 hex chars para cifrar API keys en reposo / AES-256-GCM key (64 hex chars) for encrypting API keys at rest | — |
| `APP_URL` | ✅ | URL pública de la aplicación / Public application URL | `http://localhost:3000` |
| `EXEC_TIMEOUT_MS` | ❌ | Timeout máximo de ejecución Python en milisegundos / Max Python execution timeout in milliseconds | `120000` (2 min) |
| `PORT` | ❌ | Puerto interno del servidor Node.js / Internal Node.js server port | `3000` |
| `NODE_ENV` | ❌ | Entorno de Node.js / Node.js environment | `production` |

### Generar JWT_SECRET y ENCRYPTION_KEY / Generate JWT_SECRET and ENCRYPTION_KEY

```bash
# Con Node.js / With Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"  # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"  # ENCRYPTION_KEY

# Sin Node.js / Without Node.js
python3 -c "import secrets; print(secrets.token_hex(48))"  # JWT_SECRET
python3 -c "import secrets; print(secrets.token_hex(32))"  # ENCRYPTION_KEY
```

### EXEC_TIMEOUT_MS — para scripts de ML / for ML scripts

El valor por defecto es 2 minutos. Para entrenamientos más largos / Default is 2 minutes. For longer training:

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
- Introduce la URL base de tu API / Enter your API base URL (ej. / e.g. `http://localhost:11434/v1` para / for Ollama)
- El nombre del modelo según tu proveedor / Model name per your provider

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
