import React, { useState } from 'react';
import { X, Table, BarChart2, Loader2, AlertCircle } from 'lucide-react';
import { useT } from '../i18n';

interface DataPreviewData {
  columns: string[];
  dtypes: Record<string, string>;
  shape: [number, number];
  head: string[][];
  describe: Record<string, Record<string, string>>;
}

interface DataPreviewModalProps {
  filename: string | null;
  data: DataPreviewData | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  activeTheme?: 'light' | 'vibrant-dark' | 'midnight-obsidian';
}

const getThemeClasses = (theme: 'light' | 'vibrant-dark' | 'midnight-obsidian') => {
  switch (theme) {
    case 'light':
      return {
        overlay: 'fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-white border border-slate-200 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-[92vw] h-[90vh] sm:h-[90vh] flex flex-col',
        header: 'border-b border-slate-200 bg-slate-50',
        title: 'text-slate-900',
        subtitle: 'text-slate-500',
        tab: 'text-slate-500 hover:text-slate-800',
        tabActive: 'text-emerald-700 border-b-2 border-emerald-600',
        th: 'bg-slate-100 text-slate-600 border-slate-200',
        td: 'text-slate-700 border-slate-100 hover:bg-slate-50',
        tdMono: 'font-mono text-slate-800',
        badge: 'bg-slate-100 text-slate-500',
        body: 'bg-white',
        scrollbar: '',
        loader: 'text-slate-400',
        error: 'text-red-600',
        closeBtn: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
      };
    case 'vibrant-dark':
      return {
        overlay: 'fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-neutral-900 border border-neutral-700 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-[92vw] h-[90vh] sm:h-[90vh] flex flex-col',
        header: 'border-b border-neutral-700 bg-neutral-950',
        title: 'text-neutral-100',
        subtitle: 'text-neutral-400',
        tab: 'text-neutral-400 hover:text-neutral-100',
        tabActive: 'text-emerald-400 border-b-2 border-emerald-500',
        th: 'bg-neutral-800 text-neutral-300 border-neutral-700',
        td: 'text-neutral-200 border-neutral-800 hover:bg-neutral-800/60',
        tdMono: 'font-mono text-neutral-100',
        badge: 'bg-neutral-800 text-neutral-400',
        body: 'bg-neutral-900',
        scrollbar: 'scrollbar-thin',
        loader: 'text-neutral-500',
        error: 'text-red-400',
        closeBtn: 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800',
      };
    default: // midnight-obsidian
      return {
        overlay: 'fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-slate-950 border border-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-[92vw] h-[90vh] sm:h-[90vh] flex flex-col',
        header: 'border-b border-slate-800 bg-black/40',
        title: 'text-slate-100',
        subtitle: 'text-slate-500',
        tab: 'text-slate-500 hover:text-slate-200',
        tabActive: 'text-emerald-400 border-b-2 border-emerald-500',
        th: 'bg-slate-900 text-slate-300 border-slate-700',
        td: 'text-slate-300 border-slate-800 hover:bg-slate-800/50',
        tdMono: 'font-mono text-slate-200',
        badge: 'bg-slate-800 text-slate-500',
        body: 'bg-slate-950',
        scrollbar: 'scrollbar-thin',
        loader: 'text-slate-600',
        error: 'text-red-400',
        closeBtn: 'text-slate-500 hover:text-slate-200 hover:bg-slate-800',
      };
  }
};

// Colour dtype badges so users learn column types at a glance
const dtypeColor = (dtype: string): string => {
  if (/int|float|complex/.test(dtype)) return 'text-blue-400';
  if (/object|string|str/.test(dtype)) return 'text-amber-400';
  if (/bool/.test(dtype)) return 'text-purple-400';
  if (/datetime|timedelta/.test(dtype)) return 'text-cyan-400';
  return 'text-slate-400';
};

