import React from 'react';
import { useT } from '../i18n';

interface PlotsPanelProps {
  projectId: string;
  files: string[];
  token: string;
}

export default function PlotsPanel({ projectId, files, token }: PlotsPanelProps) {
  const t = useT();
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
          <span className="text-xs text-slate-400 font-mono">{filename}</span>
          <img
            src={`/api/projects/${projectId}/output-files/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`}
            alt={filename}
            className="rounded-lg border border-slate-700 max-w-full object-contain bg-slate-900"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}
