import React, { useState, useEffect, useRef } from 'react';
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
  Package,
  Pencil,
  Eye,
  Clipboard,
  Check,
  FolderInput,
  Lock
} from 'lucide-react';
import { FileOutput, Download, Eraser } from 'lucide-react';
import { Project, FileItem, OutputFile } from '../types';
import { useT } from '../i18n';
import MoveFileModal from './MoveFileModal';

// The set of valid move destinations for a file: project root ('') plus every
// folder in its tree, excluding the folder it's already in. Used to decide
// whether the "move" button should render at all (hidden when there's nowhere
// else to move the file) and to populate the MoveFileModal's folder tree.
const getMoveTargets = (file: FileItem, folderList: string[]) => {
  const current = file.folder || '';
  return ['', ...folderList].filter(f => f !== current);
};

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
  folders: string[];
  onUploadDataset: (file: File) => void;
  onUploadScript: (file: File, folder?: string) => void;
  onCreateFolder: (folderName: string) => void;
  onCreateFileInFolder: (filename: string, folder: string) => void;
  onRenameFile: (fileId: string, newFilename: string) => void;
  onMoveFile: (fileId: string, targetFolder: string | null) => void;
  onRenameFolder: (oldPath: string, newPath: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onLogout: () => void;
  isOpenOnMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedOnDesktop?: boolean;
  activeTheme?: 'light' | 'vibrant-dark' | 'midnight-obsidian';
  onOpenPackageManager?: () => void;
  packageUpdateCount?: number;
  onPreviewDataset?: (file: FileItem) => void;
  secretKeys?: string[];
  secretError?: string | null;
  onSaveSecret?: (key: string, value: string) => void;
  onDeleteSecret?: (key: string) => void;
  outputFiles?: OutputFile[];
  onPreviewOutput?: (file: OutputFile) => void;
  onClearOutput?: () => void;
}

const getThemeSidebarClasses = (theme: 'light' | 'vibrant-dark' | 'midnight-obsidian') => {
  switch (theme) {
    case 'vibrant-dark':
      return {
        aside: 'bg-slate-900 border-r border-slate-700 text-slate-300',
        header: 'bg-slate-950 border-b border-slate-800 shadow-none',
        headerText: 'text-slate-100',
        subText: 'text-slate-400',
        logoutHover: 'text-slate-400 hover:text-red-400 hover:bg-slate-800',
        activeProjBox: 'border-b border-slate-800 bg-slate-900/60',
        dropdown: 'bg-slate-950 border border-slate-700 text-slate-300 focus:ring-indigo-500',
        buttonSec: 'border border-slate-700 hover:bg-slate-800 text-indigo-400 bg-slate-950 shadow-none',
        buttonDel: 'border border-red-900 text-red-500 hover:bg-red-950/20 bg-slate-950 shadow-none',
        input: 'bg-slate-950 border border-slate-700 text-slate-200 placeholder-slate-600',
        scriptForm: 'bg-slate-950/40 border border-slate-700',
        scriptActive: 'bg-indigo-950/40 text-indigo-300 font-bold border-l-2 border-indigo-500 shadow-none',
        scriptInactive: 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 border-l-2 border-transparent',
        datasetInactive: 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200',
        uploadBox: 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/10 text-slate-500',
        progressText: 'text-slate-400',
        resPanel: 'border-t border-slate-800 bg-slate-950/50',
        resLabel: 'text-slate-500',
        barBg: 'bg-slate-800'
      };
    case 'midnight-obsidian':
      return {
        aside: 'bg-neutral-950 border-r border-neutral-800 text-neutral-300',
        header: 'bg-black border-b border-neutral-800 shadow-none',
        headerText: 'text-neutral-100',
        subText: 'text-neutral-500',
        logoutHover: 'text-neutral-400 hover:text-red-500 hover:bg-neutral-900',
        activeProjBox: 'border-b border-neutral-800 bg-black',
        dropdown: 'bg-neutral-950 border border-neutral-800 text-neutral-300 focus:ring-indigo-500',
        buttonSec: 'border border-neutral-800 hover:bg-neutral-900 text-indigo-500 bg-black shadow-none',
        buttonDel: 'border border-red-900 text-red-500 hover:bg-red-950/20 bg-black shadow-none',
        input: 'bg-[#080808] border border-neutral-800 text-neutral-100 placeholder-neutral-600',
        scriptForm: 'bg-black border border-neutral-800',
        scriptActive: 'bg-neutral-900 text-white font-bold border-l-2 border-indigo-600 shadow-none',
        scriptInactive: 'hover:bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border-l-2 border-transparent',
        datasetInactive: 'hover:bg-neutral-900/50 text-neutral-400 hover:text-neutral-100',
        uploadBox: 'border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/40 text-neutral-500',
        progressText: 'text-neutral-500',
        resPanel: 'border-t border-neutral-800 bg-black',
        resLabel: 'text-neutral-500',
        barBg: 'bg-neutral-900'
      };
    case 'light':
    default:
      return {
        aside: 'bg-slate-50 border-r border-slate-300 text-slate-700',
        header: 'bg-white border-b border-slate-300 shadow-sm',
        headerText: 'text-slate-800',
        subText: 'text-slate-500',
        logoutHover: 'text-slate-500 hover:text-red-500 hover:bg-slate-100 border border-transparent hover:border-slate-200',
        activeProjBox: 'border-b border-slate-300 bg-white',
        dropdown: 'bg-white border-slate-300 text-slate-700 focus:ring-indigo-500',
        buttonSec: 'border border-slate-300 hover:bg-slate-50 hover:text-indigo-600 text-indigo-500 bg-white shadow-xs',
        buttonDel: 'border border-red-200 text-red-500 hover:bg-red-50 bg-white shadow-xs',
        input: 'bg-white border-slate-300 text-slate-800 placeholder-slate-400',
        scriptForm: 'bg-slate-50 border-slate-300',
        scriptActive: 'bg-indigo-50 text-indigo-700 font-bold border-l-2 border-indigo-600 shadow-xs',
        scriptInactive: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900 border-l-2 border-transparent',
        datasetInactive: 'hover:bg-slate-100 text-slate-600 hover:text-slate-900',
        uploadBox: 'border-slate-300 hover:border-slate-400 hover:bg-slate-100/50 text-slate-500',
        progressText: 'text-slate-500',
        resPanel: 'border-t border-slate-300 bg-slate-100',
        resLabel: 'text-slate-500',
        barBg: 'bg-slate-200'
      };
  }
};

