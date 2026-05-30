import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Folder, 
  FileCode, 
  Database, 
  Trash2, 
  Upload, 
  X, 
  FolderPlus, 
  ChevronRight, 
  FileText,
  User,
  LogOut,
  Sparkles,
  Package
} from 'lucide-react';
import { Project, FileItem } from '../types';

interface SidebarProps {
  user: { username: string; email: string; id: string };
  projects: Project[];
  currentProject: Project | null;
  files: FileItem[];
  currentFileId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (filename: string) => void;
  onDeleteFile: (fileId: string) => void;
  onUploadDataset: (file: File) => void;
  onLogout: () => void;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  activeTheme?: 'light' | 'vibrant-dark' | 'midnight-obsidian';
  onOpenPackageManager?: () => void;
  packageUpdateCount?: number;
}

const getThemeSidebarClasses = (theme: 'light' | 'vibrant-dark' | 'midnight-obsidian') => {
  switch (theme) {
    case 'vibrant-dark':
      return {
        aside: 'bg-slate-900 border-r border-slate-800 text-slate-300',
        header: 'bg-slate-950 border-b border-slate-850 shadow-none',
        headerText: 'text-slate-100',
        subText: 'text-slate-500',
        logoutHover: 'text-slate-400 hover:text-red-400 hover:bg-slate-800',
        activeProjBox: 'border-b border-slate-850 bg-slate-900/60',
        dropdown: 'bg-slate-950 border border-slate-800 text-slate-300 focus:ring-indigo-505',
        buttonSec: 'border border-slate-800 hover:bg-slate-800 text-indigo-400 bg-slate-950 shadow-none',
        buttonDel: 'border border-red-955 text-red-500 hover:bg-red-950/20 bg-slate-955 shadow-none',
        input: 'bg-slate-950 border border-slate-800 text-slate-150 placeholder-slate-650',
        scriptForm: 'bg-slate-955/40 border border-slate-800',
        scriptActive: 'bg-indigo-955/40 text-indigo-300 font-bold border-l-2 border-indigo-500 shadow-none',
        scriptInactive: 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-l-2 border-transparent',
        datasetInactive: 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-150',
        uploadBox: 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/10 text-slate-500',
        progressText: 'text-slate-400',
        resPanel: 'border-t border-slate-805 bg-slate-950/50',
        resLabel: 'text-slate-500',
        barBg: 'bg-slate-800'
      };
    case 'midnight-obsidian':
      return {
        aside: 'bg-neutral-950 border-r border-neutral-900 text-neutral-300',
        header: 'bg-black border-b border-neutral-900 shadow-none',
        headerText: 'text-neutral-100',
        subText: 'text-neutral-500',
        logoutHover: 'text-neutral-450 hover:text-red-500 hover:bg-neutral-900',
        activeProjBox: 'border-b border-neutral-900 bg-black',
        dropdown: 'bg-neutral-950 border border-neutral-900 text-neutral-300 focus:ring-indigo-505',
        buttonSec: 'border border-neutral-900 hover:bg-neutral-900 text-indigo-500 bg-black shadow-none',
        buttonDel: 'border border-red-955 text-red-500 hover:bg-red-950/20 bg-black shadow-none',
        input: 'bg-[#080808] border border-neutral-900 text-neutral-100 placeholder-neutral-600',
        scriptForm: 'bg-black border border-neutral-900',
        scriptActive: 'bg-neutral-900 text-white font-bold border-l-2 border-indigo-600 shadow-none',
        scriptInactive: 'hover:bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border-l-2 border-transparent',
        datasetInactive: 'hover:bg-neutral-900/55 text-neutral-400 hover:text-neutral-100',
        uploadBox: 'border-neutral-900 hover:border-neutral-800 hover:bg-neutral-905/40 text-neutral-500',
        progressText: 'text-neutral-550',
        resPanel: 'border-t border-neutral-900 bg-black',
        resLabel: 'text-neutral-550',
        barBg: 'bg-neutral-900'
      };
    case 'light':
    default:
      return {
        aside: 'bg-slate-50 border-r border-slate-200 text-slate-700',
        header: 'bg-white border-b border-slate-200 shadow-xs',
        headerText: 'text-slate-800',
        subText: 'text-slate-400',
        logoutHover: 'text-slate-400 hover:text-red-500 hover:bg-slate-100 border border-transparent hover:border-slate-200',
        activeProjBox: 'border-b border-slate-200 bg-white',
        dropdown: 'bg-slate-50 border-slate-200 text-slate-700 focus:ring-indigo-500',
        buttonSec: 'border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 text-indigo-500 bg-white shadow-xs',
        buttonDel: 'border border-red-200/50 text-red-500 hover:bg-red-50 bg-white shadow-xs',
        input: 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400',
        scriptForm: 'bg-white border-slate-200/80',
        scriptActive: 'bg-indigo-50 text-indigo-700 font-bold border-l-2 border-indigo-600 shadow-xs',
        scriptInactive: 'hover:bg-slate-200/50 text-slate-650 hover:text-slate-900 border-l-2 border-transparent',
        datasetInactive: 'hover:bg-slate-200/50 text-slate-600 hover:text-slate-950',
        uploadBox: 'border-slate-300 hover:border-slate-400 hover:bg-slate-200/20 text-slate-500',
        progressText: 'text-slate-500',
        resPanel: 'border-t border-slate-200 bg-slate-100/90',
        resLabel: 'text-slate-400',
        barBg: 'bg-slate-200'
      };
  }
};

