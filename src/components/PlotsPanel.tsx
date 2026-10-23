import React from 'react';
import { Download } from 'lucide-react';
import { useT } from '../i18n';

interface PlotsPanelProps {
  projectId: string;
  files: string[];
}

export default function PlotsPanel({ projectId, files }: PlotsPanelProps) {
  const t = useT();

  const handleDownload = async (filename: string) => {
    const url = `/api/projects/${projectId}/output-files/${encodeURIComponent(filename)}`;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* silencioso */ }
  };

  if (!files.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
        {t('noPlots')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      {files.map(filename => (
        <div key={filename} className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">{filename}</span>
            <button
              onClick={() => handleDownload(filename)}
              title={t('downloadPlot')}
              className="p-1 text-slate-500 hover:text-emerald-400 rounded transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
          <img
            src={`/api/projects/${projectId}/output-files/${encodeURIComponent(filename)}`}
            alt={filename}
            className="rounded-lg border border-slate-700 max-w-full object-contain bg-slate-900"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
