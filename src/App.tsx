import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Menu,
  ChevronRight,
  Terminal,
  Folder,
  FileCode,
  Sparkles,
  Download,
  RefreshCw,
  Clock,
  Code2,
  Palette,
  MoreVertical,
  Keyboard,
  Settings,
  X,
  Bell,
  Wand2,
  Square,
  PanelLeftClose,
  PanelLeftOpen,
  Undo2,
  Redo2
} from 'lucide-react';
import { EditorView, keymap } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Choose a CodeMirror language extension based on file extension. */
const langFor = (filename: string) => filename.endsWith('.md') ? markdown() : python();

import { User, Project, FileItem, UserSettings, EnvRestoreState, PackageUpdateState, AIConfig, IdeContext, DatasetContext, DiffProposal, OutputFile } from './types';
import { LanguageProvider, useLang, useT } from './i18n';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import SpecialKeys from './components/SpecialKeys';
import XtermConsole, { ExitResult } from './components/XtermConsole';
import PackageManagerModal from './components/PackageManagerModal';
import SettingsModal from './components/SettingsModal';
import EnvRestoreOverlay from './components/EnvRestoreOverlay';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import AIAssistant from './components/AIAssistant';
import DataPreviewModal from './components/DataPreviewModal';
import OutputPreviewModal from './components/OutputPreviewModal';
import LockScreen from './components/LockScreen';

// Helper: construye headers con el JWT del usuario actual
const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const token = localStorage.getItem('py_ide_token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
};

// Tiempo de inactividad antes de bloquear la sesión (10 minutos)
const INACTIVITY_LIMIT_MS = 10 * 60 * 1000;

