import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useT } from '../i18n';
import type { OutputFile } from '../types';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico']);
const MARKDOWN_EXTS = new Set(['md', 'markdown']);
const TEXT_EXTS = new Set(['txt', 'csv', 'json', 'log', 'yaml', 'yml']);
// Los archivos de texto se cargan enteros en memoria para el <pre>; por encima de
// este umbral (un .csv de salida puede ser grande) caemos al fallback de descarga.
const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024; // 1 MB

interface OutputPreviewModalProps {
  file: OutputFile | null;
  projectId: string;
  token: string;
  onClose: () => void;
  activeTheme?: 'light' | 'vibrant-dark' | 'midnight-obsidian';
}

const getThemeClasses = (theme: 'light' | 'vibrant-dark' | 'midnight-obsidian') => {
  switch (theme) {
    case 'light':
      return {
        overlay: 'fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-[92vw] h-[90vh] flex flex-col',
        header: 'border-b border-slate-200 bg-slate-50',
        title: 'text-slate-900',
        subtitle: 'text-slate-500',
        body: 'bg-white',
        mdClass: 'markdown-preview markdown-light',
        textPre: 'bg-slate-50 text-slate-800 border border-slate-200',
        loader: 'text-slate-400',
        muted: 'text-slate-500',
        downloadBtn: 'text-violet-700 hover:bg-violet-50 border border-violet-200',
        closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
      };
    case 'vibrant-dark':
      return {
        overlay: 'fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-[92vw] h-[90vh] flex flex-col',
        header: 'border-b border-neutral-700 bg-neutral-950',
        title: 'text-neutral-100',
        subtitle: 'text-neutral-400',
        body: 'bg-neutral-900',
        mdClass: 'markdown-preview markdown-dark',
        textPre: 'bg-neutral-950 text-neutral-200 border border-neutral-800',
        loader: 'text-neutral-500',
        muted: 'text-neutral-400',
        downloadBtn: 'text-violet-300 hover:bg-violet-950/40 border border-violet-800',
        closeBtn: 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800',
      };
    default: // midnight-obsidian
      return {
        overlay: 'fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-slate-950 border border-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-[92vw] h-[90vh] flex flex-col',
        header: 'border-b border-slate-800 bg-black/40',
        title: 'text-slate-100',
        subtitle: 'text-slate-500',
        body: 'bg-slate-950',
        mdClass: 'markdown-preview markdown-dark',
        textPre: 'bg-black/40 text-slate-200 border border-slate-800',
        loader: 'text-slate-600',
        muted: 'text-slate-500',
        downloadBtn: 'text-violet-300 hover:bg-violet-950/40 border border-violet-800',
        closeBtn: 'text-slate-500 hover:text-slate-200 hover:bg-slate-800',
      };
  }
};

export default function OutputPreviewModal({
  file, projectId, token, onClose, activeTheme = 'midnight-obsidian',
}: OutputPreviewModalProps) {
  const t = useT();
  const s = getThemeClasses(activeTheme);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ext = file?.ext ?? '';
  const isImage = IMAGE_EXTS.has(ext);
  const isMarkdown = MARKDOWN_EXTS.has(ext);
  // Texto plano previsualizable solo si no supera el umbral de tamaño
  const isText = TEXT_EXTS.has(ext) && (file?.size ?? 0) <= TEXT_PREVIEW_MAX_BYTES;
  const needsText = isMarkdown || isText;
  // Texto reconocido pero demasiado grande para renderizar: mensaje específico
  const textTooLarge = TEXT_EXTS.has(ext) && (file?.size ?? 0) > TEXT_PREVIEW_MAX_BYTES;

  const fileUrl = file
    ? `/api/projects/${projectId}/output-files/${encodeURIComponent(file.name)}?token=${encodeURIComponent(token)}`
    : '';

  // Cargar el cuerpo como texto (markdown → ReactMarkdown, texto plano → <pre>).
  // fetch().text() ignora el Content-Disposition: attachment del servidor, así que
  // funciona aunque estos tipos se sirvan como descarga por seguridad.
  useEffect(() => {
    let cancelled = false;
    setTextContent(null);
    if (!file || !needsText) return;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(fileUrl);
        const text = res.ok ? await res.text() : '';
        if (!cancelled) setTextContent(text);
      } catch {
        if (!cancelled) setTextContent('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file?.name, needsText]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar con Escape
  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [file, onClose]);

  const handleDownload = async () => {
    if (!file) return;
    try {
      const res = await fetch(`${fileUrl}&download=1`);
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* silencioso */ }
  };

  if (!file) return null;

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`flex items-center gap-3 px-4 py-3 ${s.header}`}>
          <FileText className="h-4 w-4 text-violet-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className={`text-sm font-bold truncate ${s.title}`}>{file.name}</div>
            <div className={`text-[11px] ${s.subtitle}`}>
              {(file.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button
            onClick={handleDownload}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${s.downloadBtn}`}
            title={t('downloadFile')}
          >
            <Download className="h-3.5 w-3.5" /> {t('downloadFile')}
          </button>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${s.closeBtn}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-auto ${s.body}`}>
          {isImage && (
            <div className="flex items-center justify-center p-4 min-h-full">
              <img src={fileUrl} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg" />
            </div>
          )}

          {needsText && (
            <>
              {loading ? (
                <div className={`flex items-center justify-center gap-2 py-10 ${s.loader}`}>
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : isMarkdown ? (
                <div className={`${s.mdClass} p-6`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{textContent ?? ''}</ReactMarkdown>
                </div>
              ) : (
                <div className="p-4">
                  <pre className={`text-xs font-mono leading-relaxed p-4 rounded-lg overflow-auto whitespace-pre ${s.textPre}`}>
                    {textContent ?? ''}
                  </pre>
                </div>
              )}
            </>
          )}

          {!isImage && !needsText && (
            <div className={`flex flex-col items-center justify-center gap-4 h-full p-8 text-center ${s.muted}`}>
              <FileText className="h-10 w-10 opacity-40" />
              <p className="text-sm">{t(textTooLarge ? 'outputPreviewTooLarge' : 'outputPreviewUnsupported')}</p>
              <button
                onClick={handleDownload}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${s.downloadBtn}`}
              >
                <Download className="h-4 w-4" /> {t('downloadFile')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
