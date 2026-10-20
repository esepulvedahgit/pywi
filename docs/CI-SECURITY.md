# CI y análisis de seguridad

PyWI ejecuta análisis de seguridad y validaciones en GitHub Actions para cada pull request hacia `dev` o `main`, y cuando hay pushes a esas ramas. También ejecuta análisis semanales y permite iniciarlos manualmente desde la pestaña **Actions**.

La programación semanal de los workflows es el lunes a las 03:17 UTC. GitHub ejecuta eventos `schedule` desde la rama predeterminada del repositorio, que actualmente es `dev`.

## Workflows

| Workflow | Qué revisa | Resultado esperado |
|---|---|---|
| `CI` | Node.js 20 con `npm ci`, `npm audit`, lint y build; Python 3.11 con `pip-audit` sobre `requirements.txt` | `npm audit` falla ante vulnerabilidades High o Critical. `pip-audit` falla cuando encuentra dependencias vulnerables. |
| `CI` — Dependency review | Cambios de dependencias en pull requests | Falla si el PR agrega una dependencia vulnerable High o Critical. |
| `CodeQL` | JavaScript/TypeScript, Python y GitHub Actions | Publica alertas en **Security → Code scanning** y muestra resultados asociados al PR. Las alertas existentes no hacen fallar por sí solas el workflow. |
| `Container security` | Imagen Docker de `linux/amd64` y `linux/arm64`; reglas integradas de Trivy para el Dockerfile y reglas Rego propias para `docker-compose.yml` | Informa vulnerabilidades High y Critical. Las que tienen una corrección disponible fallan el job de imagen; las no corregidas quedan visibles en el log. Los hallazgos High y Critical de configuración fallan el job de configuración. |

Los jobs usan permisos mínimos. Los PRs se analizan sin secretos. CodeQL necesita `security-events: write` para publicar resultados; ese permiso está limitado al job de análisis. El workflow usa el evento `pull_request` para poder publicar resultados de PRs de forks y de Dependabot. Si un commit de Dependabot llega a la rama por squash merge, el push analiza el commit pero omite la subida SARIF porque GitHub puede restringir el token de ese push; el análisis del PR ya publicó sus resultados.

Las acciones de terceros están fijadas a un SHA completo. Dependabot revisa semanalmente las acciones para proponer nuevas versiones. El binario de Trivy se fija por separado en `v0.76.0`; actualiza ese valor al mantener el escáner.

## Dependencias Python

`requirements.txt` especifica rangos de versión con `>=`, no versiones exactas ni hashes. Por eso `pip-audit` resuelve las versiones disponibles al ejecutar el workflow y audita esa resolución. Para reproducir exactamente la misma resolución entre ejecuciones se necesitaría un lockfile de Python, fuera del alcance de esta configuración.

## Revisar y corregir hallazgos

- **Dependabot:** revisa el diff y las notas de versión del PR. Los cambios pasan los workflows antes de integrarse. Las actualizaciones patch y minor se agrupan por ecosistema; las major se envían en PRs separados.
- **npm audit / pip-audit:** actualiza la dependencia afectada y su lockfile o rango, revisa compatibilidad y vuelve a ejecutar el workflow. En Python, considera que las versiones se resuelven durante cada ejecución.
- **CodeQL:** abre la alerta en **Security → Code scanning** para revisar la ruta del dato, el archivo y la recomendación. Un workflow verde significa que el análisis terminó, no que no existan alertas.
- **Trivy:** abre el job de la arquitectura o configuración en **Actions** y revisa el informe. Prioriza vulnerabilidades corregibles High/Critical y corrige los hallazgos de configuración bloqueantes.

Las reglas propias de Compose bloquean `privileged`, namespaces de host, capacidades de alto riesgo, dispositivos del host, perfiles de seguridad desactivados y montajes de rutas sensibles del host. Se mantienen en `.trivy/policies/compose-security.rego` y se evalúan como YAML genérico porque Trivy no incluye comprobaciones integradas para Docker Compose.

## Configuración necesaria en GitHub

1. En **Settings → Security**, activa **Dependabot alerts**. En repositorios públicos de GitHub.com, el dependency graph permanece habilitado; confirma que siga disponible porque Dependency Review lo necesita.
2. Activa **Dependabot security updates** si quieres PRs de seguridad además de las actualizaciones de versión semanales de `.github/dependabot.yml`.
3. En **Settings → Rules → Rulesets** (o protección de ramas), protege `dev` y `main`, exige pull requests y exige que pasen estos checks después de que aparezcan en GitHub: `Node.js checks`, `Python dependencies`, `Dependency review`, `Analyze (javascript-typescript)`, `Analyze (python)`, `Analyze (actions)`, `Image scan (amd64)`, `Image scan (arm64)` y `Docker configuration`.
4. Para impedir la integración cuando aparezcan alertas nuevas, añade al ruleset la regla **Require code scanning results**, elige CodeQL y configura el umbral **High or higher**. Exigir solo el estado exitoso del workflow no bloquea alertas por sí mismo.

Estas opciones son ajustes del repositorio y no se pueden establecer desde los archivos del proyecto.