// ---------------------------------------------------------------------------
// "Mis documentos" — dedicated section for markdown (.md) docs with its own
// collapsible folder tree. Kept separate from the Scripts (.py) tree: folders
// are derived from doc files + session-created empty folders (same ephemeral
// semantics the Scripts tree already has). Enforces max 2 levels / 6 folders
// per level in the UI, and blocks folder-name collisions across sections.
// ---------------------------------------------------------------------------
const MAX_FOLDERS_PER_LEVEL = 6;

interface DocsSectionProps {
  files: FileItem[];
  currentFileId: string | null;
  activeTheme: 'light' | 'vibrant-dark' | 'midnight-obsidian';
  allFolders: string[];
  onSelectFile: (fileId: string) => void;
  onCreateFile: (filename: string) => void;
  onCreateFileInFolder: (filename: string, folder: string) => void;
  onCreateFolder: (folderName: string) => void;
  onRenameFile: (fileId: string, newFilename: string) => void;
  onRenameFolder: (oldPath: string, newPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderPath: string) => void;
  onUpload: (file: File, folder?: string) => void | Promise<void>;
  onRequestMoveFile: (file: FileItem, folders: string[]) => void;
}

function DocsSection({
  files,
  currentFileId,
  activeTheme,
  allFolders,
  onSelectFile,
  onCreateFile,
  onCreateFileInFolder,
  onCreateFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  onUpload,
  onRequestMoveFile,
}: DocsSectionProps) {
  const t = useT();
  const s = getThemeSidebarClasses(activeTheme);

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [sessionFolders, setSessionFolders] = useState<Set<string>>(new Set());
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadProgress(true);
    await onUpload(file, activeFolder ?? undefined);
    setUploadProgress(false);
    e.target.value = '';
  };

  const docFiles = files.filter(f => f.type === 'doc');
  const treeFolders = [...new Set([
    ...docFiles.filter(f => f.folder).map(f => f.folder!),
    ...sessionFolders,
  ])];
  const rootFolders = [...new Set(treeFolders.map(f => f.split('/')[0]))];
  const subFoldersOf = (folder: string) =>
    [...new Set(treeFolders.filter(p => p.startsWith(`${folder}/`)))];

  // Folder creation gating: root/level-1 capped at 6, level-2 can't nest deeper.
  const atDepthLimit = !!activeFolder && activeFolder.includes('/');
  const atCountLimit = activeFolder
    ? !activeFolder.includes('/') && subFoldersOf(activeFolder).length >= MAX_FOLDERS_PER_LEVEL
    : rootFolders.length >= MAX_FOLDERS_PER_LEVEL;
  const folderCreateBlocked = atDepthLimit || atCountLimit;
  const folderBtnTitle = atDepthLimit
    ? t('folderDepthReached')
    : atCountLimit
      ? t('folderLimitReached')
      : activeFolder
        ? t('newDocFolderInFolderTooltip', { folder: activeFolder })
        : t('newDocFolderTooltip');

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  const handleCreateFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let name = newFileName.trim();
    if (!name) return;
    if (!name.includes('.')) name += '.md';
    else if (!name.endsWith('.md')) { alert(t('docSectionOnlyMd')); return; }
    if (activeFolder) onCreateFileInFolder(name, activeFolder);
    else onCreateFile(name);
    setNewFileName('');
    setShowNewFileInput(false);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const fullPath = activeFolder ? `${activeFolder}/${name}` : name;
    const existing = new Set([...allFolders, ...treeFolders]);
    if (existing.has(fullPath)) { alert(t('folderNameTaken')); return; }
    onCreateFolder(fullPath);
    setSessionFolders(prev => new Set(prev).add(fullPath));
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleRenameSubmit = (e: React.FormEvent, type: 'file' | 'folder', id: string, originalName: string) => {
    e.preventDefault();
    const val = renameValue.trim();
    if (!val || val === originalName) { setRenamingId(null); return; }
    if (type === 'file') {
      const name = val.includes('.') ? val : val + '.md';
      onRenameFile(id, name);
    } else {
      const parentPrefix = id.includes('/') ? id.substring(0, id.lastIndexOf('/') + 1) : '';
      const newPath = parentPrefix + val;
      onRenameFolder(id, newPath);
      setSessionFolders(prev => {
        const next = new Set<string>();
        prev.forEach(p => {
          if (p === id) next.add(newPath);
          else if (p.startsWith(`${id}/`)) next.add(newPath + p.slice(id.length));
          else next.add(p);
        });
        return next;
      });
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const removeFolder = (folderPath: string) => {
    onDeleteFolder(folderPath);
    setSessionFolders(prev => {
      const next = new Set<string>();
      prev.forEach(p => {
        if (p !== folderPath && !p.startsWith(`${folderPath}/`)) next.add(p);
      });
      return next;
    });
    setConfirmDeleteFolder(null);
    if (activeFolder === folderPath || activeFolder?.startsWith(`${folderPath}/`)) setActiveFolder(null);
  };

  const renderFile = (f: FileItem, folderContext: string | null) => (
    <div key={f.id} id={`doc-item-${f.id}`}>
      {renamingId === f.id ? (
        <form onSubmit={(e) => handleRenameSubmit(e, 'file', f.id, f.filename)}
          className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
          <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
            onBlur={(e) => handleRenameSubmit(e as any, 'file', f.id, f.filename)}
            className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
          <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
        </form>
      ) : (
        <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${currentFileId === f.id ? s.scriptActive : s.scriptInactive}`}
          onClick={() => { onSelectFile(f.id); setActiveFolder(folderContext); }}>
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className={`h-3 w-3 shrink-0 transition-colors ${currentFileId === f.id ? 'text-indigo-500' : 'text-slate-400'}`} />
            <span className="font-mono truncate">{f.filename}</span>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={(e) => { e.stopPropagation(); setRenamingId(f.id); setRenameValue(f.filename); }}
              className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameTooltip')}>
              <Pencil className="h-2.5 w-2.5" />
            </button>
            {getMoveTargets(f, treeFolders).length > 0 && (
              <button onClick={(e) => { e.stopPropagation(); onRequestMoveFile(f, treeFolders); }}
                className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors" title={t('moveTooltip')}>
                <FolderInput className="h-2.5 w-2.5" />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id); }}
              className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteTooltip')}>
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}
      {confirmDeleteId === f.id && (
        <div className={`mx-1 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
          <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteFileConfirm', { name: f.filename })}</span>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => { onDeleteFile(f.id); setConfirmDeleteId(null); }}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-colors">{t('confirmDeleteFolderYes')}</button>
            <button onClick={() => setConfirmDeleteId(null)}
              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>{t('confirmDeleteFolderNo')}</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Header: label + new folder + new document buttons */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5`}>
          <FileText className="h-3.5 w-3.5 text-amber-500" /> {t('docsSectionLabel')}
        </span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => docUploadRef.current?.click()}
            className="p-2 text-amber-500 hover:bg-slate-200/80 rounded transition-colors"
            title={activeFolder ? t('uploadDocInFolderTooltip', { folder: activeFolder }) : t('uploadDocTooltip')}>
            <Upload className="h-4 w-4" />
          </button>
          <input ref={docUploadRef} type="file" accept=".md" onChange={handleDocUpload} className="hidden" />
          <button type="button" disabled={folderCreateBlocked}
            onClick={() => { if (!folderCreateBlocked) { setShowNewFolderInput(v => !v); setShowNewFileInput(false); } }}
            className={`p-2 rounded transition-colors ${folderCreateBlocked ? 'text-slate-300 opacity-40 cursor-not-allowed' : 'text-amber-500 hover:bg-slate-200/80'}`}
            title={folderBtnTitle}>
            <FolderPlus className="h-4 w-4" />
          </button>
          <button type="button"
            onClick={() => { setShowNewFileInput(v => !v); setShowNewFolderInput(false); }}
            className="p-2 text-indigo-500 hover:bg-slate-200/80 rounded transition-colors"
            title={activeFolder ? t('newDocInFolderTooltip', { folder: activeFolder }) : t('newDocTooltip')}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {uploadProgress && (
        <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded text-[10px] ${activeTheme === 'light' ? 'bg-amber-50 text-amber-600' : 'bg-amber-950/40 text-amber-300'}`}>
          <div className="h-3 w-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
          {t('uploadingDoc')}
        </div>
      )}

      {/* Active folder context badge */}
      {activeFolder && (
        <div className="flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
          <Folder className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="text-[10px] text-amber-600 font-mono truncate flex-1">{activeFolder}/</span>
          <button onClick={() => setActiveFolder(null)} className="text-amber-500 hover:text-amber-700 shrink-0">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {showNewFileInput && (
        <form onSubmit={handleCreateFileSubmit} className={`mb-2 p-1.5 ${s.scriptForm} rounded-lg border`}>
          <p className={`text-[9px] ${s.subText} mb-1`}>{activeFolder ? t('inFolder', { folder: activeFolder }) : t('inRoot')}</p>
          <input type="text" required placeholder={t('newDocInputPlaceholder')} autoFocus
            value={newFileName} onChange={(e) => setNewFileName(e.target.value)}
            className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
          <div className="flex justify-end gap-1 mt-1">
            <button type="button" onClick={() => { setShowNewFileInput(false); setNewFileName(''); }} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
            <button type="submit" className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
          </div>
        </form>
      )}

      {showNewFolderInput && !folderCreateBlocked && (
        <form onSubmit={handleCreateFolderSubmit} className={`mb-2 p-1.5 ${s.scriptForm} rounded-lg border`}>
          <p className={`text-[9px] ${s.subText} mb-1`}>{activeFolder ? t('inFolder', { folder: activeFolder }) : t('inRoot')}</p>
          <input type="text" required placeholder={t('newDocFolderInputPlaceholder')} autoFocus
            value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
            className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
          <div className="flex justify-end gap-1 mt-1">
            <button type="button" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
            <button type="submit" className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
          </div>
        </form>
      )}

      <div className="space-y-0.5" id="docs-list">
        {/* Root-level docs (no folder) */}
        {docFiles.filter(f => !f.folder).map(f => renderFile(f, null))}

        {/* Folders — top level */}
        {rootFolders.map(folder => {
          const isCollapsed = collapsedFolders.has(folder);
          const isActive = activeFolder === folder;
          const subfolders = subFoldersOf(folder);
          return (
            <div key={folder}>
              {renamingId === folder ? (
                <form onSubmit={(e) => handleRenameSubmit(e, 'folder', folder, folder.split('/').pop()!)}
                  className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                  <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                    onBlur={(e) => handleRenameSubmit(e as any, 'folder', folder, folder.split('/').pop()!)}
                    className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                  <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                </form>
              ) : (
                <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs select-none transition-all cursor-pointer ${isActive ? 'bg-amber-500/10 border border-amber-500/30' : s.scriptInactive}`}
                  onClick={() => { setActiveFolder(isActive ? null : folder); toggleFolder(folder); }}>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                    <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span className="font-mono truncate font-medium">{folder}/</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(folder); setRenameValue(folder.split('/').pop()!); }}
                      className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameFolderTooltip')}>
                      <Pencil className="h-2.5 w-2.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteFolder(folder); }}
                      className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteTooltip')}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}

              {confirmDeleteFolder === folder && (
                <div className={`ml-2 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                  <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteFolderWithContent', { name: folder })}</span>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => removeFolder(folder)}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded">{t('confirmDeleteFolderYes')}</button>
                    <button onClick={() => setConfirmDeleteFolder(null)}
                      className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>{t('confirmDeleteFolderNo')}</button>
                  </div>
                </div>
              )}

              {!isCollapsed && (
                <div className="ml-4 space-y-0.5">
                  {docFiles.filter(f => f.folder === folder).map(f => renderFile(f, folder))}

                  {/* Subfolders (level 2) */}
                  {subfolders.map(subPath => {
                    const isSubActive = activeFolder === subPath;
                    const isSubCollapsed = collapsedFolders.has(subPath);
                    return (
                      <div key={subPath}>
                        {renamingId === subPath ? (
                          <form onSubmit={(e) => handleRenameSubmit(e, 'folder', subPath, subPath.split('/').pop()!)}
                            className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                            <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                              onBlur={(e) => handleRenameSubmit(e as any, 'folder', subPath, subPath.split('/').pop()!)}
                              className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                            <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                          </form>
                        ) : (
                          <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs select-none transition-all cursor-pointer ${isSubActive ? 'bg-amber-500/10 border border-amber-500/30' : s.scriptInactive}`}
                            onClick={() => { setActiveFolder(isSubActive ? null : subPath); toggleFolder(subPath); }}>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${isSubCollapsed ? '' : 'rotate-90'}`} />
                              <Folder className="h-3 w-3 shrink-0 text-amber-400" />
                              <span className="font-mono truncate text-[10px]">{subPath.split('/')[1]}/</span>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setRenamingId(subPath); setRenameValue(subPath.split('/').pop()!); }}
                                className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameTooltip')}>
                                <Pencil className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteFolder(subPath); }}
                                className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteSubfolderTooltip')}>
                                <Trash2 className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {confirmDeleteFolder === subPath && (
                          <div className={`ml-2 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                            <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteFolderConfirmText', { name: subPath.split('/').pop()! })}</span>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => removeFolder(subPath)}
                                className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded">{t('confirmDeleteFolderYes')}</button>
                              <button onClick={() => setConfirmDeleteFolder(null)}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>{t('confirmDeleteFolderNo')}</button>
                            </div>
                          </div>
                        )}

                        {!isSubCollapsed && (
                          <div className="ml-4 space-y-0.5">
                            {docFiles.filter(f => f.folder === subPath).map(f => renderFile(f, subPath))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {docFiles.length === 0 && rootFolders.length === 0 && (
          <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>{t('noDocs')}</p>
        )}
      </div>
    </div>
  );
}

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
  folders,
  onUploadDataset,
  onUploadScript,
  onCreateFolder,
  onCreateFileInFolder,
  onRenameFile,
  onMoveFile,
  onRenameFolder,
  onDeleteFolder,
  onLogout,
  isOpenOnMobile,
  onCloseMobile,
  activeTheme = 'light',
  onOpenPackageManager,
  packageUpdateCount = 0,
  onPreviewDataset,
  secretKeys = [],
  secretError = null,
  onSaveSecret,
  onDeleteSecret,
  outputFiles = [],
  onPreviewOutput,
  onClearOutput,
  isCollapsedOnDesktop = false
}: SidebarProps) {
  const t = useT();
  const [newProjName, setNewProjName] = useState('');
  const [showNewProjInput, setShowNewProjInput] = useState(false);
  const scriptUploadRef = useRef<HTMLInputElement>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileInFolder, setNewFileInFolder] = useState<{ folder: string; name: string } | null>(null);
  const [newSubFolderFor, setNewSubFolderFor] = useState<{ parent: string; name: string } | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  // Empty script folders created this session (mirrors the doc tree's own
  // session set) so the Scripts tree renders only .py folders and never leaks
  // folders created in the "Mis documentos" section.
  const [scriptSessionFolders, setScriptSessionFolders] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [confirmDeleteSecretKey, setConfirmDeleteSecretKey] = useState<string | null>(null);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);
  const [copiedDataset, setCopiedDataset] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [movingFile, setMovingFile] = useState<{ file: FileItem; folders: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [scriptUploadProgress, setScriptUploadProgress] = useState(false);
  const [metrics, setMetrics] = useState({
    memUsed: 0,
    memTotal: 1,
    cpuPercent: 0,
  });

  const s = getThemeSidebarClasses(activeTheme);

  // Script folders derived from .py files + session-created empty folders,
  // so this tree stays independent from the "Mis documentos" folder tree.
  const scriptTreeFolders = [...new Set([
    ...files.filter(f => f.type === 'script' && f.folder).map(f => f.folder!),
    ...scriptSessionFolders,
  ])];

  // Fetch metrics every 5 seconds
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const token = localStorage.getItem('py_ide_token');
        const response = await fetch('/api/metrics', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
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
    if (!name.includes('.')) name += '.py';
    else if (!name.endsWith('.py')) { alert(t('scriptSectionOnlyPy')); return; }
    if (activeFolder) {
      onCreateFileInFolder(name, activeFolder);
    } else {
      onCreateFile(name);
    }
    setNewFileName('');
    setShowNewFileInput(false);
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;
    const fullName = activeFolder ? `${activeFolder}/${name}` : name;
    const existing = new Set([...folders, ...scriptTreeFolders]);
    if (existing.has(fullName)) { alert(t('folderNameTaken')); return; }
    onCreateFolder(fullName);
    setScriptSessionFolders(prev => new Set(prev).add(fullName));
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleRenameSubmit = (e: React.FormEvent, type: 'file' | 'folder', id: string, originalName: string) => {
    e.preventDefault();
    const val = renameValue.trim();
    if (!val || val === originalName) { setRenamingId(null); return; }
    if (type === 'file') {
      const name = val.includes('.') ? val : val + '.py';
      onRenameFile(id, name);
    } else {
      const parentPrefix = id.includes('/') ? id.substring(0, id.lastIndexOf('/') + 1) : '';
      const newPath = parentPrefix + val;
      onRenameFolder(id, newPath);
      setScriptSessionFolders(prev => {
        const next = new Set<string>();
        prev.forEach(p => {
          if (p === id) next.add(newPath);
          else if (p.startsWith(`${id}/`)) next.add(newPath + p.slice(id.length));
          else next.add(p);
        });
        return next;
      });
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const removeScriptFolder = (folderPath: string) => {
    onDeleteFolder(folderPath);
    setScriptSessionFolders(prev => {
      const next = new Set<string>();
      prev.forEach(p => { if (p !== folderPath && !p.startsWith(`${folderPath}/`)) next.add(p); });
      return next;
    });
  };

  const handleCreateFileInFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileInFolder) return;
    let name = newFileInFolder.name.trim();
    if (!name) return;
    if (!name.includes('.')) name += '.py';
    onCreateFileInFolder(name, newFileInFolder.folder);
    setNewFileInFolder(null);
  };

  const handleCreateSubFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubFolderFor) return;
    const name = newSubFolderFor.name.trim();
    if (!name) return;
    const fullPath = `${newSubFolderFor.parent}/${name}`;
    onCreateFolder(fullPath);
    setScriptSessionFolders(prev => new Set(prev).add(fullPath));
    setNewSubFolderFor(null);
  };

  const handleScriptUploadToFolder = async (e: React.ChangeEvent<HTMLInputElement>, folder: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setScriptUploadProgress(true);
    await onUploadScript(file, folder);
    setScriptUploadProgress(false);
    e.target.value = '';
  };

  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setScriptUploadProgress(true);
    await onUploadScript(file, activeFolder ?? undefined);
    setScriptUploadProgress(false);
    e.target.value = '';
  };

  const toggleFolder = (folder: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  const handleDatasetClick = (filename: string) => {
    setCopiedDataset(prev => prev === filename ? null : filename);
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
        className={`fixed top-0 bottom-0 left-0 z-30 w-[280px] ${s.aside} flex flex-col transition-all duration-300 transform lg:static lg:translate-x-0 ${
          isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'
        } ${
          isCollapsedOnDesktop
            ? 'lg:w-0 lg:min-w-0 lg:overflow-hidden lg:opacity-0 lg:pointer-events-none'
            : 'lg:w-[280px] lg:opacity-100'
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
            title={t('logoutTooltip')}
            className={`p-1.5 rounded-lg transition-colors border border-transparent ${s.logoutHover}`}
            id="logout-btn"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Project Selector section */}
        <div className={`p-4 ${s.activeProjBox}`}>
          <label className={`block text-[10px] ${s.subText} uppercase font-bold tracking-wider mb-2`}>
            {t('activeProjectLabel')}
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
                <FolderPlus className="h-3.5 w-3.5" /> {t('newProjectBtn')}
              </button>
              {currentProject && (
                <button
                  onClick={() => {
                    if (confirm(t('confirmDeleteProject', { name: currentProject.name }))) {
                      onDeleteProject(currentProject.id);
                    }
                  }}
                  className={`p-1 px-2 ${s.buttonDel} rounded-md text-[11px] font-semibold flex items-center justify-center transition-all`}
                  title={t('deleteProjectTooltip')}
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
                placeholder={t('projectName') + '...'}
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className={`w-full px-2 py-1 ${s.input} rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                id="input-new-project-name"
              />
              <div className="flex justify-end gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => { setShowNewProjInput(false); setNewProjName(''); }}
                  className={`px-1.5 py-0.5 text-[10px] ${s.subText} hover:text-slate-600`}
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-medium"
                >
                  {t('createBtn')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Directory details & Files list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 select-none">
          {/* Main python scripts section */}
          <div>
            {/* Header: buttons + active context indicator */}
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1`}>
                <FileCode className="h-3.5 w-3.5 text-indigo-500" /> {t('scriptsSectionLabel')}
              </span>
              <div className="flex items-center gap-1.5">
                {/* Upload button — triggers a hidden file input to avoid transparent overlay
                    capturing taps meant for the adjacent New-folder / New-file buttons (iOS bug) */}
                <button type="button" onClick={() => scriptUploadRef.current?.click()}
                  className="p-2 text-indigo-400 hover:bg-slate-200/80 rounded transition-colors"
                  title={activeFolder ? t('uploadPyInFolderTooltip', { folder: activeFolder }) : t('uploadPyTooltip')}>
                  <Upload className="h-4 w-4" />
                </button>
                <input ref={scriptUploadRef} type="file" accept=".py" onChange={handleScriptUpload} className="hidden" />
                <button type="button" onClick={() => { setShowNewFolderInput(!showNewFolderInput); setShowNewFileInput(false); }}
                  className="p-2 text-indigo-400 hover:bg-slate-200/80 rounded transition-colors"
                  title={activeFolder ? t('newFolderInFolderTooltip', { folder: activeFolder }) : t('newFolderTooltip')}>
                  <FolderPlus className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => { setShowNewFileInput(!showNewFileInput); setShowNewFolderInput(false); }}
                  className="p-2 text-indigo-500 hover:bg-slate-200/80 rounded transition-colors"
                  title={activeFolder ? t('newScriptInFolderTooltip', { folder: activeFolder }) : t('newScriptTooltip')}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Active folder context badge */}
            {activeFolder && (
              <div className="flex items-center gap-1 mb-1.5 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                <Folder className="h-3 w-3 text-indigo-400 shrink-0" />
                <span className="text-[10px] text-indigo-400 font-mono truncate flex-1">{activeFolder}/</span>
                <button onClick={() => setActiveFolder(null)} className="text-indigo-300 hover:text-indigo-100 shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {scriptUploadProgress && (
              <div className={`flex items-center gap-1.5 mb-2 px-2 py-1 rounded text-[10px] ${activeTheme === 'light' ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-950/40 text-indigo-300'}`}>
                <div className="h-3 w-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                {t('uploadingScript')}
              </div>
            )}

            {showNewFileInput && (
              <form onSubmit={handleCreateFileSubmit} className={`mb-2 p-1.5 ${s.scriptForm} rounded-lg border`}>
                <p className={`text-[9px] ${s.subText} mb-1`}>{activeFolder ? t('inFolder', { folder: activeFolder }) : t('inRoot')}</p>
                <input type="text" required placeholder={t('newFileInputPlaceholder')} autoFocus
                  value={newFileName} onChange={(e) => setNewFileName(e.target.value)}
                  className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
                <div className="flex justify-end gap-1 mt-1">
                  <button type="button" onClick={() => { setShowNewFileInput(false); setNewFileName(''); }} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
                  <button type="submit" className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
                </div>
              </form>
            )}

            {showNewFolderInput && (
              <form onSubmit={handleCreateFolderSubmit} className={`mb-2 p-1.5 ${s.scriptForm} rounded-lg border`}>
                <p className={`text-[9px] ${s.subText} mb-1`}>{activeFolder ? t('inFolder', { folder: activeFolder }) : t('inRoot')}</p>
                <input type="text" required placeholder={t('newFolderInputPlaceholder')} autoFocus
                  value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)}
                  className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
                <div className="flex justify-end gap-1 mt-1">
                  <button type="button" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
                  <button type="submit" className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
                </div>
              </form>
            )}

            <div className="space-y-0.5" id="scripts-list">
              {/* Root-level scripts and docs (no folder) */}
              {files.filter(f => f.type === 'script' && !f.folder).map((f) => (
                <div key={f.id} id={`file-item-${f.id}`}>
                  {renamingId === f.id ? (
                    <form onSubmit={(e) => handleRenameSubmit(e, 'file', f.id, f.filename)}
                      className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onBlur={(e) => handleRenameSubmit(e as any, 'file', f.id, f.filename)}
                        className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                      <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                    </form>
                  ) : (
                    <div
                      className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${currentFileId === f.id ? s.scriptActive : s.scriptInactive}`}
                      onClick={() => { onSelectFile(f.id); setActiveFolder(null); }}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {f.filename.endsWith('.md')
                          ? <FileText className={`h-3 w-3 shrink-0 transition-colors ${currentFileId === f.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                          : <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${currentFileId === f.id ? 'rotate-90 text-indigo-600' : ''}`} />
                        }
                        <span className="font-mono truncate">{f.filename}</span>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); setRenamingId(f.id); setRenameValue(f.filename); }}
                          className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameTooltip')}>
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        {getMoveTargets(f, scriptTreeFolders).length > 0 && (
                          <button onClick={(e) => { e.stopPropagation(); setMovingFile({ file: f, folders: scriptTreeFolders }); }}
                            className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors" title={t('moveTooltip')}>
                            <FolderInput className="h-2.5 w-2.5" />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id); }}
                          className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteTooltip')}>
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Inline delete confirmation — avoids window.confirm() issues */}
                  {confirmDeleteId === f.id && (
                    <div className={`mx-1 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                      <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteFileConfirm', { name: f.filename })}</span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { onDeleteFile(f.id); setConfirmDeleteId(null); }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-colors"
                        >
                          {t('confirmDeleteFolderYes')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                        >
                          {t('confirmDeleteFolderNo')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Folders — top-level only */}
              {[...new Set(scriptTreeFolders.map(f => f.split('/')[0]))].map(folder => {
                const subfolders = [...new Set(scriptTreeFolders.filter(p => p.startsWith(`${folder}/`)))];
                const isCollapsed = collapsedFolders.has(folder);
                const isActive = activeFolder === folder;

                return (
                  <div key={folder}>
                    {/* Folder header row */}
                    {renamingId === folder ? (
                      <form onSubmit={(e) => handleRenameSubmit(e, 'folder', folder, folder.split('/').pop()!)}
                        className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                        <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          onBlur={(e) => handleRenameSubmit(e as any, 'folder', folder, folder.split('/').pop()!)}
                          className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                        <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                      </form>
                    ) : (
                      <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs select-none transition-all cursor-pointer ${isActive ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' : s.scriptInactive}`}
                        onClick={() => { setActiveFolder(isActive ? null : folder); toggleFolder(folder); }}>
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} />
                          <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="font-mono truncate font-medium">{folder}/</span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setRenamingId(folder); setRenameValue(folder.split('/').pop()!); }}
                            className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameFolderTooltip')}>
                            <Pencil className="h-2.5 w-2.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteFolder(folder); }}
                            className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteTooltip')}>
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Folder delete confirmation */}
                    {confirmDeleteFolder === folder && (
                      <div className={`ml-2 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                        <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>
                          {t('deleteFolderWithContent', { name: folder })}
                        </span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { removeScriptFolder(folder); setConfirmDeleteFolder(null); setActiveFolder(null); }}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded">{t('confirmDeleteFolderYes')}</button>
                          <button onClick={() => setConfirmDeleteFolder(null)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>{t('confirmDeleteFolderNo')}</button>
                        </div>
                      </div>
                    )}

                    {/* New file/subfolder forms */}
                    {newFileInFolder?.folder === folder && (
                      <form onSubmit={handleCreateFileInFolderSubmit} className={`ml-4 mb-1 p-1.5 ${s.scriptForm} rounded-lg border`}>
                        <input type="text" required placeholder={t('newFileInFolderPlaceholder')} autoFocus
                          value={newFileInFolder.name} onChange={(e) => setNewFileInFolder({ folder, name: e.target.value })}
                          className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
                        <div className="flex justify-end gap-1 mt-1">
                          <button type="button" onClick={() => setNewFileInFolder(null)} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
                          <button type="submit" className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
                        </div>
                      </form>
                    )}
                    {newSubFolderFor?.parent === folder && (
                      <form onSubmit={handleCreateSubFolderSubmit} className={`ml-4 mb-1 p-1.5 ${s.scriptForm} rounded-lg border`}>
                        <input type="text" required placeholder={t('newSubFolderPlaceholder')} autoFocus
                          value={newSubFolderFor.name} onChange={(e) => setNewSubFolderFor({ parent: folder, name: e.target.value })}
                          className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
                        <div className="flex justify-end gap-1 mt-1">
                          <button type="button" onClick={() => setNewSubFolderFor(null)} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
                          <button type="submit" className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
                        </div>
                      </form>
                    )}

                    {/* Folder contents */}
                    {!isCollapsed && (
                      <div className="ml-4 space-y-0.5">
                        {files.filter(f => f.type === 'script' && f.folder === folder).map(f => (
                          <div key={f.id}>
                            {renamingId === f.id ? (
                              <form onSubmit={(e) => handleRenameSubmit(e, 'file', f.id, f.filename)}
                                className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                                <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                  onBlur={(e) => handleRenameSubmit(e as any, 'file', f.id, f.filename)}
                                  className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                                <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                              </form>
                            ) : (
                              <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${currentFileId === f.id ? s.scriptActive : s.scriptInactive}`}
                                onClick={() => { onSelectFile(f.id); setActiveFolder(folder); }}>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${currentFileId === f.id ? 'rotate-90 text-indigo-600' : ''}`} />
                                  <span className="font-mono truncate">{f.filename}</span>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); setRenamingId(f.id); setRenameValue(f.filename); }}
                                    className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameTooltip')}>
                                    <Pencil className="h-2.5 w-2.5" />
                                  </button>
                                  {getMoveTargets(f, scriptTreeFolders).length > 0 && (
                                    <button onClick={(e) => { e.stopPropagation(); setMovingFile({ file: f, folders: scriptTreeFolders }); }}
                                      className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors" title={t('moveTooltip')}>
                                      <FolderInput className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id); }}
                                    className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteTooltip')}>
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                            {confirmDeleteId === f.id && (
                              <div className={`mx-1 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                                <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteFileConfirm', { name: f.filename })}</span>
                                <div className="flex gap-1 shrink-0">
                                  <button onClick={() => { onDeleteFile(f.id); setConfirmDeleteId(null); }}
                                    className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-colors">
                                    {t('confirmDeleteFolderYes')}
                                  </button>
                                  <button onClick={() => setConfirmDeleteId(null)}
                                    className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                                    {t('confirmDeleteFolderNo')}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Subfolders */}
                        {subfolders.map(subPath => {
                          const isSubActive = activeFolder === subPath;
                          return (
                            <div key={subPath}>
                              {renamingId === subPath ? (
                                <form onSubmit={(e) => handleRenameSubmit(e, 'folder', subPath, subPath.split('/').pop()!)}
                                  className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                                  <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                    onBlur={(e) => handleRenameSubmit(e as any, 'folder', subPath, subPath.split('/').pop()!)}
                                    className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                                  <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                                </form>
                              ) : (
                                <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs select-none transition-all cursor-pointer ${isSubActive ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400' : s.scriptInactive}`}
                                  onClick={() => { setActiveFolder(isSubActive ? null : subPath); toggleFolder(subPath); }}>
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${collapsedFolders.has(subPath) ? '' : 'rotate-90'}`} />
                                    <Folder className="h-3 w-3 shrink-0 text-amber-400" />
                                    <span className="font-mono truncate text-[10px]">{subPath.split('/')[1]}/</span>
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(subPath); setRenameValue(subPath.split('/').pop()!); }}
                                      className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameTooltip')}>
                                      <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteFolder(subPath); }}
                                      className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteSubfolderTooltip')}>
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {confirmDeleteFolder === subPath && (
                                <div className={`ml-2 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                                  <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>
                                    {t('deleteFolderConfirmText', { name: subPath.split('/').pop()! })}
                                  </span>
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => { removeScriptFolder(subPath); setConfirmDeleteFolder(null); if (activeFolder === subPath) setActiveFolder(null); }}
                                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded">{t('confirmDeleteFolderYes')}</button>
                                    <button onClick={() => setConfirmDeleteFolder(null)}
                                      className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>{t('confirmDeleteFolderNo')}</button>
                                  </div>
                                </div>
                              )}

                              {newFileInFolder?.folder === subPath && (
                                <form onSubmit={handleCreateFileInFolderSubmit} className={`ml-4 mb-1 p-1.5 ${s.scriptForm} rounded-lg border`}>
                                  <input type="text" required placeholder={t('newFileInFolderPlaceholder')} autoFocus
                                    value={newFileInFolder.name} onChange={(e) => setNewFileInFolder({ folder: subPath, name: e.target.value })}
                                    className={`w-full p-1 ${s.input} rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`} />
                                  <div className="flex justify-end gap-1 mt-1">
                                    <button type="button" onClick={() => setNewFileInFolder(null)} className={`px-1 py-0.5 text-[9px] ${s.subText}`}>{t('exitBtn')}</button>
                                    <button type="submit" className="px-1.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[9px] font-medium">{t('createBtn')}</button>
                                  </div>
                                </form>
                              )}

                              {!collapsedFolders.has(subPath) && (
                                <div className="ml-4 space-y-0.5">
                                  {files.filter(f => f.type === 'script' && f.folder === subPath).map(f => (
                                    <div key={f.id}>
                                      {renamingId === f.id ? (
                                        <form onSubmit={(e) => handleRenameSubmit(e, 'file', f.id, f.filename)}
                                          className={`flex items-center gap-1 p-1 ${s.scriptForm} rounded-lg border`}>
                                          <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                                            onBlur={(e) => handleRenameSubmit(e as any, 'file', f.id, f.filename)}
                                            className={`flex-1 p-0.5 ${s.input} rounded text-[11px] font-mono focus:outline-none`} />
                                          <button type="submit" className="text-[9px] text-indigo-400 shrink-0">✓</button>
                                        </form>
                                      ) : (
                                        <div className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${currentFileId === f.id ? s.scriptActive : s.scriptInactive}`}
                                          onClick={() => { onSelectFile(f.id); setActiveFolder(subPath); }}>
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <ChevronRight className={`h-3 w-3 shrink-0 text-slate-400 transition-transform ${currentFileId === f.id ? 'rotate-90 text-indigo-600' : ''}`} />
                                            <span className="font-mono truncate">{f.filename}</span>
                                          </div>
                                          <div className="flex items-center gap-0.5 shrink-0">
                                            <button onClick={(e) => { e.stopPropagation(); setRenamingId(f.id); setRenameValue(f.filename); }}
                                              className="p-1 text-slate-300 hover:text-indigo-500 rounded transition-colors" title={t('renameTooltip')}><Pencil className="h-2.5 w-2.5" /></button>
                                            {getMoveTargets(f, scriptTreeFolders).length > 0 && (
                                              <button onClick={(e) => { e.stopPropagation(); setMovingFile({ file: f, folders: scriptTreeFolders }); }}
                                                className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors" title={t('moveTooltip')}><FolderInput className="h-2.5 w-2.5" /></button>
                                            )}
                                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id); }}
                                              className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors" title={t('deleteTooltip')}><Trash2 className="h-2.5 w-2.5" /></button>
                                          </div>
                                        </div>
                                      )}
                                      {confirmDeleteId === f.id && (
                                        <div className={`mx-1 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                                          <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteFileConfirm', { name: f.filename })}</span>
                                          <div className="flex gap-1 shrink-0">
                                            <button onClick={() => { onDeleteFile(f.id); setConfirmDeleteId(null); }}
                                              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-colors">
                                              {t('confirmDeleteFolderYes')}
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(null)}
                                              className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}>
                                              {t('confirmDeleteFolderNo')}
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {files.filter(f => f.type === 'script').length === 0 && scriptTreeFolders.length === 0 && (
                <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>{t('noScripts')}</p>
              )}
            </div>
          </div>

          {/* Script output section — artefactos generados en output/ */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5`}>
                <FileOutput className="h-3.5 w-3.5 text-violet-500" /> {t('scriptOutputSection')}
              </span>
              {outputFiles.length > 0 && (
                <button
                  onClick={() => onClearOutput?.()}
                  title={t('clearOutput')}
                  className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-slate-400 hover:text-red-400 rounded transition-colors"
                >
                  <Eraser className="h-3 w-3" /> {t('clearOutput')}
                </button>
              )}
            </div>
            <p className={`text-[9px] ${s.subText} mb-2 pl-0.5`}>{t('scriptOutputHint')}</p>

            <div className="space-y-1 mb-3" id="output-files-list">
              {outputFiles.map((f) => (
                <div
                  key={f.name}
                  className={`group flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-all ${s.datasetInactive}`}
                  onClick={() => onPreviewOutput?.(f)}
                  title={f.name}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                    <span className="font-mono truncate font-medium">{f.name}</span>
                    <span className={`text-[9px] ${s.subText} shrink-0 font-mono`}>({formatSize(f.size)})</span>
                  </div>
                  <Download className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                </div>
              ))}
              {outputFiles.length === 0 && (
                <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>{t('noOutputFiles')}</p>
              )}
            </div>
          </div>

          {/* Datasets section */}
          <div>
            <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1`}>
              <Database className="h-3.5 w-3.5 text-emerald-600" /> {t('datasetSection')}
            </span>
            <p className={`text-[9px] ${s.subText} mb-2 pl-0.5`}>
              {t('datasetClickHint')}
            </p>

            <div className="space-y-1 mb-3" id="datasets-list">
              {files.filter(f => f.type === 'dataset').map((f) => (
                <div key={f.id} id={`dataset-item-${f.id}`}>
                  <div
                    className={`group flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-all ${s.datasetInactive} ${copiedDataset === f.filename ? 'ring-1 ring-emerald-500/60' : ''}`}
                    onClick={() => { setConfirmDeleteId(null); onPreviewDataset?.(f); }}
                    title={t('datasetPreviewHint')}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-mono truncate font-medium">{f.filename}</span>
                      <span className={`text-[9px] ${s.subText} shrink-0 font-mono`}>({formatSize(f.size)})</span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Copy path button — shows path snippet below when toggled */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); handleDatasetClick(f.filename); }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-400 rounded transition-all"
                        title={t('datasetCopyPath')}
                      >
                        {copiedDataset === f.filename
                          ? <Check className="h-3 w-3 text-emerald-400" />
                          : <Clipboard className="h-3 w-3" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(f.id); setCopiedDataset(null); }}
                        className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded transition-all"
                        title={t('deleteDatasetTooltip')}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Inline delete confirmation — avoids window.confirm() issues */}
                  {confirmDeleteId === f.id && (
                    <div className={`mx-1 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                      <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('deleteDatasetConfirm', { name: f.filename })}</span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { onDeleteFile(f.id); setConfirmDeleteId(null); }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-colors"
                        >
                          {t('confirmDeleteFolderYes')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                        >
                          {t('confirmDeleteFolderNo')}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Path snippet */}
                  {copiedDataset === f.filename && confirmDeleteId !== f.id && (
                    <div className="mx-1 mb-1 px-2 py-1.5 bg-slate-800 rounded-md border border-emerald-600/40">
                      <p className="text-[9px] text-emerald-400 font-bold mb-1 uppercase tracking-wide">{t('datasetPathLabel')}</p>
                      <code className="text-[10px] text-amber-300 font-mono block">
                        DATASET_PATH = '{f.filename}'
                      </code>
                    </div>
                  )}
                </div>
              ))}
              {files.filter(f => f.type === 'dataset').length === 0 && (
                <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>{t('noDatasets')}</p>
              )}
            </div>

            {/* Drag and Drop Box for dataset uploads */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border border-dashed p-3 text-center rounded-xl transition-all cursor-pointer select-none relative ${dragging ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : s.uploadBox}`}
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
                  <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className={`text-[10px] font-semibold ${s.progressText}`}>{t('uploadingLabel')}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <Upload className="h-5 w-5 text-slate-400 animate-bounce" />
                  <div>
                    <p className="text-[11px] font-bold">{t('uploadDatasetsTitle')}</p>
                    <p className={`text-[9px] ${s.subText}`}>{t('uploadDragOrClick')}</p>
                    <p className={`text-[8px] ${s.subText} mt-0.5`}>.csv .txt .xlsx .xls .json .parquet .log</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Secrets section — encrypted env vars, never files/datasets */}
          <div>
            <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1`}>
              <Lock className="h-3.5 w-3.5 text-amber-500" /> {t('secretSection')}
            </span>
            <p className={`text-[9px] ${s.subText} mb-2 pl-0.5`}>
              {t('secretSectionHint')}
            </p>

            <div className="space-y-1 mb-2" id="secrets-list">
              {secretKeys.map((key) => (
                <div key={key}>
                  <div className={`group flex items-center justify-between p-1.5 rounded-lg text-xs transition-all ${s.datasetInactive}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="font-mono truncate font-medium">{key}</span>
                      <span className={`text-[9px] ${s.subText} shrink-0 font-mono`}>••••••</span>
                    </div>
                    <button
                      onClick={() => setConfirmDeleteSecretKey(key)}
                      className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 rounded transition-all shrink-0"
                      title={t('secretDeleteTooltip')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {confirmDeleteSecretKey === key && (
                    <div className={`mx-1 mb-1 px-2 py-1.5 rounded-md border flex items-center justify-between gap-2 ${activeTheme === 'light' ? 'bg-red-50 border-red-200' : 'bg-red-950/60 border-red-700/50'}`}>
                      <span className={`text-[10px] ${activeTheme === 'light' ? 'text-red-700' : 'text-red-300'}`}>{t('secretDeleteConfirm', { name: key })}</span>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => { onDeleteSecret?.(key); setConfirmDeleteSecretKey(null); }}
                          className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded transition-colors"
                        >
                          {t('secretConfirmYes')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteSecretKey(null)}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded transition-colors ${activeTheme === 'light' ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
                        >
                          {t('secretConfirmNo')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {secretKeys.length === 0 && (
                <p className={`text-[11px] ${s.subText} italic pl-5 py-1`}>{t('secretNoSecrets')}</p>
              )}
            </div>

            {/* Add secret form */}
            <div className="space-y-1.5 mb-2">
              <input
                type="text"
                value={newSecretKey}
                onChange={e => setNewSecretKey(e.target.value.toUpperCase())}
                placeholder={t('secretKeyPlaceholder')}
                className={`w-full px-2 py-1 rounded text-[11px] font-mono ${s.input}`}
              />
              <input
                type="password"
                value={newSecretValue}
                onChange={e => setNewSecretValue(e.target.value)}
                placeholder={t('secretValuePlaceholder')}
                className={`w-full px-2 py-1 rounded text-[11px] ${s.input}`}
              />
              {secretError && <p className="text-[10px] text-red-400">{secretError}</p>}
              <button
                onClick={() => {
                  if (!newSecretKey || !newSecretValue) return;
                  onSaveSecret?.(newSecretKey, newSecretValue);
                  setNewSecretKey('');
                  setNewSecretValue('');
                }}
                className="w-full px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded transition-colors"
              >
                {t('secretAddBtn')}
              </button>
            </div>

            {/* Usage hint — the exact way to read a secret from a script */}
            <div className="px-2 py-1.5 bg-slate-800 rounded-md border border-amber-600/30">
              <p className="text-[9px] text-amber-400 font-bold mb-1 uppercase tracking-wide">{t('secretUsageHint')}</p>
              <code className="text-[10px] text-amber-300 font-mono block whitespace-pre-wrap break-all">
                from ide_env import get_secret{'\n'}get_secret('{newSecretKey || 'NOMBRE'}')
              </code>
            </div>
          </div>

          {/* Mis documentos (.md) section */}
          <DocsSection
            files={files}
            currentFileId={currentFileId}
            activeTheme={activeTheme}
            allFolders={folders}
            onSelectFile={onSelectFile}
            onCreateFile={onCreateFile}
            onCreateFileInFolder={onCreateFileInFolder}
            onCreateFolder={onCreateFolder}
            onRenameFile={onRenameFile}
            onRenameFolder={onRenameFolder}
            onDeleteFile={onDeleteFile}
            onDeleteFolder={onDeleteFolder}
            onUpload={onUploadScript}
            onRequestMoveFile={(file, docFolders) => setMovingFile({ file, folders: docFolders })}
          />

          {/* Entorno Python & Pip libraries section */}
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/40 animate-fadeIn">
            <span className={`text-[10px] ${s.subText} uppercase font-bold tracking-wider flex items-center gap-1.5 mb-2`}>
              <Package className="h-3.5 w-3.5 text-indigo-500" /> {t('pythonEnvSection')}
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
                  <p className="text-[11px] font-bold truncate">{t('librariesAndDeps')}</p>
                  <p className={`text-[9px] ${s.subText} mt-0.5 truncate`}>
                    {packageUpdateCount > 0
                      ? t('libraryUpdatesAvailable', { count: packageUpdateCount, plural: packageUpdateCount > 1 ? 's' : '' })
                      : t('librariesManage')
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
            <Sparkles className="h-3 w-3 text-indigo-500" /> {t('containerPerformance')}
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
          </div>
        </div>
      </aside>

      {/* Move file popup — shows the folder tree for the file's section (scripts or docs) */}
      <MoveFileModal
        file={movingFile?.file ?? null}
        folders={movingFile?.folders ?? []}
        activeTheme={activeTheme}
        onClose={() => setMovingFile(null)}
        onConfirm={(target) => {
          if (movingFile) onMoveFile(movingFile.file.id, target);
          setMovingFile(null);
        }}
      />
    </>
  );
}
