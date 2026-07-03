import React, { useEffect, useState } from 'react';
import { X, Home, Folder, ChevronRight, FolderInput, Check } from 'lucide-react';
import { FileItem } from '../types';
import { useT } from '../i18n';

interface MoveFileModalProps {
  file: FileItem | null;
  folders: string[]; // all folder paths of the same type as `file` (flat strings, max one nested level)
  onClose: () => void;
  onConfirm: (targetFolder: string | null) => void;
  activeTheme?: 'light' | 'vibrant-dark' | 'midnight-obsidian';
}

export default function MoveFileModal({
  file,
  folders,
  onClose,
  onConfirm,
  activeTheme = 'light'
}: MoveFileModalProps) {
  const t = useT();
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const currentFolder = file?.folder || '';

  useEffect(() => {
    // Reset selection whenever a different file is opened for moving
    setSelected(null);
    setExpanded(new Set());
  }, [file?.id]);

  if (!file) return null;

  const isLight = activeTheme === 'light';
  const isVibrant = activeTheme === 'vibrant-dark';

  const c = {
    overlay: 'fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4',
    card: isLight
      ? 'bg-white text-slate-800 border border-slate-200 shadow-2xl w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden'
      : isVibrant
      ? 'bg-slate-900 text-slate-200 border border-slate-800 shadow-2xl w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden'
      : 'bg-neutral-950 text-neutral-200 border border-neutral-900 shadow-2xl w-full sm:max-w-md h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden',
    header: isLight ? 'bg-slate-50 border-b border-slate-200 p-4 shrink-0' : 'bg-slate-950/60 border-b border-slate-850 p-4 shrink-0',
    title: isLight ? 'text-slate-800' : 'text-white',
    subText: isLight ? 'text-slate-500' : 'text-slate-400',
    closeBtn: isLight ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800',
    footer: isLight ? 'bg-slate-50 border-t border-slate-200 p-3' : 'bg-slate-950/60 border-t border-slate-850 p-3',
    rowInactive: isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-slate-800/60 text-slate-300',
    rowActive: isLight ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-indigo-950/40 border border-indigo-800 text-indigo-300',
    rowCurrent: isLight ? 'text-slate-400' : 'text-slate-600',
    btnSecondary: isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-250'
  };

  const rootFolders = [...new Set(folders.map(f => f.split('/')[0]))];
  const subFoldersOf = (folder: string) => [...new Set(folders.filter(p => p.startsWith(`${folder}/`)))];

  const destinations = ['', ...folders].filter(f => f !== currentFolder);
  const hasDestinations = destinations.length > 0;

  const toggleExpand = (folder: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(folder) ? next.delete(folder) : next.add(folder);
      return next;
    });
  };

  const renderOption = (path: string, label: string, depth: number, isFolder: boolean, hasChildren = false) => {
    const isCurrent = path === currentFolder;
    const isSelected = selected === path;
    const isExpanded = expanded.has(path);
    return (
      <div key={path || '__root__'}>
        <button
          type="button"
          disabled={isCurrent}
          onClick={() => { setSelected(path); if (hasChildren) toggleExpand(path); }}
          className={`w-full flex items-center gap-1.5 p-2 rounded-lg text-xs text-left transition-all ${
            isCurrent ? `${c.rowCurrent} cursor-not-allowed opacity-60` : isSelected ? c.rowActive : c.rowInactive
          }`}
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          {hasChildren ? (
            <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          {isFolder ? (
            <Folder className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          ) : (
            <Home className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
          )}
          <span className="font-mono truncate flex-1">{label}</span>
          {isCurrent && <span className="text-[9px] shrink-0">{t('moveCurrentLocation')}</span>}
          {isSelected && !isCurrent && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-500" />}
        </button>
      </div>
    );
  };

  return (
    <div className={c.overlay} id="move-file-overlay-container" onClick={onClose}>
      <div className={c.card} id="move-file-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={c.header}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-indigo-600 text-white shadow-xs shrink-0">
                <FolderInput className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-sm font-bold tracking-tight truncate ${c.title}`}>{t('moveFileTitle')}</h2>
                <p className={`text-[11px] ${c.subText} font-mono truncate`}>{file.filename}</p>
              </div>
            </div>
            <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors shrink-0 ${c.closeBtn}`} id="close-move-file-modal-btn">
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Folder tree */}
        <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
          <p className={`text-[11px] ${c.subText} mb-2 px-1`}>{t('moveFileSubtitle')}</p>

          {!hasDestinations ? (
            <p className={`text-[11px] ${c.subText} italic px-1 py-2`}>{t('moveNoDestinations')}</p>
          ) : (
            <>
              {renderOption('', t('moveToRoot'), 0, false)}
              {rootFolders.map(folder => {
                const subs = subFoldersOf(folder);
                const isExpanded = expanded.has(folder) || subs.some(s => s === currentFolder);
                return (
                  <div key={folder}>
                    {renderOption(folder, `${folder}/`, 0, true, subs.length > 0)}
                    {subs.length > 0 && isExpanded && (
                      <div>
                        {subs.map(sub => renderOption(sub, `${sub.split('/').pop()}/`, 1, true))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`${c.footer} flex items-center justify-end gap-2 shrink-0`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${c.btnSecondary}`}
          >
            {t('moveCancel')}
          </button>
          <button
            type="button"
            disabled={selected === null}
            onClick={() => { if (selected !== null) onConfirm(selected || null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              selected === null
                ? 'bg-indigo-600/40 text-white/70 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            id="confirm-move-file-btn"
          >
            {t('moveConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
