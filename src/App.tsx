import React, { useState, useEffect, useRef } from 'react';
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
  Bell
} from 'lucide-react';
import { EditorView } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';

import { User, Project, FileItem, ExecutionResult, UserSettings, EnvRestoreState, PackageUpdateState } from './types';
import { LanguageProvider, useLang, useT } from './i18n';
import AuthScreen from './components/AuthScreen';
import Sidebar from './components/Sidebar';
import SpecialKeys from './components/SpecialKeys';
import ConsoleSheet from './components/ConsoleSheet';
import PackageManagerModal from './components/PackageManagerModal';
import SettingsModal from './components/SettingsModal';
import EnvRestoreOverlay from './components/EnvRestoreOverlay';

// Helper: construye headers con el JWT del usuario actual
const authHeaders = (extra: Record<string, string> = {}): Record<string, string> => {
  const token = localStorage.getItem('py_ide_token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
};

function AppContent() {
  const tl = useT();
  // Authentication & session state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('py_ide_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [adminExists, setAdminExists] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/auth/admin-exists')
      .then(r => r.json())
      .then(d => setAdminExists(d.adminExists))
      .catch(() => setAdminExists(true));
  }, []);

  // User settings & language state
  const [userSettings, setUserSettings] = useState<UserSettings>({ indentation: 4, language: 'es' });
  const { setLang } = useLang();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Package Manager visibility state
  const [showPackageManager, setShowPackageManager] = useState(false);

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

  // Execution console state
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Environment restoration state
  const [envRestore, setEnvRestore] = useState<EnvRestoreState | null>(null);

  // Package update notification state
  const [packageUpdates, setPackageUpdates] = useState<PackageUpdateState>({
    outdated: [], lastChecked: null, dismissed: false
  });

  // Layout UI management
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const editorRef = useRef<EditorView | null>(null);

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

  // Load user settings on login
  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('py_ide_token');
      fetch(`/api/users/${user.id}/settings`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(settings => {
          setUserSettings(settings);
          setLang(settings.language);
        })
        .catch(err => console.error('Error loading settings:', err));
    }
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
    }
  }, [currentProject]);

  // Fetch file content when active file changes
  useEffect(() => {
    if (currentProject && currentFile && user) {
      fetchFileContent(currentProject.id, currentFile.id);
    }
  }, [currentFile]);

  // API Call: Fetch projects for active log
  const fetchProjects = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/users/${user.id}/projects`, { headers: authHeaders() });
      if (res.status === 401) { handleLogout(); return; }
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
      }
    } catch (err) {
      console.error('Error deleting project:', err);
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
          content: filename.endsWith('.py') ? `# Script: ${filename}\nprint("Hola ${filename}!")` : '',
          type: filename.endsWith('.py') ? 'script' : 'dataset'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setFiles(prev => [...prev, data]);
        if (data.type === 'script') {
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || `Error al eliminar archivo (${res.status})`);
        return;
      }
      const remaining = files.filter(f => f.id !== fileId);
      setFiles(remaining);
      if (currentFile?.id === fileId) {
        const scripts = remaining.filter(f => f.type === 'script');
        setCurrentFile(scripts.length > 0 ? scripts[0] : remaining[0] || null);
      }
    } catch (err: any) {
      alert(`Error de conexión al eliminar: ${err.message}`);
    }
  };

  // Upload notice: shown after dataset upload to remind user of correct path
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

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
          content: `# ${filename}\n`,
          type: 'script',
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
      const res = await fetch(`/api/projects/${currentProject.id}/folders`, {
        method: 'DELETE',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, folderPath })
      });
      if (res.ok) {
        setFolders(prev => prev.filter(f => f !== folderPath && !f.startsWith(folderPath + '/')));
        setFiles(prev => {
          const removed = prev.filter(f => f.folder === folderPath || f.folder?.startsWith(folderPath + '/'));
          if (currentFile && removed.some(f => f.id === currentFile.id)) {
            const remaining = prev.filter(f => f.folder !== folderPath && !f.folder?.startsWith(folderPath + '/'));
            const nextScript = remaining.find(f => f.type === 'script');
            setCurrentFile(nextScript ?? null);
            if (!nextScript) setCode('');
          }
          return prev.filter(f => f.folder !== folderPath && !f.folder?.startsWith(folderPath + '/'));
        });
      } else {
        const data = await res.json();
        alert(data.error || tl('errorDeleteFolder'));
      }
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  // API Call: RUN PYTHON CODE (Critical Compiler Pipeline)
  const handleRunCode = async () => {
    if (!user || !currentProject || !currentFile) return;
    
    setIsRunning(true);
    setExecutionResult(null);
    setIsConsoleOpen(true); // Open "Bottom Sheet" on run trig
    
    // Auto save physical file change before running
    await handleSaveFile(code);

    try {
      const res = await fetch(`/api/projects/${currentProject.id}/files/${currentFile.id}/run`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId: user.id, runCode: code })
      });
      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        stdout: '',
        stderr: `${tl('errorExecutionEngine')}: ${err.message}`,
        exitCode: -1,
        duration: 0,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
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

  // Log of session switcher
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('py_ide_user');
    localStorage.removeItem('py_ide_last_proj');
    localStorage.removeItem('py_ide_token');
  };

  const getThemeClasses = (theme: string) => {
    switch (theme) {
      case 'vibrant-dark':
        return {
          wrapper: 'theme-vibrant-dark h-screen w-screen bg-slate-950 flex font-sans overflow-hidden text-slate-100',
          workspace: 'flex-1 flex flex-col min-w-0 relative h-full bg-slate-900 overflow-hidden',
          header: 'h-14 bg-slate-950 border-b border-slate-800/80 px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-none z-10 text-slate-100',
          headerTitle: 'text-slate-100',
          headerSub: 'text-slate-450 uppercase font-bold tracking-wider',
          projectBadge: 'bg-slate-900 border border-slate-800 text-slate-350',
          projectSubtext: 'text-slate-400',
          fileNameText: 'font-mono text-slate-250 truncate',
          btnSec: 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white',
          presetPanel: 'bg-slate-950 border-b border-slate-850 p-2 px-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0',
          presetTitle: 'text-slate-400',
          presetBtn: 'bg-slate-900 hover:bg-indigo-950/40 text-slate-300 hover:text-indigo-400 border-slate-800/80',
          editorCanvas: 'flex-1 overflow-hidden relative bg-[#090d16] flex flex-col p-2 sm:p-4',
          indicatorBox: 'bg-slate-950/95 border border-slate-850',
          userAvatar: 'bg-slate-800 border border-slate-705 text-slate-200'
        };
      case 'midnight-obsidian':
        return {
          wrapper: 'theme-obsidian h-screen w-screen bg-black flex font-sans overflow-hidden text-neutral-100',
          workspace: 'flex-1 flex flex-col min-w-0 relative h-full bg-[#080808] overflow-hidden',
          header: 'h-14 bg-black border-b border-neutral-900 px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-none z-10 text-neutral-100',
          headerTitle: 'text-neutral-100',
          headerSub: 'text-neutral-500 uppercase font-bold tracking-wider',
          projectBadge: 'bg-black border border-neutral-900 text-neutral-400',
          projectSubtext: 'text-neutral-500',
          fileNameText: 'font-mono text-neutral-200 truncate',
          btnSec: 'bg-neutral-955 hover:bg-neutral-900 text-neutral-300 border-neutral-900 hover:text-white',
          presetPanel: 'bg-neutral-955 border-b border-neutral-900 p-2 px-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0',
          presetTitle: 'text-neutral-400',
          presetBtn: 'bg-neutral-955 hover:bg-neutral-900 text-neutral-300 hover:text-white border-neutral-900',
          editorCanvas: 'flex-1 overflow-hidden relative bg-black flex flex-col p-2 sm:p-4',
          indicatorBox: 'bg-black/95 border border-neutral-900',
          userAvatar: 'bg-neutral-900 border border-neutral-800 text-neutral-355'
        };
      case 'light':
      default:
        return {
          wrapper: 'theme-light h-screen w-screen bg-slate-100 flex font-sans overflow-hidden text-slate-900',
          workspace: 'flex-1 flex flex-col min-w-0 relative h-full bg-white overflow-hidden',
          header: 'h-14 bg-white border-b border-slate-300 px-3 sm:px-6 flex items-center justify-between select-none shrink-0 shadow-sm z-10 text-slate-900',
          headerTitle: 'text-slate-900',
          headerSub: 'text-[9px] text-slate-500 font-bold uppercase tracking-wider',
          projectBadge: 'bg-slate-100 border border-slate-300 text-slate-700',
          projectSubtext: 'text-slate-600',
          fileNameText: 'font-mono text-slate-800 truncate',
          btnSec: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 hover:text-slate-900 shadow-sm',
          presetPanel: 'bg-white border-b border-slate-300 p-2 px-3 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shrink-0',
          presetTitle: 'text-xs text-slate-600 font-bold uppercase tracking-wider',
          presetBtn: 'bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 border border-slate-300 shadow-sm',
          editorCanvas: 'flex-1 overflow-hidden relative bg-white flex flex-col p-2 sm:p-4',
          indicatorBox: 'bg-slate-100 border border-slate-300 text-slate-600',
          userAvatar: 'bg-indigo-100 border border-indigo-300 text-indigo-800'
        };
    }
  };

  const handleLoginSuccess = (data: any) => {
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
    return <AuthScreen onLoginSuccess={handleLoginSuccess} adminExists={adminExists} />;
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
          if (found && found.type === 'script') {
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
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onLogout={handleLogout}
        isOpenOnMobile={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        activeTheme={activeTheme}
        onOpenPackageManager={() => setShowPackageManager(true)}
        packageUpdateCount={packageUpdates.dismissed ? 0 : packageUpdates.outdated.length}
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
            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white hidden sm:block">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="flex flex-col hidden sm:flex">
                <h1 className={`text-sm font-bold ${activeTheme === 'light' ? 'text-slate-800' : 'text-slate-100'} leading-tight`}>PyCloud IDE</h1>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">v2.4.0 • Enterprise Edition</p>
              </div>
            </div>
            
            <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block"></div>
            
            {/* Desktop Full Breadcrumbs */}
            <div className={`hidden lg:flex items-center gap-1.5 px-2 py-1 ${t.projectBadge} rounded text-xs font-semibold max-w-[150px] lg:max-w-[260px] xl:max-w-[360px] min-w-0 shrink`}>
              <Folder className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className={`truncate ${t.projectSubtext} font-medium max-w-[60px] lg:max-w-[120px]`}>
                {currentProject ? currentProject.name : tl('noProjectLabel')}
              </span>
              <span className="text-slate-300 shrink-0">/</span>
              <span className={`truncate max-w-[70px] lg:max-w-[120px] ${t.fileNameText}`}>
                {currentFile ? currentFile.filename : tl('noFileLabel')}
              </span>
            </div>

            {/* Mobile Compact File badge */}
            <div className="flex items-center gap-1.5 lg:hidden min-w-0 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded px-2 py-0.5 select-none shrink">
              <FileCode className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className={`font-mono text-[11px] font-bold truncate max-w-[80px] sm:max-w-[150px] ${
                activeTheme === 'light' ? 'text-slate-800' : 'text-slate-200'
              }`}>
                {currentFile ? currentFile.filename : tl('noFileLabel')}
              </span>
            </div>
          </div>

          {/* Compile, Run & responsive options dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop Only Service Status */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1 hidden xl:flex shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-medium text-slate-605">{tl('serviceActive')}</span>
            </div>

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

            {/* Beautiful Run button: highly responsive (compact text on mobile, full label on tablets/desktops) */}
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
                <Palette className="h-3.5 w-3.5 text-indigo-505 shrink-0" />
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
                        ? 'bg-white border-slate-200 text-slate-850'
                        : activeTheme === 'vibrant-dark'
                        ? 'bg-slate-950 border-slate-850 text-slate-100'
                        : 'bg-black border-neutral-850 text-neutral-100'
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
                            : 'hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-900 text-slate-300'
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
                            : 'hover:bg-slate-100 text-slate-700 dark:hover:bg-[#131b2e] text-slate-300'
                        }`}
                        id="theme-opt-vibrant-dark"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 rounded-full border border-indigo-500/20 bg-slate-900" />
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
                            : 'hover:bg-slate-100 text-slate-700 dark:hover:bg-neutral-900 text-slate-305'
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
                        ? 'bg-white border-slate-200 text-slate-850'
                        : activeTheme === 'vibrant-dark'
                        ? 'bg-slate-950 border-slate-850 text-slate-105'
                        : 'bg-black border-neutral-850 text-neutral-100'
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
                            className={`px-1.5 py-1 text-[10px] font-bold rounded text-center border ${
                              activeTheme === 'light'
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-slate-100/50 border-transparent text-slate-500'
                            }`}
                          >
                            {tl('themeLight')}
                          </button>
                          <button
                            onClick={() => {
                              setActiveTheme('vibrant-dark');
                              setShowMobileOptions(false);
                            }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded text-center border ${
                              activeTheme === 'vibrant-dark'
                                ? 'bg-indigo-950/50 border-indigo-800 text-indigo-300'
                                : 'bg-slate-900/40 border-transparent text-slate-400'
                            }`}
                          >
                            {tl('themeSlate')}
                          </button>
                          <button
                            onClick={() => {
                              setActiveTheme('midnight-obsidian');
                              setShowMobileOptions(false);
                            }}
                            className={`px-1.5 py-1 text-[10px] font-bold rounded text-center border ${
                              activeTheme === 'midnight-obsidian'
                                ? 'bg-neutral-800 border-neutral-600 text-white'
                                : 'bg-neutral-900/40 border-transparent text-neutral-400'
                            }`}
                          >
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

            {/* Desktop Only user avatar */}
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0 shadow-xs hidden md:flex">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
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
                <CodeMirror
                  value={code}
                  height="100%"
                  theme={activeTheme === 'light' ? 'light' : 'dark'}
                  extensions={[
                    python(),
                    EditorView.lineWrapping,
                    indentUnit.of(' '.repeat(userSettings.indentation))
                  ]}
                  onChange={(val) => {
                    setCode(val);
                    // Automatic debounce-like quick save physically
                    const timer = setTimeout(() => handleSaveFile(val), 1000);
                    return () => clearTimeout(timer);
                  }}
                  onCreateEditor={(view) => {
                    editorRef.current = view;
                  }}
                  className={`h-full rounded-xl overflow-hidden shadow-lg font-mono text-[13px] sm:text-[14px] ${
                    activeTheme === 'light' ? 'border border-slate-300' : 'border border-slate-800/80'
                  }`}
                  id="react-codemirror-editor"
                />
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

        {/* Floating Toggle button if console output completed and closed */}
        {!isConsoleOpen && executionResult && (
          <button
            onClick={() => setIsConsoleOpen(true)}
            className="absolute bottom-4 right-4 z-20 h-10 w-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all border border-indigo-400/40"
            title={tl('openTerminal')}
            id="floating-btn-open-console"
          >
            <Terminal className="h-5 w-5" />
          </button>
        )}

        {/* 3. Sliding lower Console Sheet panel */}
        <ConsoleSheet
          result={executionResult}
          isOpen={isConsoleOpen}
          onClose={() => setIsConsoleOpen(false)}
          onClear={() => setExecutionResult(null)}
          isExpanded={isConsoleExpanded}
          onToggleExpand={() => setIsConsoleExpanded(!isConsoleExpanded)}
          isRunning={isRunning}
          projectId={currentProject?.id ?? ''}
          token={localStorage.getItem('py_ide_token') ?? ''}
        />

        {/* Settings Modal */}
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          userId={user.id}
          userRole={user.role}
          userSettings={userSettings}
          onSettingsSaved={(settings) => {
            setUserSettings(settings);
            setLang(settings.language);
          }}
        />

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
  const [lang, setLang] = React.useState<'es' | 'en'>(
    (localStorage.getItem('py_ide_lang') as 'es' | 'en') || 'es'
  );
  const handleSetLang = (l: 'es' | 'en') => {
    localStorage.setItem('py_ide_lang', l);
    setLang(l);
  };

  return (
    <LanguageProvider lang={lang} setLang={handleSetLang}>
      <AppContent />
    </LanguageProvider>
  );
}
