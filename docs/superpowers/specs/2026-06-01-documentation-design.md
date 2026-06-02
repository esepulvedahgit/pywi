# Spec: Documentación principal de PyWI para GitHub

**Fecha:** 2026-06-01
**Estado:** Aprobado por el usuario

---

## Contexto

PyWI es un IDE web Python auto-alojable orientado al estudio de Python, librerías y ML básico.
El repositorio en GitHub carece de documentación adecuada para usuarios finales. El README actual
es un placeholder de AI Studio. El objetivo es crear documentación clara y bilingüe (ES/EN)
que permita a cualquier usuario entender qué es la app, para quién es, y cómo desplegarla.

La estrategia de distribución es: **imagen Docker pre-compilada** (GitHub Container Registry / Docker Hub)
+ `docker-compose.yml` + `.env.example`. El código fuente permanece en el repo para quien quiera
contribuir, pero el flujo de usuario no requiere compilar nada.

---

## Audiencia objetivo

Usuarios finales: estudiantes de Python y Data Science, docentes que quieren un entorno listo,
personas que quieren un IDE ligero auto-alojable. Sin conocimiento profundo de Docker ni Node.js.

---

## Estructura de archivos

```
README.md                     ← entrada principal bilingüe (ES/EN)
docker-compose.yml            ← listo para usar con imagen pre-compilada
docker-compose.arm64.yml      ← override arm64 (NPU RK3588S)
.env.example                  ← plantilla de variables de entorno
docs/
  FEATURES.md                 ← funcionalidades para el usuario final (bilingüe)
  DEPLOY-AMD64.md             ← despliegue detallado amd64 + GPU NVIDIA
  DEPLOY-ARM64.md             ← despliegue arm64 + NPU RK3588S (renombrar ARM64-NPU-SETUP.md)
  CONFIGURATION.md            ← variables de entorno y ajustes avanzados
```

---

## README.md — estructura

Bilingüe. Cada sección en español primero, inglés segundo (o tabla con dos columnas donde aplique).

1. **Header**: logo PyWI, badges (Docker, Python 3.11, License, plataformas)
2. **¿Qué es? / What is it?**: 3-4 líneas describiendo PyWI — IDE web Python auto-alojable,
   estudio de Python + ML básico, tutor IA integrado, funcional desde móvil
3. **¿Para quién? / Who is it for?**: lista de 3-4 perfiles (estudiantes, docentes, self-hosters)
4. **Tecnologías / Tech Stack**: tabla — Python 3.11, Node.js 20, React 19, CodeMirror 6,
   Docker, Tailwind CSS, Express
5. **Despliegue rápido / Quick Deploy**:
   - amd64 (PC / servidor con GPU NVIDIA): 3 comandos exactos
   - arm64 (Radxa 5A / Orange Pi 5): 3 comandos + link a DEPLOY-ARM64.md
6. **Variables de entorno / Environment Variables**: tabla con las 4 vars clave
   (JWT_SECRET, ENCRYPTION_KEY, APP_URL, EXEC_TIMEOUT_MS) con descripción y valores por defecto
7. **Documentación / Documentation**: tabla con links a docs/ y descripción de cada página
8. **Licencia / License**

---

## docs/FEATURES.md — contenido

Funcionalidades documentadas para el usuario final (bilingüe):

- Editor de código Python (CodeMirror 6, temas, wrap, indentación configurable)
- Barra de teclas especiales para móvil (`:`, `[]`, `{}`, etc.)
- Ejecución de scripts con salida en vivo (streaming NDJSON)
- Gráficos matplotlib/seaborn → se muestran automáticamente como imágenes
- Visor de datasets (CSV, Excel, Parquet, JSON — tabla + estadísticas con describe)
- Gestor de paquetes pip (instalar, actualizar, eliminar, ver desactualizados)
- Tutor IA multi-proveedor (OpenAI, DeepSeek, Gemini, custom compatible)
- Gestión de proyectos y archivos (crear, renombrar, eliminar, subcarpetas)
- Panel de rendimiento en tiempo real (RAM, CPU, GPU NVIDIA / NPU RK3588S)
- Tres temas visuales (light, vibrant-dark, midnight-obsidian)
- Diseño 100% responsive — funciona desde móvil

---

## docs/DEPLOY-AMD64.md — contenido

- Requisitos (Docker Desktop Windows/Mac, o Linux con nvidia-container-toolkit)
- Variables de entorno necesarias
- Pasos completos con comandos
- Verificación: `docker compose exec web-ide nvidia-smi`
- Comandos de gestión (logs, restart, down)
- Solución de problemas frecuentes (GPU no aparece, contenedor no arranca)

---

## docs/DEPLOY-ARM64.md

Renombrar / mover el archivo existente `docs/ARM64-NPU-SETUP.md`.
Ya está completo y detallado — solo ajustar el nombre y actualizar el link desde README.

---

## docs/CONFIGURATION.md — contenido

- Tabla completa de variables de entorno con valores por defecto y descripción
- Configuración del tutor IA: cómo obtener API keys para cada proveedor
- EXEC_TIMEOUT_MS: para scripts de ML de larga duración
- Gestión de usuarios: primer usuario = admin, registro, reset de contraseña
- Opciones de indentación e idioma (settings por usuario)

---

## Notas de implementación

- Las imágenes Docker son placeholder hasta que se publiquen (ghcr.io o Docker Hub).
  Los comandos de deploy usarán `IMAGE_NAME=ghcr.io/<usuario>/pywi:latest` como ejemplo.
- El `docker-compose.yml` existente se actualiza para referenciar la imagen en lugar de
  hacer build desde el código fuente (para el contexto de la documentación pública).
- `ARM64-NPU-SETUP.md` se renombra a `DEPLOY-ARM64.md` con `git mv`.