function AppContent() {
  const tl = useT();
  // Authentication & session state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('py_ide_user');
    return saved ? JSON.parse(saved) : null;
  });
  // Persistimos el bloqueo para que sobreviva a un refresco del navegador
  const [isLocked, setIsLocked] = useState(() => localStorage.getItem('py_ide_locked') === '1');
  const [setupComplete, setSetupComplete] = useState<boolean>(true);

  // Publica el viewport VISIBLE como variables CSS para que el root y los paneles fijos
  // abracen exactamente el área visible sin dejar huecos negros debajo del teclado.
  //
  //   --app-height     = visualViewport.height  (alto visible; encoge al abrir el teclado)
  //   --vv-top         = visualViewport.offsetTop (iOS desplaza el vv; Android siempre 0)
  //   --keyboard-inset = alto que el teclado consume del layout viewport (0 al cerrarse)
  //
  // El root usa position:fixed + top:--vv-top + height:--app-height → siempre pegado al
  // área visible. Los paneles fijos (XtermConsole, AIAssistant) usan bottom:--keyboard-inset
  // para no quedar tapados por el teclado. Fallback a innerHeight si no hay visualViewport.
  useEffect(() => {
    const vv = window.visualViewport;
    const setAppHeight = () => {
      const h = vv?.height ?? window.innerHeight;
      const top = vv?.offsetTop ?? 0;
      const root = document.documentElement.style;
      root.setProperty('--app-height', `${h}px`);
      root.setProperty('--vv-top', `${top}px`);
      root.setProperty('--keyboard-inset', `${Math.max(0, window.innerHeight - h - top)}px`);
    };
    setAppHeight();
    vv?.addEventListener('resize', setAppHeight);
    vv?.addEventListener('scroll', setAppHeight);
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);
    return () => {
      vv?.removeEventListener('resize', setAppHeight);
      vv?.removeEventListener('scroll', setAppHeight);
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  useEffect(() => {
    fetch('/api/auth/admin-exists')
      .then(r => r.json())
      .then(d => setSetupComplete(d.setupComplete))
      .catch(() => setSetupComplete(true));
  }, []);

  // User settings & language state
  const [userSettings, setUserSettings] = useState<UserSettings>({ indentation: 4, language: 'es' });
  const { setLang } = useLang();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Package Manager visibility state
  const [showPackageManager, setShowPackageManager] = useState(false);

  // AI Assistant state
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [isAIExpanded, setIsAIExpanded] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'openai', model: '', baseUrl: '', enabled: false, hasKey: false, validated: false,
  });
  const [showAiNotice, setShowAiNotice] = useState(false);
  const [importBlockedModule, setImportBlockedModule] = useState<string | null>(null);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'editor' | 'language' | 'smtp' | 'security' | 'users' | 'ai'>('editor');
  // aiCommand: dispatch a pre-filled message to the tutor from outside the panel
  const [aiCommand, setAiCommand] = useState<{ text: string; nonce: number } | null>(null);
  // Inline AI prompt overlay (Ctrl+I)
  const [inlinePromptOpen, setInlinePromptOpen] = useState(false);
  const [inlinePromptValue, setInlinePromptValue] = useState('');
  const inlineInputRef = useRef<HTMLInputElement>(null);

  // Theme & customization visual state
  const [activeTheme, setActiveTheme] = useState<'light' | 'vibrant-dark' | 'midnight-obsidian'>(() => {
    const saved = localStorage.getItem('py_ide_theme');
    return (saved as any) || 'light';
  });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [showSpecialKeys, setShowSpecialKeys] = useState<boolean>(() => {
    const saved = localStorage.getItem('py_ide_show_special_keys');
    return saved === 'true'; // Default to hidden (false)
  });

  useEffect(() => {
    localStorage.setItem('py_ide_theme', activeTheme);
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem('py_ide_show_special_keys', String(showSpecialKeys));
  }, [showSpecialKeys]);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  // File state
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [currentFile, setCurrentFile] = useState<FileItem | null>(null);
  const [code, setCode] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [mdView, setMdView] = useState<'edit' | 'preview'>('edit');

  // Execution console state
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // WS+PTY execution state
  const [lastExitResult, setLastExitResult] = useState<ExitResult | null>(null);
  const [runNonce, setRunNonce] = useState(0);   // increment to start a run
  const [stopNonce, setStopNonce] = useState(0); // increment to stop a run

  // Dataset preview state
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Cache of dataset schemas previewed this session, keyed by filename — fed to the AI tutor
  const datasetPreviewsRef = useRef<Map<string, DatasetContext>>(new Map());

  // Script output state — artefactos generados en output/, listados vía filesystem
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [previewOutputFile, setPreviewOutputFile] = useState<OutputFile | null>(null);

  // Environment restoration state
  const [envRestore, setEnvRestore] = useState<EnvRestoreState | null>(null);

  // Package update notification state
  const [packageUpdates, setPackageUpdates] = useState<PackageUpdateState>({
    outdated: [], lastChecked: null, dismissed: false
  });

  // Layout UI management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('py_ide_sidebar_collapsed') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('py_ide_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);
  const editorRef = useRef<EditorView | null>(null);
  // Tracks lines currently selected in the editor (for AI tutor badge)
  const [aiSelection, setAiSelection] = useState<{ fromLine: number; toLine: number } | null>(null);
  // Tracks whether the CodeMirror history stack has undo/redo steps available
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for environment restoration status
  useEffect(() => {
    if (!envRestore?.inProgress || !user) return;

    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('py_ide_token');
        const res = await fetch('/api/pip/restore-status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const status = await res.json();
        setEnvRestore(status);
      } catch (err) {
        console.error('Error polling restore status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [envRestore?.inProgress, user]);

  // Load user settings and AI config — al montar/login y también al desbloquear
  // (un token nuevo puede traer datos que el fetch inicial no pudo obtener por 401).
  const loadSettingsAndAiConfig = () => {
    if (!user) return;
    const token = localStorage.getItem('py_ide_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {} as Record<string, string>;
    fetch(`/api/users/${user.id}/settings`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(settings => {
        if (!settings) return; // 401 estando bloqueado, etc. — no pisar el estado con un error
        setUserSettings(settings);
        if (settings.language === 'es' || settings.language === 'en') setLang(settings.language);
      })
      .catch(err => console.error('Error loading settings:', err));
    fetch('/api/ai/config', { headers })
      .then(res => res.ok ? res.json() : null)
      .then((cfg: AIConfig | null) => { if (cfg) setAiConfig(cfg); }) // 401 estando bloqueado, etc. — no pisar el estado con un error
      .catch(() => {});
  };

  useEffect(() => {
    loadSettingsAndAiConfig();
  }, [user?.id]);

  // Fetch package update state from server
  const fetchPackageUpdates = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/pip/updates', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPackageUpdates(prev => ({
            ...prev,
            outdated: data.outdated,
            lastChecked: data.lastChecked
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching package updates:', err);
    }
  };

  // Fetch package updates 3s after login (background check has time to start)
  useEffect(() => {
    if (user) {
      const t = setTimeout(fetchPackageUpdates, 3000);
      return () => clearTimeout(t);
    }
  }, [user?.id]);

  // Synchronization: Persist user session
  useEffect(() => {
    if (user) {
      localStorage.setItem('py_ide_user', JSON.stringify(user));
      fetchProjects();
    } else {
      localStorage.removeItem('py_ide_user');
      setProjects([]);
      setCurrentProject(null);
      setFiles([]);
      setFolders([]);
      setCurrentFile(null);
      setCode('');
    }
  }, [user]);

  // Load user files list when project is loaded
  useEffect(() => {
    if (currentProject) {
      fetchFiles(currentProject.id);
      fetchOutputFiles(currentProject.id);
      fetchSecretKeys(currentProject.id);
    } else {
      setOutputFiles([]);
      setSecretKeys([]);
    }
  }, [currentProject]);

  // Refrescar la carpeta de salida cuando termina una ejecución (nuevos artefactos)
  useEffect(() => {
    if (lastExitResult && currentProject) {
      fetchOutputFiles(currentProject.id);
    }
  }, [lastExitResult]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch file content when active file changes; reset markdown view to edit mode
  useEffect(() => {
    if (currentProject && currentFile && user) {
      fetchFileContent(currentProject.id, currentFile.id);
    }
    setMdView('edit');
  }, [currentFile]);

  // Bloqueo de sesión por inactividad (10 min)
  useEffect(() => {
    if (!user || isLocked) return;

    const lockSession = () => {
      // Invalida el token en el servidor: el token retenido no podrá reutilizarse
      // mientras esté bloqueado (aunque falle la red, el candado UI se activa igual).
      fetch('/api/auth/lock', { method: 'POST', headers: authHeaders() }).catch(() => {});
      localStorage.setItem('py_ide_locked', '1');
      setIsLocked(true);
    };

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(lockSession, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // arrancar el contador desde ya

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, isLocked]);

  // API Call: Fetch projects for active log
  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/projects`, { headers: authHeaders() });
      // Estando bloqueado el token está invalidado; un 401 es esperado, no cerramos sesión
      if (res.status === 401 || res.status === 403) { if (isLocked) return; handleLogout(); return; }
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0) {
          // Select previous or first project
          const savedProjId = localStorage.getItem('py_ide_last_proj');
          const found = data.find(p => p.id === savedProjId);
          setCurrentProject(found || data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  // API Call: Fetch files for active project
  const fetchFiles = async (projectId: string) => {
    // Reset the AI dataset cache — schemas are project-scoped and must not leak across projects
    datasetPreviewsRef.current.clear();
    try {
      const res = await fetch(`/api/projects/${projectId}/files`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFiles(data);
        // Derive folders from existing file records (reset first to avoid stale folders from prior project)
        const fileFolders = [...new Set(data.filter((f: any) => f.folder).map((f: any) => f.folder as string))];
        setFolders(fileFolders);
        if (data.length > 0) {
          // Prefer main.py script
          const mainFile = data.find(f => f.filename === 'main.py');
          setCurrentFile(mainFile || data[0]);
        } else {
          setCurrentFile(null);
          setCode('');
        }
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  // API Call: lista los artefactos generados en output/ del proyecto
  const fetchOutputFiles = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/output-files`, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.files)) setOutputFiles(data.files);
    } catch (err) {
      console.error('Error fetching output files:', err);
    }
  };

  // Vacía la carpeta output/ (botón "Limpiar salida")
  const handleClearOutput = async () => {
    if (!currentProject) return;
    if (!window.confirm(tl('clearOutputConfirm'))) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/output-files/clear`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.ok) {
        setOutputFiles([]);
        setPreviewOutputFile(null);
      }
    } catch (err) {
      console.error('Error clearing output:', err);
    }
  };

  // API Call: Fetch content of a file
  const fetchFileContent = async (projectId: string, fileId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/files/${fileId}/content?userId=${user.id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data && data.content !== undefined) {
        setCode(data.content);
      }
    } catch (err) {
      console.error('Error loading file contents:', err);
    }
  };

  // API Call: Create new project
  const handleCreateProject = async (name: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/projects`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (res.ok) {
        setProjects(prev => [...prev, data]);
        setCurrentProject(data);
        localStorage.setItem('py_ide_last_proj', data.id);
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  // API Call: Delete action
  const handleDeleteProject = async (projectId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        const remaining = projects.filter(p => p.id !== projectId);
        setProjects(remaining);
        if (remaining.length > 0) {
          setCurrentProject(remaining[0]);
          localStorage.setItem('py_ide_last_proj', remaining[0].id);
        } else {
          setCurrentProject(null);
          setFiles([]);
          setCurrentFile(null);
          setCode('');
        }
      } else {
        const data = await res.json().catch(() => ({})) as any;
        alert(data.error || 'Error al eliminar proyecto');
      }
    } catch (err: any) {
      alert('Error al eliminar proyecto: ' + err.message);
    }
  };

  // API Call: Save changes physically
  const handleSaveFile = async (customContent?: string) => {
    if (!user || !currentProject || !currentFile) return;
    const contentToSave = customContent !== undefined ? customContent : code;
    setIsSaving(true);
    try {
      await fetch(`/api/projects/${currentProject.id}/files/${currentFile.id}/content`, {
        method: 'PUT',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, content: contentToSave })
      });
    } catch (err) {
      console.error('Error saving file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // API Call: Create file script or data item
  const handleCreateFile = async (filename: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userId: user.id,
          filename,
          content: filename.endsWith('.py')
            ? `# Script: ${filename}\nprint("Hola ${filename}!")`
            : filename.endsWith('.md')
              ? `# ${filename.replace(/\.md$/, '')}\n`
              : '',
          type: filename.endsWith('.py') ? 'script' : filename.endsWith('.md') ? 'doc' : 'dataset'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(prev => [...prev, data]);
        if (data.type === 'script' || data.type === 'doc') {
          setCurrentFile(data);
        }
      } else {
        alert(data.error || tl('errorCreateFile'));
      }
    } catch (err) {
      console.error('Error creating file:', err);
    }
  };

  // API Call: Delete File
  const handleDeleteFile = async (fileId: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files/${fileId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Error al eliminar archivo (${res.status})`);
        return;
      }
      const deleted = files.find(f => f.id === fileId);
      if (deleted) datasetPreviewsRef.current.delete(deleted.filename);
      const remaining = files.filter(f => f.id !== fileId);
      setFiles(remaining);
      if (currentFile?.id === fileId) {
        const editables = remaining.filter(f => f.type === 'script' || f.type === 'doc');
        setCurrentFile(editables.length > 0 ? editables[0] : null);
      }
    } catch (err: any) {
      alert(`Error de conexión al eliminar: ${err.message}`);
    }
  };

  // Upload notice: shown after dataset upload to remind user of correct path
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  // Project secrets: only key names ever live in state, values never leave the server
  const [secretKeys, setSecretKeys] = useState<string[]>([]);
  const [secretError, setSecretError] = useState<string | null>(null);

  const fetchSecretKeys = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/secrets`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSecretKeys(data.keys || []);
      }
    } catch (err) {
      console.error('Error fetching secret keys:', err);
    }
  };

  const handleSaveSecret = async (key: string, value: string) => {
    if (!currentProject) return;
    setSecretError(null);
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/secrets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ key, value })
      });
      const data = await res.json();
      if (res.ok) {
        fetchSecretKeys(currentProject.id);
      } else {
        setSecretError(data.error || tl('secretErrorEmpty'));
      }
    } catch (err) {
      console.error('Error saving secret:', err);
    }
  };

  const handleDeleteSecret = async (key: string) => {
    if (!currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/secrets/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (res.ok) {
        fetchSecretKeys(currentProject.id);
      }
    } catch (err) {
      console.error('Error deleting secret:', err);
    }
  };

  // API Call: Upload files via dataset multer engine
  const handleUploadDataset = async (file: File) => {
    if (!user || !currentProject) return;
    const formData = new FormData();
    formData.append('dataset', file);

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/upload/${user.id}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        fetchFiles(currentProject.id);
        setUploadNotice(data.filename);
      } else {
        alert(data.error || tl('errorUploadDataset'));
      }
    } catch (err) {
      console.error('Error uploading dataset:', err);
    }
  };

  // Upload a .py script file (optionally into a folder)
  const handleUploadScript = async (file: File, folder?: string) => {
    if (!user || !currentProject) return;
    const formData = new FormData();
    formData.append('dataset', file);
    const query = folder ? `?folder=${encodeURIComponent(folder)}` : '';

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/upload/${user.id}${query}`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        fetchFiles(currentProject.id);
        if (folder) setFolders(prev => prev.includes(folder) ? prev : [...prev, folder]);
        setCurrentFile(data);
      } else {
        alert(data.error || tl('errorUploadScript'));
      }
    } catch (err) {
      console.error('Error uploading script:', err);
    }
  };

  // Create a folder inside the current project
  const handleCreateFolder = async (folderName: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/folders`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, folderName })
      });
      if (res.ok) {
        // Add to folders state immediately so it appears in the sidebar
        setFolders(prev => prev.includes(folderName) ? prev : [...prev, folderName]);
      } else {
        const data = await res.json();
        alert(data.error || tl('errorCreateFolder'));
      }
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  // Create a file inside a specific folder
  const handleCreateFileInFolder = async (filename: string, folder: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          userId: user.id,
          filename,
          content: filename.endsWith('.py')
            ? `# Script: ${filename}\nprint("Hola ${filename}!")`
            : filename.endsWith('.md')
              ? `# ${filename.replace(/\.md$/, '')}\n`
              : '',
          type: filename.endsWith('.py') ? 'script' : filename.endsWith('.md') ? 'doc' : 'dataset',
          folder
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(prev => [...prev, data]);
        setCurrentFile(data);
      } else {
        alert(data.error || tl('errorCreateFile'));
      }
    } catch (err) {
      console.error('Error creating file in folder:', err);
    }
  };

  // Rename a script file
  const handleRenameFile = async (fileId: string, newFilename: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files/${fileId}/rename`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, newFilename })
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, filename: data.filename, filepath: data.filepath } : f));
        if (currentFile?.id === fileId) setCurrentFile(prev => prev ? { ...prev, filename: data.filename } : prev);
      } else {
        alert(data.error || tl('errorRenameFile'));
      }
    } catch (err) {
      console.error('Error renaming file:', err);
    }
  };

  // Move a file to another folder (or to project root when targetFolder is null)
  const handleMoveFile = async (fileId: string, targetFolder: string | null) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files/${fileId}/move`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, folder: targetFolder || '' })
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, folder: data.folder, filepath: data.filepath } : f));
      } else {
        alert(data.error || tl('errorMoveFile'));
      }
    } catch (err) {
      console.error('Error moving file:', err);
    }
  };

  // Rename a folder (updates all child file records)
  const handleRenameFolder = async (oldPath: string, newPath: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(`/api/projects/${currentProject.id}/folders/rename`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, oldPath, newPath })
      });
      if (res.ok) {
        setFolders(prev => prev.map(f => {
          if (f === oldPath) return newPath;
          if (f.startsWith(oldPath + '/')) return newPath + f.slice(oldPath.length);
          return f;
        }));
        setFiles(prev => prev.map(f => {
          if (f.folder === oldPath) return { ...f, folder: newPath };
          if (f.folder?.startsWith(oldPath + '/')) return { ...f, folder: newPath + f.folder!.slice(oldPath.length) };
          return f;
        }));
      } else {
        const data = await res.json();
        alert(data.error || tl('errorRenameFolder'));
      }
    } catch (err) {
      console.error('Error renaming folder:', err);
    }
  };

  // Delete a folder and all its contents (cascade)
  const handleDeleteFolder = async (folderPath: string) => {
    if (!user || !currentProject) return;
    try {
      const res = await fetch(
        `/api/projects/${currentProject.id}/folders?path=${encodeURIComponent(folderPath)}`,
        { method: 'DELETE', headers: authHeaders() }
      );
      if (res.ok) {
        setFolders(prev => prev.filter(f => f !== folderPath && !f.startsWith(folderPath + '/')));
        setFiles(prev => {
          const removed = prev.filter(f => f.folder === folderPath || f.folder?.startsWith(folderPath + '/'));
          if (currentFile && removed.some(f => f.id === currentFile.id)) {
            const remaining = prev.filter(f => f.folder !== folderPath && !f.folder?.startsWith(folderPath + '/'));
            const nextEditable = remaining.find(f => f.type === 'script' || f.type === 'doc');
            setCurrentFile(nextEditable ?? null);
            if (!nextEditable) setCode('');
          }
          return prev.filter(f => f.folder !== folderPath && !f.folder?.startsWith(folderPath + '/'));
        });
      } else {
        const data = await res.json().catch(() => ({})) as any;
        alert(data.error || tl('errorDeleteFolder'));
      }
    } catch (err: any) {
      alert(tl('errorDeleteFolder') + ': ' + err.message);
    }
  };

  // API Call: RUN PYTHON CODE (WebSocket PTY pipeline)
  // The WS handler writes the file and updates DB metadata (size, updatedAt) — no pre-save needed.
  const handleRunCode = () => {
    if (!user || !currentProject || !currentFile) return;
    setIsConsoleOpen(true);
    setRunNonce(n => n + 1);
  };

  // Collapse the editor selection so the AI tutor badge disappears
  const handleClearAiSelection = () => {
    const view = editorRef.current;
    if (view) {
      const head = view.state.selection.main.head;
      view.dispatch({ selection: { anchor: head } }); // collapse to cursor
    }
    setAiSelection(null);
  };

  // Detener la ejecución — envía stop al WebSocket de XtermConsole
  const handleStopRun = () => {
    setStopNonce(n => n + 1);
    setIsRunning(false);
    // Leave terminal output visible (do not clear lastExitResult)
  };

  // Limpiar consola; si hay ejecución activa la detiene primero
  const handleClearConsole = () => {
    setStopNonce(n => n + 1);
    setIsRunning(false);
    setLastExitResult(null);
  };

  // Open dataset preview modal and fetch preview data from the backend
  const handlePreviewDataset = async (file: FileItem) => {
    if (!currentProject) return;
    setPreviewFile(file);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${currentProject.id}/files/${file.id}/preview`,
        { headers: authHeaders() }
      );
      const data = await res.json();
      if (!res.ok) {
        setPreviewError(data.error ?? tl('dataPreviewError'));
      } else {
        setPreviewData(data);
        // Cache a compact schema so the AI tutor can reason about this dataset
        if (Array.isArray(data?.columns)) {
          datasetPreviewsRef.current.set(file.filename, {
            filename: file.filename,
            shape: Array.isArray(data.shape) ? data.shape : [0, data.columns.length],
            columns: data.columns,
            dtypes: data.dtypes ?? {},
            sample: Array.isArray(data.head) ? data.head.slice(0, 15) : [],
          });
        }
      }
    } catch (err: any) {
      setPreviewError(err.message ?? tl('dataPreviewError'));
    } finally {
      setPreviewLoading(false);
    }
  };

  // Helper: Trigger CodeMirror cursor insertions programmatically
  const handleInsertChar = (char: string) => {
    if (editorRef.current) {
      const view = editorRef.current;
      const range = view.state.selection.main;
      view.dispatch({
        changes: { from: range.from, to: range.to, insert: char },
        selection: { anchor: range.from + char.length }
      });
      view.focus();
    } else {
      setCode(prev => prev + char);
    }
  };

  // Strip ANSI escape sequences (SGR + cursor-movement) from PTY output before sending to AI.
  const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

  // Extract the last Python error from the PTY terminal buffer for the AI tutor.
  // Runtime exceptions carry a "Traceback (...)" header; compile-time errors
  // (SyntaxError/IndentationError/TabError) do NOT, so we match their block too.
  const extractError = (raw: string): string => {
    const buffer = stripAnsi(raw);
    const idx = buffer.lastIndexOf('Traceback (most recent call last)');
    if (idx !== -1) return buffer.slice(idx);
    const m = buffer.match(/(^|\n)(\s*File ".*?", line \d+[\s\S]*?(?:SyntaxError|IndentationError|TabError):.*)/);
    return m ? m[2] : '';
  };

  // Convert an ExitResult (from XtermConsole) to the ExecutionResult shape the AI tutor expects.
  // Defined once to avoid running stripAnsi/extractError twice per render.
  const aiExecutionResult = lastExitResult
    ? {
        success: lastExitResult.success,
        stdout: stripAnsi(lastExitResult.ptyBuffer),
        stderr: extractError(lastExitResult.ptyBuffer),
        exitCode: lastExitResult.exitCode,
        duration: lastExitResult.duration,
        timestamp: new Date().toISOString(),
        generatedFiles: lastExitResult.generatedFiles,
      }
    : null;

  // Helper: Capture a snapshot of the current IDE state for the AI tutor
  const getEditorContext = (): IdeContext => {
    const view = editorRef.current;
    let selection: IdeContext['selection'];

    if (view) {
      const sel = view.state.selection.main;
      const selText = view.state.doc.sliceString(sel.from, sel.to);
      if (selText) {
        selection = {
          text: selText,
          fromLine: view.state.doc.lineAt(sel.from).number,
          toLine: view.state.doc.lineAt(sel.to).number,
          from: sel.from,
          to: sel.to,
        };
      }
    }

    return {
      code,
      selection,
      fileName: currentFile?.filename,
      projectName: currentProject?.name,
      execution: aiExecutionResult
        ? { stdout: aiExecutionResult.stdout, stderr: aiExecutionResult.stderr, exitCode: aiExecutionResult.exitCode }
        : undefined,
      datasets: datasetPreviewsRef.current.size ? Array.from(datasetPreviewsRef.current.values()) : undefined,
    };
  };

  // Helper: Apply an AI-proposed code change to the CodeMirror editor
  const handleApplyAiEdit = ({ target, content }: Pick<DiffProposal, 'target' | 'content'>) => {
    const view = editorRef.current;
    if (!view) {
      // Fallback: no editor view — replace whole state value
      if (target === 'file') setCode(content);
      return;
    }
    if (target === 'file') {
      const docLen = view.state.doc.length;
      view.dispatch({ changes: { from: 0, to: docLen, insert: content } });
    } else {
      // target === 'selection': replace current selection (or insert at cursor)
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: content },
        selection: { anchor: sel.from + content.length },
      });
    }
    // Sync React state and trigger auto-save (handleSaveFile is debounced via onChange)
    const newCode = view.state.doc.toString();
    setCode(newCode);
    view.focus();
  };

  // Helper: Download current code as local file
  const handleDownloadFile = () => {
    if (!currentFile) return;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFile.filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Undo/Redo: operate directly on the CodeMirror history stack via the
  // existing editorRef. The wrapper's onChange keeps `code` state (and the
  // debounced autosave) in sync automatically.
  const handleUndo = () => {
    if (!editorRef.current) return;
    undo(editorRef.current);
    editorRef.current.focus();
  };
  const handleRedo = () => {
    if (!editorRef.current) return;
    redo(editorRef.current);
    editorRef.current.focus();
  };

  // Log of session switcher
  const handleLogout = async () => {
    // Invalida el token en el servidor antes de borrarlo del cliente (logout real).
    // Si falla la red, cerramos sesión localmente de todas formas.
    try { await fetch('/api/auth/logout', { method: 'POST', headers: authHeaders() }); } catch { /* noop */ }
    setUser(null);
    localStorage.removeItem('py_ide_user');
    localStorage.removeItem('py_ide_last_proj');
    localStorage.removeItem('py_ide_token');
    localStorage.removeItem('py_ide_locked');
  };

  // AI ready: config must have a key, a model, and a validated connection.
  // 'enabled' is now derived from validated on the server side — no manual toggle.
  const aiReady = aiConfig.hasKey && !!aiConfig.model && aiConfig.enabled;

  const handleAiButtonClick = () => {
    if (aiReady) {
      setShowAIAssistant(v => !v);
    } else {
      setShowAiNotice(true);
    }
  };

  /**
   * Dispatch a pre-filled message to the AI tutor from outside the panel.
   * Opens the panel (if closed) and injects the command; the panel's useEffect
   * will fire sendMessage once isOpen && !isThinking.
   */
  const triggerAiCommand = useCallback((text: string) => {
    if (!aiReady) { setShowAiNotice(true); return; }
    setShowAIAssistant(true);
    setAiCommand({ text, nonce: Date.now() });
  }, [aiReady]);

  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case 'vibrant-dark':
        return {
          wrapper: 'theme-vibrant-dark h-screen w-full bg-slate-950 flex font-sans overflow-hidden text-slate-100',
          workspace: 'flex-1 flex flex-col min-w-0 relative h-full bg-slate-900 overflow-hidden',
          header: 'h-14 bg-slate-950 border-b border-slate-700 px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-none z-20 text-slate-100',
          headerTitle: 'text-slate-100',
          headerSub: 'text-slate-400 uppercase font-bold tracking-wider',
          projectBadge: 'bg-slate-900 border border-slate-700 text-slate-300',
          projectSubtext: 'text-slate-400',
          fileNameText: 'font-mono text-slate-200 truncate',
          btnSec: 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 hover:text-white',
          presetPanel: 'bg-slate-950 border-b border-slate-800 p-2 px-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0',
          presetTitle: 'text-slate-400',
          presetBtn: 'bg-slate-900 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-400 border-slate-700',
          editorCanvas: 'flex-1 overflow-hidden relative bg-[#090d16] flex flex-col p-2 sm:p-4',
          indicatorBox: 'bg-slate-950/95 border border-slate-800',
          userAvatar: 'bg-slate-800 border border-slate-700 text-slate-200'
        };
      case 'midnight-obsidian':
        return {
          wrapper: 'theme-obsidian h-screen w-full bg-black flex font-sans overflow-hidden text-neutral-100',
          workspace: 'flex-1 flex flex-col min-w-0 relative h-full bg-[#080808] overflow-hidden',
          header: 'h-14 bg-black border-b border-neutral-800 px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-none z-20 text-neutral-100',
          headerTitle: 'text-neutral-100',
          headerSub: 'text-neutral-500 uppercase font-bold tracking-wider',
          projectBadge: 'bg-black border border-neutral-800 text-neutral-400',
          projectSubtext: 'text-neutral-500',
          fileNameText: 'font-mono text-neutral-200 truncate',
          btnSec: 'bg-neutral-950 hover:bg-neutral-900 text-neutral-300 border-neutral-800 hover:text-white',
          presetPanel: 'bg-neutral-950 border-b border-neutral-900 p-2 px-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0',
          presetTitle: 'text-neutral-400',
          presetBtn: 'bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border-neutral-900',
          editorCanvas: 'flex-1 overflow-hidden relative bg-black flex flex-col p-2 sm:p-4',
          indicatorBox: 'bg-black/95 border border-neutral-900',
          userAvatar: 'bg-neutral-900 border border-neutral-800 text-neutral-300'
        };
      case 'light':
      default:
        return {
          wrapper: 'theme-light h-screen w-full bg-slate-100 flex font-sans overflow-hidden text-slate-900',
          workspace: 'flex-1 flex flex-col min-w-0 relative h-full bg-slate-50 overflow-hidden',
          header: 'h-14 bg-white border-b border-slate-300 px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-sm z-20 text-slate-900',
          headerTitle: 'text-slate-900',
          headerSub: 'text-[9px] text-slate-500 font-bold uppercase tracking-wider',
          projectBadge: 'bg-white border border-slate-300 text-slate-700 shadow-xs',
          projectSubtext: 'text-slate-600',
          fileNameText: 'font-mono text-slate-800 truncate',
          btnSec: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:text-slate-900 shadow-sm',
          presetPanel: 'bg-white border-b border-slate-300 p-2 px-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0',
          presetTitle: 'text-xs text-slate-600 font-bold uppercase tracking-wider',
          presetBtn: 'bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 shadow-xs',
          editorCanvas: 'flex-1 overflow-hidden relative bg-slate-50 flex flex-col p-2 sm:p-4',
          indicatorBox: 'bg-white border border-slate-300 text-slate-600 shadow-xs',
          userAvatar: 'bg-indigo-100 border border-indigo-300 text-indigo-800'
        };
    }
  };

  const handleLoginSuccess = (data: any) => {
    // Limpia un candado obsoleto: un login fresco no debe heredar el bloqueo previo.
    localStorage.removeItem('py_ide_locked');
    setIsLocked(false);
    setUser(data);
    setPackageUpdates({ outdated: [], lastChecked: null, dismissed: false });
    if (data.restoreNeeded) {
      const restoreCount = data.restoreCount ?? 0;
      setEnvRestore({
        inProgress: true,
        pending: Array(restoreCount).fill('').map((_, i) => `Paquete ${i + 1}`),
        done: [],
        failed: [],
        total: restoreCount
      });
    }
  };

  if (!user) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} setupComplete={setupComplete} />;
  }

  const t = getThemeClasses(activeTheme);

  return (
    <div className={t.wrapper} id="main-ide-panel">
      {/* Environment Restoration Overlay */}
      {envRestore?.inProgress && <EnvRestoreOverlay restoreState={envRestore} />}

      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        user={user}
        projects={projects}
        currentProject={currentProject}
        files={files}
        currentFileId={currentFile ? currentFile.id : null}
        onSelectProject={(id) => {
          const found = projects.find(p => p.id === id);
          if (found) {
            setCurrentProject(found);
            localStorage.setItem('py_ide_last_proj', id);
          }
        }}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onSelectFile={(id) => {
          const found = files.find(f => f.id === id);
          if (found && (found.type === 'script' || found.type === 'doc')) {
            setCurrentFile(found);
          }
        }}
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        onUploadDataset={handleUploadDataset}
        onUploadScript={handleUploadScript}
        folders={folders}
        onCreateFolder={handleCreateFolder}
        onCreateFileInFolder={handleCreateFileInFolder}
        onRenameFile={handleRenameFile}
        onMoveFile={handleMoveFile}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onLogout={handleLogout}
        isOpenOnMobile={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        isCollapsedOnDesktop={sidebarCollapsed}
        activeTheme={activeTheme}
        onOpenPackageManager={() => setShowPackageManager(true)}
        packageUpdateCount={packageUpdates.dismissed ? 0 : packageUpdates.outdated.length}
        onPreviewDataset={handlePreviewDataset}
        secretKeys={secretKeys}
        secretError={secretError}
        onSaveSecret={handleSaveSecret}
        onDeleteSecret={handleDeleteSecret}
        outputFiles={outputFiles}
        onPreviewOutput={setPreviewOutputFile}
        onClearOutput={handleClearOutput}
      />

      {/* Script Output Preview Modal */}
      <OutputPreviewModal
        file={previewOutputFile}
        projectId={currentProject?.id ?? ''}
        token={localStorage.getItem('py_ide_token') ?? ''}
        onClose={() => setPreviewOutputFile(null)}
        activeTheme={activeTheme}
      />

      {/* Dataset Preview Modal */}
      <DataPreviewModal
        filename={previewFile?.filename ?? null}
        data={previewData}
        loading={previewLoading}
        error={previewError}
        onClose={() => { setPreviewFile(null); setPreviewData(null); setPreviewError(null); }}
        activeTheme={activeTheme}
      />

      {/* Python Pip Package Manager Modal */}
      <PackageManagerModal
        isOpen={showPackageManager}
        onClose={() => setShowPackageManager(false)}
        activeTheme={activeTheme}
        packageUpdates={packageUpdates}
        onDismissUpdates={() => setPackageUpdates(prev => ({ ...prev, dismissed: true }))}
        onUpdatesChanged={fetchPackageUpdates}
      />

      {/* 2. Main IDE Workspace */}
      <div className={t.workspace}>        {/* Top Control Header bar */}
        <header className={t.header}>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile Sidebar toggle triggers */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
              id="sidebar-toggle-mobile"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              className="hidden lg:flex p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
              id="sidebar-toggle-desktop"
              title={sidebarCollapsed ? 'Mostrar panel' : 'Ocultar panel'}
              aria-label={sidebarCollapsed ? 'Mostrar panel' : 'Ocultar panel'}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white hidden sm:block">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col hidden sm:flex">
                <h1 className={`text-sm font-bold ${activeTheme === 'light' ? 'text-slate-800' : 'text-slate-100'} leading-tight`}>PyWI</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Python Web IDE • v2.4.0</p>
              </div>
            </div>
            
            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block"></div>
            
            {/* Desktop Full Breadcrumbs */}
            <div className={`hidden lg:flex items-center gap-1.5 px-2 py-1 ${t.projectBadge} rounded text-xs font-semibold max-w-[150px] lg:max-w-[260px] xl:max-w-[360px] min-w-0 shrink`}>
              <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className={`truncate ${t.projectSubtext} font-medium max-w-[60px] lg:max-w-[120px]`}>
                {currentProject ? currentProject.name : tl('noProjectLabel')}
              </span>
              <span className="text-slate-400 shrink-0">/</span>
              <span className={`truncate max-w-[70px] lg:max-w-[120px] ${t.fileNameText}`}>
                {currentFile ? currentFile.filename : tl('noFileLabel')}
              </span>
            </div>

            {/* Markdown edit/preview toggle — only when a .md file is open */}
            {currentFile?.filename.endsWith('.md') && (
              <div className={`hidden lg:flex items-center gap-0.5 ml-1 rounded p-0.5 shrink-0 ${activeTheme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`}>
                <button
                  onClick={() => setMdView('edit')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${mdView === 'edit' ? `${activeTheme === 'light' ? 'bg-white' : 'bg-slate-700'} text-indigo-600 shadow-sm` : `text-slate-500 ${activeTheme === 'light' ? 'hover:text-slate-700' : 'hover:text-slate-300'}`}`}
                >
                  Editar
                </button>
                <button
                  onClick={() => setMdView('preview')}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${mdView === 'preview' ? `${activeTheme === 'light' ? 'bg-white' : 'bg-slate-700'} text-indigo-600 shadow-sm` : `text-slate-500 ${activeTheme === 'light' ? 'hover:text-slate-700' : 'hover:text-slate-300'}`}`}
                >
                  Vista
                </button>
              </div>
            )}

            {/* Mobile Compact File badge */}
            <div className={`flex items-center gap-1.5 lg:hidden min-w-0 rounded px-2 py-0.5 select-none shrink border ${activeTheme === 'light' ? 'bg-white border-slate-300' : 'bg-slate-900/60 border-slate-700'}`}>
              <FileCode className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className={`font-mono text-[11px] font-bold truncate max-w-[80px] sm:max-w-[150px] ${
                activeTheme === 'light' ? 'text-slate-800' : 'text-slate-200'
              }`}>
                {currentFile ? currentFile.filename : tl('noFileLabel')}
              </span>
            </div>
            {/* Mobile md toggle */}
            {currentFile?.filename.endsWith('.md') && (
              <div className={`flex lg:hidden items-center gap-0.5 rounded p-0.5 shrink-0 ${activeTheme === 'light' ? 'bg-slate-200' : 'bg-slate-800'}`}>
                <button onClick={() => setMdView('edit')} className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${mdView === 'edit' ? `${activeTheme === 'light' ? 'bg-white' : 'bg-slate-700'} text-indigo-600 shadow-sm` : 'text-slate-500'}`}>Editar</button>
                <button onClick={() => setMdView('preview')} className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${mdView === 'preview' ? `${activeTheme === 'light' ? 'bg-white' : 'bg-slate-700'} text-indigo-600 shadow-sm` : 'text-slate-500'}`}>Vista</button>
              </div>
            )}
          </div>

          {/* Compile, Run & responsive options dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop Only Service Status */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1 hidden xl:flex shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-medium text-slate-600">{tl('serviceActive')}</span>
            </div>

            {/* Desktop Only Undo/Redo pair */}
            {currentFile && (
              <div className="hidden md:flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className={`p-1.5 ${t.btnSec} rounded-md transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                  title={tl('undoTooltip')}
                  id="btn-undo"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  className={`p-1.5 ${t.btnSec} rounded-md transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                  title={tl('redoTooltip')}
                  id="btn-redo"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Desktop Only raw download button */}
            {currentFile && (
              <button
                onClick={handleDownloadFile}
                className={`p-1 px-2.5 ${t.btnSec} font-bold text-xs rounded-md transition-all flex items-center gap-1 shadow-xs hidden lg:flex shrink-0`}
                title={tl('downloadTooltip')}
                id="btn-download-script-raw"
              >
                <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{tl('downloadBtn')}</span>
              </button>
            )}

            {/* Beautiful Run button: only shown for .py scripts */}
            {(!currentFile || currentFile.filename.endsWith('.py')) && (
              <button
                onClick={handleRunCode}
                disabled={isRunning || !currentFile}
                className="flex items-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 shrink-0"
                id="btn-run-python-code"
              >
                {isRunning ? (
                  <>
                    <div className="h-3 w-3 sm:h-3.5 sm:w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="hidden xs:inline">{tl('running')}</span>
                    <span className="xs:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0" />
                    <span>{tl('run')}</span>
                    <span className="hidden xs:inline">{tl('runScript')}</span>
                  </>
                )}
              </button>
            )}

            {/* Stop button: only visible while a script is running */}
            {isRunning && (
              <button
                onClick={handleStopRun}
                className="flex items-center gap-1.5 sm:gap-2 bg-rose-600 hover:bg-rose-700 text-white px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-colors shadow-sm shrink-0"
                title={tl('stopTooltip')}
                id="btn-stop-python-code"
              >
                <Square className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0" />
                <span>{tl('stop')}</span>
              </button>
            )}

            {/* Desktop Visual Theme selector */}
            <div className="relative hidden lg:block" id="theme-visual-selector-dropdown-desktop">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`p-1.5 px-2 rounded-md border text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs shrink-0 ${
                  activeTheme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    : activeTheme === 'vibrant-dark'
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-neutral-950 border-neutral-900 text-neutral-300 hover:bg-neutral-900'
                }`}
                title={tl('themeTooltip')}
                id="btn-trigger-theme-selector-desktop"
              >
                <Palette className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span className="hidden lg:inline">{tl('themeBtn')}</span>
              </button>

              {showThemeMenu && (
                <>
                  <div 
                    onClick={() => setShowThemeMenu(false)} 
                    className="fixed inset-0 z-30" 
                    id="theme-menu-backdrop-desktop" 
                  />
                  <div
                    className={`absolute right-0 mt-2 w-52 rounded-xl border p-2 shadow-xl z-40 animate-fadeIn ${
                      activeTheme === 'light'
                        ? 'bg-white border-slate-300 text-slate-800'
                        : activeTheme === 'vibrant-dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-black border-neutral-800 text-neutral-100'
                    }`}
                    id="theme-selection-popover-desktop"
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 ${activeTheme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                      {tl('themesTitle')}
                    </p>
                    <div className="space-y-1 mt-1">
                      <button
                        onClick={() => {
                          setActiveTheme('light');
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                          activeTheme === 'light'
                            ? 'bg-indigo-50/70 text-indigo-700'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                        id="theme-opt-light"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-300 bg-white" />
                          <span>Professional Polish (Light)</span>
                        </div>
                        {activeTheme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                      </button>

                      <button
                        onClick={() => {
                          setActiveTheme('vibrant-dark');
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                          activeTheme === 'vibrant-dark'
                            ? 'bg-indigo-950/40 text-indigo-300'
                            : activeTheme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-neutral-900 text-neutral-300'
                        }`}
                        id="theme-opt-vibrant-dark"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-indigo-500/20 bg-slate-600" />
                          <span>Vibrant Slate (Dark)</span>
                        </div>
                        {activeTheme === 'vibrant-dark' && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                      </button>

                      <button
                        onClick={() => {
                          setActiveTheme('midnight-obsidian');
                          setShowThemeMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors ${
                          activeTheme === 'midnight-obsidian'
                            ? 'bg-neutral-900 text-white border-l border-neutral-400'
                            : activeTheme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800 text-slate-300'
                        }`}
                        id="theme-opt-midnight-obsidian"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-neutral-800 bg-black" />
                          <span>Deep Obsidian (Ebony)</span>
                        </div>
                        {activeTheme === 'midnight-obsidian' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Quick Mobile Keyboard Toggle Button */}
            <button
              onClick={() => setShowSpecialKeys(!showSpecialKeys)}
              className={`lg:hidden p-1.5 rounded-md border text-xs font-bold transition-all flex items-center justify-center shadow-2xs shrink-0 ${
                showSpecialKeys
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-300 font-bold'
                  : activeTheme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : activeTheme === 'vibrant-dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-neutral-950 border-neutral-900 text-neutral-300 hover:bg-neutral-900'
              }`}
              title={showSpecialKeys ? tl('hideMobileKbTooltip') : tl('showMobilKbTooltip')}
              id="btn-toggle-special-keys-mobile"
            >
              <Keyboard className="h-4 w-4 shrink-0" />
            </button>

            {/* Mobile Actions Dropdown menu (MoreVertical is visible only on mobile/tablets) */}
            <div className="relative lg:hidden" id="mobile-header-options">
              <button
                onClick={() => setShowMobileOptions(!showMobileOptions)}
                className={`p-1.5 rounded-md border text-xs font-bold transition-all flex items-center justify-center shadow-2xs shrink-0 ${
                  activeTheme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : activeTheme === 'vibrant-dark'
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-neutral-950 border-neutral-900 text-neutral-300 hover:bg-neutral-900'
                }`}
                title={tl('moreActions')}
                id="btn-trigger-mobile-options"
              >
                <MoreVertical className="h-4 w-4 shrink-0" />
              </button>

              {showMobileOptions && (
                <>
                  <div 
                    onClick={() => setShowMobileOptions(false)} 
                    className="fixed inset-0 z-30" 
                    id="mobile-options-backdrop" 
                  />
                  <div 
                    className={`absolute right-0 mt-2 w-56 rounded-xl border p-3 shadow-xl z-40 animate-fadeIn ${
                      activeTheme === 'light'
                        ? 'bg-white border-slate-300 text-slate-800'
                        : activeTheme === 'vibrant-dark'
                        ? 'bg-slate-950 border-slate-800 text-slate-100'
                        : 'bg-black border-neutral-800 text-neutral-100'
                    }`}
                    id="mobile-options-popover"
                  >
                    <p className={`text-[10px] font-bold uppercase tracking-widest px-1 mb-2 ${
                      activeTheme === 'light' ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {tl('projectAndScript')}
                    </p>
                    
                    <div className="space-y-2 mt-1">
                      {/* Active project and file info */}
                      <div className={`p-2 rounded-lg text-[11px] leading-5 border text-left ${
                        activeTheme === 'light' ? 'bg-slate-50 border-slate-100 text-slate-700' : 'bg-slate-900/60 border-slate-800/80 text-slate-300'
                      }`}>
                        <div className="font-semibold text-[9px] uppercase opacity-60">{tl('activeProject')}</div>
                        <div className="truncate font-bold mb-1.5">{currentProject ? currentProject.name : tl('noProjectLabel')}</div>
                        <div className="font-semibold text-[9px] uppercase opacity-60">{tl('currentScript')}</div>
                        <div className="truncate font-mono text-[11px] font-bold text-indigo-500">{currentFile ? currentFile.filename : tl('noFileLabel')}</div>
                      </div>

                      {/* Download option */}
                      {currentFile && (
                        <button
                          onClick={() => {
                            handleDownloadFile();
                            setShowMobileOptions(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${
                            activeTheme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-900 text-slate-100'
                          }`}
                        >
                          <Download className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          <span>{tl('downloadScript')}</span>
                        </button>
                      )}

                      {/* Keyboard quick toggle option */}
                      <button
                        onClick={() => {
                          setShowSpecialKeys(!showSpecialKeys);
                          setShowMobileOptions(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-colors ${
                          activeTheme === 'light' ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-900 text-slate-100'
                        }`}
                      >
                        <Keyboard className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                        <span>{showSpecialKeys ? tl('hideSpecialKeys') : tl('showSpecialKeys')}</span>
                      </button>

                      {/* Switch theme directly drawer option */}
                      <div className={`pt-2 border-t space-y-1 ${
                        activeTheme === 'light' ? 'border-slate-100' : 'border-slate-800/80'
                      }`}>
                        <p className={`text-[9px] font-bold uppercase tracking-wider px-1 ${
                          activeTheme === 'light' ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {tl('changeTheme')}
                        </p>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            onClick={() => {
                              setActiveTheme('light');
                              setShowMobileOptions(false);
                            }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded text-center border flex items-center justify-center gap-1 ${
                              activeTheme === 'light'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-slate-100/50 border-transparent text-slate-500'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300 bg-white shrink-0" />
                            {tl('themeLight')}
                          </button>
                          <button
                            onClick={() => {
                              setActiveTheme('vibrant-dark');
                              setShowMobileOptions(false);
                            }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded text-center border flex items-center justify-center gap-1 ${
                              activeTheme === 'vibrant-dark'
                                ? 'bg-indigo-950/50 border-indigo-800 text-indigo-300'
                                : 'bg-slate-900/40 border-transparent text-slate-400'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-indigo-500/20 bg-slate-600 shrink-0" />
                            {tl('themeSlate')}
                          </button>
                          <button
                            onClick={() => {
                              setActiveTheme('midnight-obsidian');
                              setShowMobileOptions(false);
                            }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded text-center border flex items-center justify-center gap-1 ${
                              activeTheme === 'midnight-obsidian'
                                ? 'bg-neutral-800 border-neutral-600 text-white'
                                : 'bg-neutral-900/40 border-transparent text-neutral-400'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-neutral-800 bg-black shrink-0" />
                            {tl('themeObsidian')}
                          </button>
                        </div>
                      </div>

                      {/* Status Row */}
                      <div className="flex items-center justify-between px-1 py-1 bg-emerald-50/50 dark:bg-emerald-950/20 rounded border border-emerald-100/40 mt-1">
                        <span className="text-[10px] opacity-75 text-emerald-600 font-medium">{tl('serviceOnline')}</span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      </div>

                      {/* Logged user Row */}
                      <div className={`pt-2 border-t flex items-center gap-2 ${
                        activeTheme === 'light' ? 'border-slate-100' : 'border-slate-800/80'
                      }`}>
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[10px] shrink-0">
                          {user.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 text-left">
                          <div className="text-[10px] font-bold truncate text-slate-700 dark:text-slate-300">{user.username}</div>
                          <div className="text-[9px] truncate opacity-50">{user.email}</div>
                        </div>
                      </div>

                    </div>
                  </div>
                </>
              )}
            </div>

            {/* AI Assistant button (desktop) */}
            <button
              onClick={handleAiButtonClick}
              className={`p-1.5 rounded-md border text-xs font-bold transition-all flex items-center justify-center shadow-2xs shrink-0 ${
                !aiReady
                  ? activeTheme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-400 opacity-50 cursor-not-allowed'
                    : 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                  : showAIAssistant
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : activeTheme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : activeTheme === 'vibrant-dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-neutral-950 border-neutral-900 text-neutral-300 hover:bg-neutral-900'
              }`}
              title={aiReady ? tl('aiOpenBtn') : tl('aiNeedsConfigTitle')}
              id="btn-ai-assistant"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
            </button>

            {/* Settings button */}
            <button
              onClick={() => setShowSettingsModal(true)}
              className={`p-1.5 rounded-md border text-xs font-bold transition-all flex items-center justify-center shadow-2xs shrink-0 ${
                activeTheme === 'light'
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : activeTheme === 'vibrant-dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'bg-neutral-950 border-neutral-900 text-neutral-300 hover:bg-neutral-900'
              }`}
              title={tl('settingsTooltip')}
              id="btn-settings"
            >
              <Settings className="h-4 w-4 shrink-0" />
            </button>

          </div>
        </header>

        {/* Special Mobile helpful touch Keys bar */}
        {showSpecialKeys && (
          <SpecialKeys 
            onInsertChar={handleInsertChar} 
            onClose={() => setShowSpecialKeys(false)} 
          />
        )}

        {/* Package Update Notification Banner */}
        {!packageUpdates.dismissed && packageUpdates.outdated.length > 0 && (
          <div className={`mx-2 mt-2 sm:mx-4 px-3 py-2 rounded-xl border flex items-center justify-between gap-3 shrink-0 ${
            activeTheme === 'light'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : activeTheme === 'vibrant-dark'
              ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
              : 'bg-amber-950/10 border-amber-900/40 text-amber-400'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span className="text-xs font-semibold truncate">
                {tl('packageUpdatesAvailable', { count: packageUpdates.outdated.length })}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowPackageManager(true)}
                className={`text-xs font-bold underline underline-offset-2 hover:no-underline transition-all ${
                  activeTheme === 'light' ? 'text-amber-700' : 'text-amber-400'
                }`}
              >
                {tl('viewUpdates')}
              </button>
              <button
                onClick={() => setPackageUpdates(prev => ({ ...prev, dismissed: true }))}
                className={`p-1 rounded transition-colors ${
                  activeTheme === 'light' ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-amber-950/40 text-amber-500'
                }`}
                title={tl('dismissNotification')}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Center Canvas: Interactive Python Editor panel */}
        <main className={t.editorCanvas} id="editor-wrapper-canvas">
          {currentFile ? (
            <div className="flex-1 flex flex-col relative h-full min-h-0">
              {/* Saving or draft indicator states */}
              <div className={`absolute top-2 right-4 z-10 flex items-center gap-1 ${t.indicatorBox} px-2 py-0.5 rounded text-[10px] text-slate-400 border`}>
                {isSaving ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                    <span>{tl('autoSaving')}</span>
                  </>
                ) : (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{tl('savedLocal')}</span>
                  </>
                )}
              </div>

              {/* Robust CodeMirror Editor workspace container */}
              <div className="flex-1 min-h-0 relative select-text" id="codemirror-wrapper-layer">
                {/* Inline AI prompt overlay — opens on Ctrl+I */}
                {inlinePromptOpen && (
                  <div className="absolute inset-x-0 top-0 z-30 flex items-start justify-center pt-3 px-3 pointer-events-none">
                    <div
                      className={`pointer-events-auto w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden ${
                        activeTheme === 'light'
                          ? 'bg-white border-slate-200'
                          : activeTheme === 'midnight-obsidian'
                          ? 'bg-[#0a0a0a] border-neutral-800'
                          : 'bg-slate-900 border-slate-700'
                      }`}
                    >
                      <div className={`flex items-center gap-2 px-3 py-2 border-b ${
                        activeTheme === 'light' ? 'border-slate-100 bg-slate-50' : activeTheme === 'midnight-obsidian' ? 'border-neutral-900 bg-[#080808]' : 'border-slate-800 bg-slate-950'
                      }`}>
                        <Wand2 className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className={`text-[11px] font-semibold uppercase tracking-wider ${activeTheme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {tl('aiInlineTitle')}
                        </span>
                        <button
                          onClick={() => { setInlinePromptOpen(false); setInlinePromptValue(''); editorRef.current?.focus(); }}
                          className={`ml-auto p-0.5 rounded ${activeTheme === 'light' ? 'hover:bg-slate-100 text-slate-400' : 'hover:bg-slate-800 text-slate-500'}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input
                          ref={inlineInputRef}
                          type="text"
                          value={inlinePromptValue}
                          onChange={e => setInlinePromptValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Escape') {
                              setInlinePromptOpen(false);
                              setInlinePromptValue('');
                              editorRef.current?.focus();
                            } else if (e.key === 'Enter' && inlinePromptValue.trim()) {
                              const prefix = tl('aiInlinePromptPrefix');
                              triggerAiCommand(prefix + inlinePromptValue.trim());
                              setInlinePromptOpen(false);
                              setInlinePromptValue('');
                            }
                          }}
                          placeholder={tl('aiInlinePlaceholder')}
                          className={`flex-1 text-xs outline-none bg-transparent ${activeTheme === 'light' ? 'text-slate-800 placeholder:text-slate-400' : 'text-slate-100 placeholder:text-slate-500'}`}
                          autoComplete="off"
                          spellCheck={false}
                        />
                        <button
                          onClick={() => {
                            if (!inlinePromptValue.trim()) return;
                            const prefix = tl('aiInlinePromptPrefix');
                            triggerAiCommand(prefix + inlinePromptValue.trim());
                            setInlinePromptOpen(false);
                            setInlinePromptValue('');
                          }}
                          disabled={!inlinePromptValue.trim()}
                          className="shrink-0 px-3 py-1 text-[11px] rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors"
                        >
                          {tl('aiInlineSend')}
                        </button>
                      </div>
                      <div className={`px-3 py-1 text-[10px] ${activeTheme === 'light' ? 'text-slate-400' : 'text-slate-600'}`}>
                        {tl('aiInlineHint')}
                      </div>
                    </div>
                  </div>
                )}
                {currentFile?.filename.endsWith('.md') && mdView === 'preview' ? (
                  <div className={`markdown-preview flex-1 overflow-y-auto p-6 h-full${activeTheme === 'light' ? ' markdown-light' : ' markdown-dark'}`}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{code}</ReactMarkdown>
                  </div>
                ) : (
                <CodeMirror
                  value={code}
                  height="100%"
                  theme="dark"
                  extensions={[
                    langFor(currentFile?.filename ?? ''),
                    EditorView.lineWrapping,
                    indentUnit.of(' '.repeat(userSettings.indentation)),
                    keymap.of([{
                      key: 'Mod-i',
                      run: () => {
                        if (!currentFile) return false;
                        setInlinePromptOpen(true);
                        setTimeout(() => inlineInputRef.current?.focus(), 50);
                        return true;
                      },
                    }]),
                    // Brand-colour selection highlight: indigo instead of CM default blue.
                    // Also styles the unfocused state so the highlight persists while the
                    // user types in the AI tutor panel (editor loses focus but keeps selection).
                    EditorView.theme({
                      '.cm-selectionBackground': { backgroundColor: 'rgba(99,102,241,0.30) !important' },
                      '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(99,102,241,0.40) !important' },
                    }),
                    EditorView.updateListener.of((update) => {
                      if (update.docChanged) {
                        setCanUndo(undoDepth(update.state) > 0);
                        setCanRedo(redoDepth(update.state) > 0);
                      }
                      if (!update.selectionSet && !update.docChanged) return;
                      const sel = update.state.selection.main;
                      if (sel.empty) { setAiSelection(null); return; }
                      const doc = update.state.doc;
                      // If selection ends exactly at the start of a line, don't count that line.
                      const toPos = sel.to > sel.from ? sel.to - 1 : sel.to;
                      setAiSelection({
                        fromLine: doc.lineAt(sel.from).number,
                        toLine: doc.lineAt(toPos).number,
                      });
                    }),
                  ]}
                  onChange={(val) => {
                    setCode(val);
                    // Automatic debounce-like quick save physically
                    const timer = setTimeout(() => handleSaveFile(val), 1000);
                    return () => clearTimeout(timer);
                  }}
                  onCreateEditor={(view) => {
                    editorRef.current = view;
                    setCanUndo(undoDepth(view.state) > 0);
                    setCanRedo(redoDepth(view.state) > 0);
                  }}
                  className={`h-full rounded-xl overflow-hidden font-mono text-[13px] sm:text-[14px] border ${
                    activeTheme === 'light'
                      ? 'border-slate-300 shadow-md'
                      : activeTheme === 'vibrant-dark'
                      ? 'border-slate-700/60 shadow-lg'
                      : 'border-neutral-800 shadow-lg'
                  }`}
                  id="react-codemirror-editor"
                />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" id="empty-editor-fallback">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center border mb-4 animate-pulse ${
                activeTheme === 'light'
                  ? 'bg-slate-200 border-slate-300 text-indigo-600'
                  : 'bg-slate-900 border-slate-800 text-indigo-400'
              }`}>
                <Code2 className="h-8 w-8" />
              </div>
              <h2 className={`text-sm font-semibold uppercase tracking-widest ${
                activeTheme === 'light' ? 'text-slate-700' : 'text-slate-300'
              }`}>{tl('editorEmpty')}</h2>
              <p className={`text-xs mt-1 max-w-[280px] ${
                activeTheme === 'light' ? 'text-slate-600' : 'text-slate-500'
              }`}>
                {tl('editorEmptyDesc')}
              </p>
            </div>
          )}
        </main>

        {/* FABs: Undo/Redo (mobile) — bottom-left, mirroring the AI/Console FABs on the right */}
        {currentFile && (
          <>
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              className={`absolute bottom-4 left-16 z-20 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-all border md:hidden ${
                !canUndo
                  ? 'bg-slate-700/50 text-slate-500 border-slate-600/30 opacity-50 cursor-not-allowed'
                  : activeTheme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:scale-105 active:scale-95 shadow-md'
                  : activeTheme === 'vibrant-dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600/60 hover:scale-105 active:scale-95'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 hover:scale-105 active:scale-95'
              }`}
              title={tl('undoTooltip')}
              id="floating-btn-undo"
            >
              <Undo2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              className={`absolute bottom-4 left-4 z-20 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-all border md:hidden ${
                !canRedo
                  ? 'bg-slate-700/50 text-slate-500 border-slate-600/30 opacity-50 cursor-not-allowed'
                  : activeTheme === 'light'
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:scale-105 active:scale-95 shadow-md'
                  : activeTheme === 'vibrant-dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-600/60 hover:scale-105 active:scale-95'
                  : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700 hover:scale-105 active:scale-95'
              }`}
              title={tl('redoTooltip')}
              id="floating-btn-redo"
            >
              <Redo2 className="h-5 w-5" />
            </button>
          </>
        )}

        {/* FAB: AI assistant (mobile) — offset right to avoid overlapping console FAB */}
        {!showAIAssistant && (
          <button
            onClick={handleAiButtonClick}
            className={`absolute bottom-4 right-16 z-20 h-10 w-10 rounded-full flex items-center justify-center shadow-lg transition-all border md:hidden ${
              aiReady
                ? 'bg-indigo-700 hover:bg-indigo-600 text-white hover:scale-105 active:scale-95 border-indigo-500/40'
                : 'bg-slate-700/50 text-slate-500 border-slate-600/30 opacity-50 cursor-not-allowed'
            }`}
            title={aiReady ? tl('aiOpenBtn') : tl('aiNeedsConfigTitle')}
            id="floating-btn-open-ai"
          >
            <Sparkles className="h-5 w-5" />
          </button>
        )}

        {/* Floating Toggle button if console output completed and closed */}
        {!isConsoleOpen && lastExitResult && (
          <button
            onClick={() => setIsConsoleOpen(true)}
            className="absolute bottom-4 right-4 z-20 h-10 w-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border border-indigo-400/40"
            title={tl('openTerminal')}
            id="floating-btn-open-console"
          >
            <Terminal className="h-5 w-5" />
          </button>
        )}

        {/* AI Assistant bottom-sheet */}
        <AIAssistant
          isOpen={showAIAssistant}
          onClose={() => setShowAIAssistant(false)}
          isExpanded={isAIExpanded}
          onToggleExpand={() => setIsAIExpanded(v => !v)}
          activeTheme={activeTheme}
          code={code}
          executionResult={aiExecutionResult}
          language={userSettings.language}
          userId={user.id}
          aiReady={aiReady}
          getEditorContext={getEditorContext}
          onApplyEdit={handleApplyAiEdit}
          currentFile={currentFile}
          currentProject={currentProject}
          aiCommand={aiCommand}
          selectionInfo={aiSelection}
          onClearSelection={handleClearAiSelection}
        />

        {/* 3. Sliding lower Console Sheet panel (WebSocket PTY terminal) */}
        <XtermConsole
          isOpen={isConsoleOpen}
          onClose={() => setIsConsoleOpen(false)}
          onClear={handleClearConsole}
          isExpanded={isConsoleExpanded}
          onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
          projectId={currentProject?.id ?? ''}
          fileId={currentFile?.id ?? ''}
          runCode={code}
          token={localStorage.getItem('py_ide_token') ?? ''}
          runNonce={runNonce}
          stopNonce={stopNonce}
          activeTheme={activeTheme}
          aiReady={aiReady}
          onRunStateChange={setIsRunning}
          onExitResult={setLastExitResult}
          onExplainError={aiReady ? () => triggerAiCommand(tl('aiExplainErrorPrompt')) : undefined}
          onImportBlocked={setImportBlockedModule}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => { setShowSettingsModal(false); setSettingsInitialTab('editor'); }}
          userId={user.id}
          userRole={user.role}
          userSettings={userSettings}
          activeTheme={activeTheme}
          onSettingsSaved={(settings) => {
            setUserSettings(settings);
            setLang(settings.language);
          }}
          initialTab={settingsInitialTab}
          onAiConfigSaved={(cfg) => setAiConfig(cfg)}
        />

        {/* Lock Screen — se muestra sobre la IDE completa tras inactividad */}
        {isLocked && (
          <LockScreen
            user={user}
            activeTheme={activeTheme}
            onUnlock={() => {
              localStorage.removeItem('py_ide_locked');
              setIsLocked(false);
              fetchProjects(); // el token cambió tras re-autenticar; recargar datos
              loadSettingsAndAiConfig(); // idem para IA/settings, que pudieron fallar (401) mientras estaba bloqueado
            }}
            onLogout={handleLogout}
          />
        )}

        {/* AI not-configured notice */}
        {showAiNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowAiNotice(false)}>
            <div
              className={`rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 border ${
                activeTheme === 'light'
                  ? 'bg-white border-slate-200'
                  : activeTheme === 'midnight-obsidian'
                  ? 'bg-[#0a0a0a] border-neutral-800'
                  : 'bg-slate-950 border-slate-800'
              }`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">🤖</span>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${activeTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {tl('aiNeedsConfigTitle')}
                  </p>
                  <p className={`text-xs leading-relaxed ${activeTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {tl('aiNeedsConfigDesc')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAiNotice(false); setSettingsInitialTab('ai'); setShowSettingsModal(true); }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {tl('aiGoToConfig')}
                </button>
                <button
                  onClick={() => setShowAiNotice(false)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    activeTheme === 'light'
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {tl('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Import blocked notice — shown when a script is rejected for using a forbidden module */}
        {importBlockedModule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setImportBlockedModule(null)}>
            <div
              className={`rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4 border ${
                activeTheme === 'light'
                  ? 'bg-white border-slate-200'
                  : activeTheme === 'midnight-obsidian'
                  ? 'bg-[#0a0a0a] border-neutral-800'
                  : 'bg-slate-950 border-slate-800'
              }`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl shrink-0">🔒</span>
                <div>
                  <p className={`text-sm font-semibold mb-1 ${activeTheme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                    {tl('importBlockedTitle', { module: importBlockedModule })}
                  </p>
                  <p className={`text-xs leading-relaxed ${activeTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {tl('importBlockedBody', { module: importBlockedModule })}
                  </p>
                  <p className={`text-xs leading-relaxed mt-2 ${activeTheme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {user?.role === 'admin' ? tl('importBlockedAdminHint') : tl('importBlockedContactAdmin')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {user?.role === 'admin' && (
                  <button
                    onClick={() => { setImportBlockedModule(null); setSettingsInitialTab('users'); setShowSettingsModal(true); }}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {tl('importBlockedGoToConfig')}
                  </button>
                )}
                <button
                  onClick={() => setImportBlockedModule(null)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${user?.role === 'admin' ? '' : 'flex-1'} ${
                    activeTheme === 'light'
                      ? 'border-slate-300 text-slate-600 hover:bg-slate-100'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {tl('importBlockedClose')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upload path notice — shown immediately after a dataset is uploaded */}
        {uploadNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setUploadNotice(null)}>
            <div className="bg-slate-900 border border-amber-500/60 rounded-xl shadow-2xl p-5 max-w-sm w-full mx-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-amber-400 text-xl shrink-0">⚠️</span>
                <div>
                  <p className="text-slate-100 text-sm font-semibold mb-1">{tl('uploadFileSuccess')}</p>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    {tl('uploadFilePathInfo')}
                  </p>
                  <div className="mt-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-700">
                    <code className="text-amber-300 text-sm font-mono">'{uploadNotice}'</code>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-2">
                    {tl('uploadFilePathWarning')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setUploadNotice(null)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {tl('accept')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  // Solo 'es'/'en' son válidos — sanea valores corruptos (ej. la cadena "undefined"
  // persistida por un bug previo) en vez de propagarlos al contexto de idioma.
  const storedLang = localStorage.getItem('py_ide_lang');
  const [lang, setLang] = React.useState<'es' | 'en'>(storedLang === 'en' ? 'en' : 'es');
  const handleSetLang = (l: 'es' | 'en') => {
    localStorage.setItem('py_ide_lang', l);
    setLang(l);
  };

  // Detect reset-password route
  const [isResetRoute, setIsResetRoute] = React.useState(
    window.location.pathname === '/reset-password' && !!new URLSearchParams(window.location.search).get('token')
  );
  const resetToken = new URLSearchParams(window.location.search).get('token') ?? '';

  return (
    <LanguageProvider lang={lang} setLang={handleSetLang}>
      {isResetRoute ? (
        <ResetPasswordScreen
          token={resetToken}
          onDone={() => {
            history.pushState({}, '', '/');
            setIsResetRoute(false);
          }}
        />
      ) : (
        <AppContent />
      )}
    </LanguageProvider>
  );
}
