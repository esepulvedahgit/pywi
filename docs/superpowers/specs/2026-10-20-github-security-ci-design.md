# Diseño: CI de seguridad para GitHub
**Fecha:** 2026-10-20  
**Proyecto:** PyWI

---

## Objetivo

Agregar CI de GitHub Actions que revise cada pull request dirigido a las ramas principales, compruebe los pushes a las ramas principales/protegidas y repita análisis semanalmente. El CI debe validar el build, detectar vulnerabilidades en el código y sus dependencias, y revisar la imagen Docker.

El repositorio es público. La rama remota predeterminada es `dev`; también existe `main`. El workflow usará ambas para pushes y pull requests, y la rama predeterminada para la ejecución semanal.

## Checks

### CI y SCA de dependencias

Workflow `.github/workflows/ci.yml`:

- Eventos: push a `dev` y `main`; pull request dirigido a `dev` o `main`; auditoría semanal de `dev`; ejecución manual.
- Node.js 20: `npm ci`, `npm audit --audit-level=high`, `npm run lint` y `npm run build`.
- Python 3.11: `pip-audit -r requirements.txt`.
- El lockfile `package-lock.json` versionado se usa para la instalación y auditoría de npm.
- `requirements.txt` contiene rangos `>=`, por lo que `pip-audit` revisará la resolución disponible al ejecutar el job. Un lockfile Python con versiones y hashes queda como mejora futura, fuera de este cambio.

La auditoría npm hará fallar el job ante vulnerabilidades high o critical. `pip-audit` hará fallar el job cuando reporte vulnerabilidades según su código de salida.

### SAST con CodeQL

Workflow `.github/workflows/codeql.yml`:

- Analiza `javascript-typescript`, `python` y `actions` con CodeQL.
- Eventos: push a `dev` y `main`; pull request dirigido a `dev` o `main`; análisis semanal de `dev`; ejecución manual.
- Publica resultados en GitHub Code Scanning para revisar alertas y cambios en PR.
- Usa permisos mínimos; solo el job que publica resultados recibe `security-events: write`.

### Imagen y configuración con Trivy

Workflow `.github/workflows/container-security.yml`:

- Construye y escanea la imagen final del Dockerfile en pull requests, pushes a `dev`/`main`, análisis semanal de `dev` y ejecución manual.
- Usa una matriz para `linux/amd64` y `linux/arm64`, en línea con las arquitecturas documentadas por PyWI.
- Ejecuta además el análisis de configuración de Trivy sobre los archivos de Docker y Compose versionados.
- Trivy genera un informe de vulnerabilidades `HIGH` y `CRITICAL`; las que tengan una corrección disponible bloquean el job, y las que no tengan parche se muestran en el informe sin bloquearlo.
- No publica la imagen ni requiere credenciales de registry.

La construcción arm64 requiere QEMU/Buildx y puede aumentar de forma notable la duración del job debido a las dependencias Python y la imagen resultante.

### Actualizaciones con Dependabot

Archivo `.github/dependabot.yml`, con revisiones semanales para:

- npm en la raíz, usando `package-lock.json`.
- pip en la raíz, usando `requirements.txt`.
- Docker en la raíz, para actualizar imágenes base declaradas en `Dockerfile`.
- GitHub Actions, para mantener las Actions usadas por los workflows.

Las alertas de Dependabot se habilitan en la configuración de seguridad del repositorio. Las actualizaciones y correcciones se proponen en pull requests; el CI no cambia ni fusiona dependencias directamente.

### Revisión de dependencias en pull requests

Agregar Dependency Review a `.github/workflows/ci.yml` o a un workflow dedicado con evento `pull_request`. Debe bloquear nuevas dependencias vulnerables de severidad `high` o `critical`. Este check complementa los escaneos completos de npm y Python y se limita a PR porque compara cambios entre revisiones.

## Flujo y protección de ramas

- Los pushes de ramas con un PR abierto actualizan el check `pull_request`; el evento `push` cubre además commits directos a `dev` o `main`.
- No se escanean todos los pushes de ramas de trabajo para evitar duplicar los mismos jobs cuando cada push ya actualiza un PR.
- Configurar en GitHub protección de `dev` y `main` para requerir PR y checks verdes antes de integrar cambios.
- CodeQL publica hallazgos como alertas; un workflow CodeQL exitoso no implica por sí mismo que no haya alertas. Si se desea bloquear hallazgos SAST, habilitar la protección de merge para code scanning en un ruleset de GitHub con severidad `high`/`critical` y hallazgos nuevos.
- Programar también Trivy y las auditorías SCA semanalmente, porque el catálogo de vulnerabilidades cambia aunque el código no reciba commits.

## Seguridad de Actions

- Declarar `permissions` mínimos en cada workflow.
- Fijar Actions de terceros a SHA completo y usar `actions/checkout` solo para leer el repositorio.
- No exponer secretos a análisis de pull requests ni usar `pull_request_target` para ejecutar contenido del PR.
- Configurar concurrencia para cancelar análisis anteriores del mismo PR cuando llegue un commit nuevo.

## Remediación

- Dependabot abre PRs para actualizaciones de seguridad y versión; esos PRs deben pasar el mismo CI antes de fusionarse.
- CodeQL y Trivy muestran hallazgos con contexto para que el cambio de código o de imagen sea revisado.
- El CI informa y bloquea según los umbrales definidos, pero no modifica archivos del repositorio automáticamente.
- En una primera implementación no se agrega una suite de tests: `package.json` no define un script `test`. Se ejecutan lint y build como validaciones existentes.

## Archivos previstos

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/container-security.yml`
- `.github/dependabot.yml`
- Documentación breve de CI y seguridad en `README.md` o en `docs/`.

## Fuera de alcance

- Fijar y hashear las dependencias Python en un lockfile.
- Construir o publicar imágenes de release.
- Auto-merge de PR de Dependabot.
- Agregar pruebas funcionales o unitarias.

## Revisión

El resultado esperado es que cada PR hacia `dev` o `main` presente checks de build, SCA, SAST y contenedor; los pushes a esas ramas y una ejecución semanal actualizan los análisis de seguridad; y Dependabot propone actualizaciones mediante PR.
