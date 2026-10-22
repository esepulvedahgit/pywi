import React from 'react';
import { motion } from 'motion/react';
import { Terminal, CheckCircle2, AlertCircle } from 'lucide-react';
import { EnvRestoreState } from '../types';
import { useT } from '../i18n';

interface EnvRestoreOverlayProps {
  restoreState: EnvRestoreState;
}

export default function EnvRestoreOverlay({ restoreState }: EnvRestoreOverlayProps) {
  const t = useT();
  const progress = restoreState.total > 0
    ? ((restoreState.done.length / restoreState.total) * 100).toFixed(0)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center"
    >
      <div className="text-center space-y-6">
        {/* Animated icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="flex justify-center"
        >
          <Terminal className="h-16 w-16 text-indigo-400" />
        </motion.div>

        {/* Main message */}
        <div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">{t('envRestoreTitle')}</h2>
          <p className="text-sm text-slate-400">{t('envRestoreSubtitle')}</p>
        </div>

        {/* Progress bar */}
        <div className="w-80 bg-slate-800 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          />
        </div>

        {/* Progress text */}
        <div className="text-sm text-slate-300 font-mono">
          {t('envProgress', { current: restoreState.done.length, total: restoreState.total })}
        </div>

        {/* Package list */}
        <div className="max-h-48 overflow-y-auto space-y-2 text-left bg-slate-900/30 rounded-lg p-4 border border-slate-700/50 w-80">
          {restoreState.done.map((pkg) => (
            <div key={pkg} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="line-through text-slate-500">{pkg}</span>
            </div>
          ))}

          {restoreState.pending.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Terminal className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              </motion.div>
              <span className="font-semibold">{restoreState.pending[0]}</span>
            </div>
          )}

          {restoreState.pending.slice(1).map((pkg) => (
            <div key={pkg} className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-3.5 w-3.5 rounded-full border border-slate-600" />
              <span>{pkg}</span>
            </div>
          ))}

          {restoreState.failed.length > 0 && (
            <div className="border-t border-slate-700/50 pt-2 mt-2">
              {restoreState.failed.map((pkg) => (
                <div key={pkg} className="flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span>{pkg} (error)</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status message */}
        <p className="text-xs text-slate-500">
          {t('envNoClose')}
        </p>
      </div>
    </motion.div>
  );
}
