# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Python Web IDE** — A full-stack web-based Python code editor and execution environment. Users can create projects, edit Python files, install packages into a virtual environment, and execute scripts with real-time output. Frontend integrates with Google Gemini API for AI-assisted features.

**Architecture:**
- **Backend**: Node.js/Express server (server.ts) handles Python execution, virtual environment setup, project/file management, and database operations
- **Frontend**: React 19 + Vite with CodeMirror 6 for Python editing, responsive UI with Tailwind CSS v4 (configured via CSS `@import "tailwindcss"`, no `tailwind.config` file)
- **Data**: File-based storage (data/ directory) containing user projects, virtual environment configs, and execution history
- **Python Runtime**: Projects run in isolated virtual environments (.venv) with configurable package dependencies

## Development Quick Start

```bash
npm install                 # Install Node dependencies
npm run dev               # Start dev server (http://localhost:3000)
npm run build            # Build frontend + bundle server for production
npm start                # Run production server from dist/server.cjs
npm run lint             # Type-check with TypeScript (tsc --noEmit)
npm run clean            # Remove build artifacts
```

**Environment Variables** (.env / .env.local — see `.env.example`):
- `JWT_SECRET` — Required; server **exits at startup if missing** (server.ts:20)
- `ENCRYPTION_KEY` — Required; server **exits if missing** (server.ts:32). Encrypts per-user AI API keys (AES-256-GCM) stored in db.json — AI provider keys are NOT env vars
- `APP_URL` — defaults to http://localhost:3000
- `IMAGE_NAME` — Docker image tag for docker-compose (amd64/arm64)

**Docker**: `docker-compose up` runs the app on port 3000 with live-reload. Mounts source code and persists data/ directory. Production uses a **named volume `pywi_data:/app/data`** (not a bind mount) behind nginx → WAF (TLS on 443).

**Deployment gotcha (WAF blocks non-GET/POST methods):** Prod sits behind a **Sophos WAF** whose "Common Threats Filter → Application attacks" category blocks `PUT`/`DELETE`/`PATCH`, returning a **bodyless 403** before the request reaches Node. Symptom: create works, but delete/rename (PATCH)/AI-save (PUT) fail with a generic `(403)` — no `Acceso denegado` JSON means it's the WAF, not the app (all app 403s are JSON). **Resolved at the WAF** (that category adjusted); no app-side change. If it recurs, fix it in the WAF (skip the offending method rule) rather than weakening app auth.

## Architecture & Key Patterns

### Backend (server.ts)

**Python Execution Pipeline:**
1. `setupVenv()` — Creates/configures .venv with base packages (numpy, pandas, matplotlib, seaborn, scikit-learn)
2. `handleCompilationOrExecution()` — Runs user Python scripts via subprocess; returns stdout, stderr, exit code, duration
3. Virtual environment uses `getVenvPythonPath()` to locate python3 executable across Unix/Windows variants
4. `checkInstalledPackages()` — Polls venv for installed packages (used by PackageManager UI)

**Project/File Management:**
- Projects stored in `APP_DATA_DIR/user_<id>/proj_<id>/`
- Each project has a main.py (entry point) and optional data files
- Database (db.json) tracks user sessions, project metadata, file listings
- File upload via multer; execution isolated to project workspace

**Key Globals:**
- `DATA_DIR`, `DB_FILE`, `APP_DATA_DIR`, `VENV_DIR` — Storage paths initialized at startup
- `venvStatus` — Tracks virtual environment creation, base package installation, errors
- `installedPackagesList` — Cached list of packages available in venv (updated on demand)

### Frontend (React)

**Component Hierarchy:**
```
App (main state container)
├── AuthScreen (login/register)
├── Sidebar (project/file explorer, theme selector)
├── Editor (CodeMirror, Python syntax highlighting)
├── ConsoleSheet (execution output, stderr, duration display)
├── PackageManagerModal (install/manage packages in venv)
└── SpecialKeys (keyboard help panel)
```

**State Management:**
- User & authentication via localStorage (`py_ide_user`)
- Project/file list fetched on mount, maintained in useState
- Active theme stored in localStorage (`py_ide_theme`) — `light | vibrant-dark | midnight-obsidian`
- Execution results streamed via fetch; UI updates with stdout/stderr in real-time

**Types** (src/types.ts):
```typescript
User: { id, username, email }
Project: { id, userId, name, createdAt }
FileItem: { id, projectId, filename, filepath, type, size, updatedAt }
ExecutionResult: { success, stdout, stderr, exitCode, duration, timestamp }
```

### Build Pipeline

- **Frontend**: Vite (vite.config.ts) with React plugin, CSS handling, dev HMR
- **Backend**: esbuild bundles server.ts to dist/server.cjs (Node-compatible bundle)
- **Post-build**: Vite output goes to dist/ (served by Express static middleware)
- **Local dev** (`npm run dev`): Runs server.ts directly with tsx; Vite dev server handles frontend HMR

## Common Tasks

**Adding a new API endpoint:**
1. Implement handler in server.ts (e.g., `app.post('/api/new-endpoint', ...)`)
2. Add corresponding fetch call in App.tsx or a child component
3. Update types.ts if new data structures are needed

**Fixing Python execution issues:**
1. Check `venvStatus` in server.ts — may indicate venv creation failure
2. Verify getVenvPythonPath() returns valid path (check .venv/bin or .venv/Scripts on Windows)
3. Look at handleCompilationOrExecution() — exec() logs stderr if command fails
4. Test locally: `npm run dev`, create project, execute sample script, inspect browser console + network tab

**Adding a new UI component:**
1. Create file in src/components/ComponentName.tsx
2. Import & place in App.tsx or another parent
3. Styles use Tailwind v4 utility classes; base import is `@import "tailwindcss"` in src/index.css (no config file — theme/tokens live in CSS)
4. Pass data via props; use useState for local UI state only (global state in App.tsx)

**Updating theme colors:**
- Theme CSS is inline in App.tsx (search for `dark` class application and theme color definitions)
- Global CSS + viewport/mobile handling (visualViewport, scroll lock, CSS vars) lives in src/index.css
- Tailwind v4 has no `tailwind.config.ts`; customize via CSS (`@theme` / custom properties in src/index.css)

## Known Limitations & Gaps

- **Knowledge graph identified** (from graphify analysis): 55 weakly-connected nodes suggest some components (data management, file I/O, event handlers) lack explicit cross-references in code
- **Python venv setup** is mock-based in development (mockPackages list); real venv requires python3 and pip
- **Database** (db.json) is file-based; no transaction safety or concurrent edit handling
- **File upload** limited by multer default (16MB); may need tuning for large datasets
- **No test suite** — rely on manual testing via browser

## Performance Notes

- Virtual environment creation (`setupVenv()`) blocks the server for ~5-10s on first run
- Large script execution (>10s) may timeout in browser; consider implementing long-polling or WebSocket for streaming output
- Project file list is re-fetched on every page load; consider caching or pagination if project count grows

## Debugging Tips

- **Frontend**: Browser DevTools (Network tab for API calls, Console for React errors, Local Storage for session state)
- **Backend**: Add console.log around exec() calls in server.ts; use docker logs for containerized runs
- **Python issues**: Check stderr in ExecutionResult; venv errors logged to console at startup
- **Theme issues**: localStorage key is `py_ide_theme` — clear browser storage to reset
