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

| Métrica | Descripción / Description |
|---|---|
| **RAM** | Memoria usada / total del contenedor / Container used/total memory |
| **CPU** | Porcentaje de uso de CPU / CPU usage percentage |
| **GPU** (amd64) | Uso de GPU NVIDIA en % + memoria usada/total / NVIDIA GPU usage % + used/total memory |
| **NPU** (arm64) | Uso de NPU RK3588S en % + carga por núcleo (C0/C1/C2) / RK3588S NPU usage % + per-core load |

El panel se actualiza cada 5 segundos. Si el acelerador no está disponible, aparece en gris.
The panel updates every 5 seconds. If the accelerator is unavailable, it appears grayed out.

---

## Temas visuales / Visual Themes

| Tema / Theme | Descripción / Description |
|---|---|
| ☀️ **Light** (Professional Polish) | Fondo claro, ideal para ambientes con luz / Light background, ideal for bright environments |
| 🌙 **Vibrant Dark** (Vibrant Slate) | Oscuro con acentos vibrantes / Dark with vibrant accents |
| 🌑 **Midnight Obsidian** (Deep Obsidian) | Negro profundo, mínimo contraste / Deep black, minimal contrast |

El tema se guarda automáticamente por usuario.
Theme is automatically saved per user.

---

## Diseño responsive / Responsive Design

PyWI está optimizado para funcionar completamente desde dispositivos móviles:
PyWI is optimized to work fully from mobile devices:

- Sidebar como drawer off-canvas en móvil / Off-canvas drawer sidebar on mobile
- Consola y tutor IA como bottom-sheets deslizables con drag táctil / Console and AI tutor as draggable bottom-sheets with touch drag
- Barra de teclas especiales para teclados táctiles / Special keys bar for touch keyboards
- Menú de opciones compacto en móvil (tema, descarga, teclado) / Compact options menu on mobile (theme, download, keyboard)
- Settings y gestor de paquetes full-screen en móvil / Settings and package manager full-screen on mobile