export default function Sidebar({
  user,
  projects,
  currentProject,
  files,
  currentFileId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onUploadDataset,
  onLogout,
  isOpenOnMobile,
  onCloseMobile,
  activeTheme = 'light',
  onOpenPackageManager,
  packageUpdateCount = 0
}: SidebarProps) {
  const [newProjName, setNewProjName] = useState('');
  const [showNewProjInput, setShowNewProjInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [metrics, setMetrics] = useState({
    memUsed: 0,
    memTotal: 1,
    cpuPercent: 0,
    gpuAvailable: false,
    gpuPercent: 0,
    gpuMemUsed: 0,
    gpuMemTotal: 1
  });

  const s = getThemeSidebarClasses(activeTheme);

  // Fetch metrics every 5 seconds
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const response = await fetch('/api/metrics');
        if (response.ok) {
          const data = await response.json();
          setMetrics(data);
        }
      } catch (err) {
        // Silently fail if metrics endpoint is unavailable
      }
    };

    loadMetrics();
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateProjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjName.trim()) {
      onCreateProject(newProjName.trim());
      setNewProjName('');
      setShowNewProjInput(false);
    }
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = newFileName.trim();
    if (!name) return;
    
    // Auto-append .py if no extension given
    if (!name.includes('.')) {
      name += '.py';
    }

    onCreateFile(name);
    setNewFileName('');
    setShowNewFileInput(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setUploadProgress(true);
      await onUploadDataset(file);
      setUploadProgress(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadProgress(true);
      await onUploadDataset(file);
      setUploadProgress(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    const kbytes = bytes / 1024;
    if (kbytes < 1024) return `${kbytes.toFixed(1)} KB`;
    return `${(kbytes / 1024).toFixed(1)} MB`;
  };

  return (
    <>
      {/* Mobile Back-drop overlay (when Sidebar is shown as offcanvas) */}
      {isOpenOnMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          id="sidebar-backdrop"
        />
      )}

      {/* Primary Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-30 w-[280px] ${s.aside} flex flex-col transition-transform duration-300 transform lg:static lg:translate-x-0 ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="project-sidebar"
      >
        {/* Header containing current developer log */}
        <div className={`p-4 ${s.header} flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
              {user.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold ${s.headerText} truncate`}>{user.username}</p>
              <p className={`text-[10px] ${s.subText} truncate`}>{user.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            title="Cerrar sesión"
            className={`p-1.5 rounded-lg transition-colors border border-transparent ${s.logoutHover}`}
            id="logout-btn"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Project Selector section */}
        <div className={`p-4 ${s.activeProjBox}`}>
          <label className={`block text-[10px] ${s.subText} uppercase font-bold tracking-wider mb-2`}>
            Proyecto Activo
          </label>
          <div className="flex flex-col gap-2">
            <select
              value={currentProject?.id || ''}
              onChange={(e) => onSelectProject(e.target.value)}
              className={`w-full px-2 py-1.5 ${s.dropdown} rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 text-ellipsis overflow-hidden`}
              id="project-select-dropdown"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>

            <div className="flex gap-1.5 mt-0.5">
              <button
                onClick={() => setShowNewProjInput(!showNewProjInput)}
                className={`flex-1 py-1 px-2 ${s.buttonSec} rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-all`}
                id="btn-trigger-new-project"
              >
                <FolderPlus className="h-3.5 w-3.5" /> Nuevo Proyecto
              </button>
              {currentProject && (
                <button
                  onClick={() => {
                    if (confirm(`¿Estás seguro de eliminar el proyecto "${currentProject.name}"? Esto borrará sus archivos de forma irreversible.`)) {
                      onDeleteProject(currentProject.id);
                    }
                  }}
                  className={`p-1 px-2 ${s.buttonDel} rounded-md text-[11px] font-semibold flex items-center justify-center transition-all`}
                  title="Eliminar proyecto"
                  id="btn-delete-active-project"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {showNewProjInput && (
            <form onSubmit={handleCreateProjSubmit} className="mt-2.5 animate-fadeIn">
              <input
                type="text"
                required
                placeholder="Nombre del proyecto..."
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className={`w-full px-2 py-1 ${s.input} rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-505`}
                id="input-new-project-name"
              />
              <div className="flex justify-end gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => { setShowNewProjInput(false); setNewProjName(''); }}
                  className={`px-1.5 py-0.5 text-[10px] ${s.subText} hover:text-slate-600`}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-medium"
                >
                  Crear
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Directory details & Files list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
          {/* Main python scripts section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1`}>
                <FileCode className="h-3.5 w-3.5 text-indigo-500" /> Scripts (.py)
              </span>
              <button
                onClick={() => setShowNewFileInput(!showNewFileInput)}
                className="p-0.5 text-indigo-500 hover:bg-slate-200/80 rounded transition-colors"
                title="Nuevo script Python"
                id="btn-add-script-icon"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {showNewFileInput && (
              <form onSubmit={handleCreateFileSubmit} className={`mb-2 p-1.5 ${s.scriptForm} rounded-lg border`}>
                <input
                  type="text"
                  required
                  placeholder="ej. modelo.py"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-mono`}
                  id="input-new-script-name"
                />
                <div className="flex justify-end gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() => { setShowNewFileInput(false); setNewFileName(''); }}
                    className={`px-1 py-0.5 text-[9px] ${s.subText} hover:text-slate-600`}
                  >
                    Salir
                  </button>
                  <button
                    type="submit"
                    className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-medium"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1" id="scripts-list">
              {files.filter(f => f.type === 'script').map((f) => (
                <div
                  key={f.id}
                  className={`group flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${
                    currentFileId === f.id
                      ? s.scriptActive
                      : s.scriptInactive
                  }`}
                  onClick={() => onSelectFile(f.id)}
                  id={`file-item-${f.id}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${currentFileId === f.id ? 'rotate-90 text-indigo-600' : ''}`} />
                    <span className="font-mono truncate">{f.filename}</span>
                  </div>
                  {/* Delete script button */}
                  {f.filename !== 'main.py' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`¿Eliminar script "${f.filename}"?`)) {
                          onDeleteFile(f.id);
                        }
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 transition-all shrink-0"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {files.filter(f => f.type === 'script').length === 0 && (
                <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>No hay scripts creados.</p>
              )}
            </div>
          </div>

          {/* Datasets CSV, TXT, XLSX, XLS, JSON, Parquet, LOG files section */}
          <div>
            <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2`}>
              <Database className="h-3.5 w-3.5 text-emerald-600" /> Datasets
            </span>

            <div className="space-y-1 mb-3" id="datasets-list">
              {files.filter(f => f.type === 'dataset').map((f) => (
                <div
                  key={f.id}
                  className={`group flex items-center justify-between p-1.5 rounded-lg text-xs ${s.datasetInactive}`}
                  id={`dataset-item-${f.id}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span className="font-mono truncate font-medium" title={f.filename}>{f.filename}</span>
                    <span className={`text-[9px] ${s.subText} shrink-0 font-mono`}>({formatSize(f.size)})</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar dataset "${f.filename}"?`)) {
                        onDeleteFile(f.id);
                      }
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-slate-150 rounded transition-all shrink-0"
                    title="Eliminar dataset"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {files.filter(f => f.type === 'dataset').length === 0 && (
                <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>Sin datasets subidos.</p>
              )}
            </div>

            {/* Drag and Drop Box for uploads */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed p-3 text-center rounded-xl transition-all cursor-pointer select-none relative ${
                dragging
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : s.uploadBox
              }`}
              id="upload-drag-drop-zone"
            >
              <input
                type="file"
                accept=".csv,.txt,.xlsx,.xls,.json,.parquet,.log"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                id="file-upload-raw-input"
              />
              {uploadProgress ? (
                <div className="flex flex-col items-center justify-center p-1.5 gap-1.5">
                  <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className={`text-[10px] font-semibold ${s.progressText}`}>Subiendo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload className="h-5 w-5 text-slate-400 animate-bounce" />
                  <div>
                    <p className="text-[11px] font-bold">Sube Datasets</p>
                    <p className={`text-[9px] ${s.subText}`}>Arrastra o haz click aquí</p>
                    <p className={`text-[8px] ${s.subText} mt-0.5`}>.csv, .txt, .xlsx, .xls, .json, .parquet, .log</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Entorno Python & Pip libraries section */}
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/40 animate-fadeIn">
            <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2`}>
              <Package className="h-3.5 w-3.5 text-indigo-500" /> Entorno Python (.venv)
            </span>
            <button
              onClick={onOpenPackageManager}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all group scale-100 active:scale-[0.98] ${
                activeTheme === 'light'
                  ? 'bg-indigo-50/40 border-indigo-100 text-indigo-700 hover:bg-indigo-50'
                  : activeTheme === 'vibrant-dark'
                  ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-300 hover:bg-indigo-950/30'
                  : 'bg-[#0a0a0c] border-indigo-950 text-indigo-300 hover:bg-neutral-900'
              }`}
              id="sidebar-pip-packages-trigger"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded bg-indigo-600 text-white shrink-0 relative">
                  <Package className="h-3.5 w-3.5" />
                  {packageUpdateCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                      {packageUpdateCount > 9 ? '9+' : packageUpdateCount}
                    </span>
                  )}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-bold truncate">Librerías & Dependencias</p>
                  <p className={`text-[9px] ${s.subText} mt-0.5 truncate`}>
                    {packageUpdateCount > 0
                      ? `${packageUpdateCount} actualización${packageUpdateCount > 1 ? 'es' : ''} disponible${packageUpdateCount > 1 ? 's' : ''}`
                      : 'Instalar y administrar con pip'
                    }
                  </p>
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-indigo-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* Container performance metrics panel */}
        <div className={`mt-auto p-4 border-t ${s.resPanel} select-none`}>
          <div className={`text-[10px] font-bold ${s.resLabel} uppercase tracking-widest mb-2 flex items-center gap-1`}>
            <Sparkles className="h-3 w-3 text-indigo-500" /> Rendimiento del Contenedor
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className={`flex justify-between text-[10px] ${s.resLabel} font-medium`}>
                <span>RAM</span>
                <span>{(metrics.memUsed / 1e9).toFixed(1)} GB / {(metrics.memTotal / 1e9).toFixed(1)} GB</span>
              </div>
              <div className={`w-full ${s.barBg} h-1 rounded-full overflow-hidden`}>
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (metrics.memUsed / metrics.memTotal) * 100).toFixed(0)}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-1">
              <div className={`flex justify-between text-[10px] ${s.resLabel} font-medium`}>
                <span>CPU</span>
                <span>{metrics.cpuPercent.toFixed(1)}%</span>
              </div>
              <div className={`w-full ${s.barBg} h-1 rounded-full overflow-hidden`}>
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${metrics.cpuPercent.toFixed(0)}%` }}
                ></div>
              </div>
            </div>
            {metrics.gpuAvailable && (
              <div className="space-y-1">
                <div className={`flex justify-between text-[10px] ${s.resLabel} font-medium`}>
                  <span>GPU</span>
                  <span>{metrics.gpuPercent.toFixed(1)}% • {(metrics.gpuMemUsed / 1e9).toFixed(1)}GB / {(metrics.gpuMemTotal / 1e9).toFixed(1)}GB</span>
                </div>
                <div className={`w-full ${s.barBg} h-1 rounded-full overflow-hidden`}>
                  <div
                    className="bg-purple-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${metrics.gpuPercent.toFixed(0)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