export default function DataPreviewModal({
  filename,
  data,
  loading,
  error,
  onClose,
  activeTheme = 'midnight-obsidian',
}: DataPreviewModalProps) {
  const t = useT();
  const [tab, setTab] = useState<'head' | 'describe'>('head');
  const s = getThemeClasses(activeTheme);

  if (!filename) return null;

  const shapeText = data
    ? t('dataPreviewShape', { rows: String(data.shape[0]), cols: String(data.shape[1]) })
    : '';

  const describeRows = data
    ? Object.keys(data.describe[Object.keys(data.describe)[0]] ?? {})
    : [];

  return (
    <div className={s.overlay} onClick={onClose}>
      <div
        className={s.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className={`flex items-center justify-between px-4 py-3 ${s.header} shrink-0`}>
          <div className="flex items-center gap-2 min-w-0">
            <Table className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className={`font-semibold text-sm truncate ${s.title}`}>{filename}</span>
            {shapeText && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded ${s.badge} shrink-0`}>
                {shapeText}
              </span>
            )}
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-lg transition-colors ${s.closeBtn}`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Tabs ── */}
        {data && (
          <div className={`flex gap-4 px-4 pt-2 pb-0 ${s.header} shrink-0`}>
            <button
              onClick={() => setTab('head')}
              className={`flex items-center gap-1.5 text-xs pb-2 font-medium transition-colors ${tab === 'head' ? s.tabActive : s.tab}`}
            >
              <Table className="h-3.5 w-3.5" />
              {t('dataPreviewTabHead')}
            </button>
            <button
              onClick={() => setTab('describe')}
              className={`flex items-center gap-1.5 text-xs pb-2 font-medium transition-colors ${tab === 'describe' ? s.tabActive : s.tab}`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              {t('dataPreviewTabDescribe')}
            </button>
          </div>
        )}

        {/* ── Body ── */}
        <div className={`flex-1 min-h-0 overflow-auto ${s.body}`}>
          {/* Loading */}
          {loading && (
            <div className={`flex flex-col items-center justify-center h-40 gap-3 ${s.loader}`}>
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{t('dataPreviewLoading')}</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className={`flex flex-col items-center justify-center h-40 gap-2 ${s.error}`}>
              <AlertCircle className="h-6 w-6" />
              <span className="text-xs text-center px-4">{error}</span>
            </div>
          )}

          {/* Head table */}
          {!loading && !error && data && tab === 'head' && (
            <div className="overflow-auto h-full">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    {/* Row index column */}
                    <th className={`px-2 py-1.5 text-right border-b border-r ${s.th} font-mono text-[10px] w-8`}>
                      #
                    </th>
                    {data.columns.map((col) => (
                      <th
                        key={col}
                        className={`px-3 py-1.5 text-left border-b border-r ${s.th} whitespace-nowrap font-semibold max-w-[180px]`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="truncate">{col}</span>
                          <span className={`text-[9px] font-normal ${dtypeColor(data.dtypes[col] ?? '')}`}>
                            {data.dtypes[col] ?? ''}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.head.map((row, i) => (
                    <tr key={i} className="group">
                      <td className={`px-2 py-1 text-right border-b border-r ${s.th} font-mono text-[10px]`}>
                        {i}
                      </td>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className={`px-3 py-1 border-b border-r ${s.td} ${s.tdMono} max-w-[240px]`}
                          title={cell}
                        >
                          <span className="truncate block">{cell}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Describe table */}
          {!loading && !error && data && tab === 'describe' && (
            <div className="overflow-auto h-full">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={`px-3 py-1.5 text-left border-b border-r ${s.th} whitespace-nowrap font-semibold sticky left-0`}>
                      stat
                    </th>
                    {data.columns.map((col) => (
                      <th
                        key={col}
                        className={`px-3 py-1.5 text-left border-b border-r ${s.th} whitespace-nowrap font-semibold max-w-[160px]`}
                      >
                        <span className="truncate block">{col}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {describeRows.map((stat) => (
                    <tr key={stat} className="group">
                      <td className={`px-3 py-1 border-b border-r ${s.th} font-semibold sticky left-0`}>
                        {stat}
                      </td>
                      {data.columns.map((col) => (
                        <td
                          key={col}
                          className={`px-3 py-1 border-b border-r ${s.td} ${s.tdMono} max-w-[160px]`}
                        >
                          <span className="truncate block">{data.describe[col]?.[stat] ?? '—'}</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
