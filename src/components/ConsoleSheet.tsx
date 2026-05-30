import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CornerRightDown, Terminal, CheckCircle2, AlertTriangle, Clock, Maximize2, Minimize2 } from 'lucide-react';
import { ExecutionResult } from '../types';

interface ConsoleSheetProps {
  result: ExecutionResult | null;
  isOpen: boolean;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function ConsoleSheet({
  result,
  isOpen,
  onClose,
  isExpanded,
  onToggleExpand
}: ConsoleSheetProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-700/80 shadow-2xl flex flex-col font-sans select-none ${
          isExpanded ? 'h-[90vh]' : 'h-[40vh] sm:h-[45vh]'
        }`}
        id="console-bottom-sheet"
      >
        {/* Resize/Drag upper notch / handle */}
        <div className="w-full h-1 bg-slate-800 flex items-center justify-center cursor-row-resize hover:bg-slate-700 select-none">
          <div className="w-12 h-1 bg-slate-600 rounded-full"></div>
        </div>

        {/* Title Bar / Header */}
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-indigo-400 shrink-0" />
            <h3 className="font-semibold text-xs tracking-tight text-slate-200 uppercase">
              Stdout / Consola de Salida
            </h3>
            {result && (
              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                result.success
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {result.success ? 'ÉXITO (CODE 0)' : 'FALLIDO (CODE 1)'}
              </span>
            )}
          </div>

          {/* Metrics & Action controls */}
          <div className="flex items-center gap-3">
            {result && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-0.5 text-slate-500" title="Tiempo de ejecución">
                  <Clock className="h-3 w-3" /> {result.duration}ms
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500">{result.timestamp.substring(11, 19)} UTC</span>
              </div>
            )}

            <button
              onClick={onToggleExpand}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title={isExpanded ? 'Restaurar pantalla' : 'Maximizar pantalla'}
              id="btn-toggle-expand-console"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
              title="Cerrar consola"
              id="btn-close-console"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed bg-[#0b0f19] select-text">
          {result ? (
            <div className="space-y-4">
              {/* Warnings or Error details */}
              {!result.success && result.stderr && (
                <div className="bg-red-950/30 border-l-4 border-red-500 p-3 text-red-200 text-xs rounded-r-md">
                  <div className="flex items-center gap-1.5 font-bold mb-1 ml-0.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span>Stack Trace / Error de Python</span>
                  </div>
                  <pre className="whitespace-pre-wrap ml-1 text-[11px] opacity-90 font-mono select-text">
                    {result.stderr}
                  </pre>
                </div>
              )}

              {/* Success summary if applicable */}
              {result.success && (
                <div className="bg-emerald-950/15 border-l-4 border-emerald-500/70 p-2.5 text-emerald-300 text-[11px] rounded-r-md flex items-center gap-2 select-text">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Código de Python compilado y finalizado correctamente.</span>
                </div>
              )}

              {/* General Output */}
              <div className="ml-1" id="stdout-console-pre-wrapper">
                <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300 select-text">
                  {result.stdout || <span className="text-slate-500 italic">[El script no imprimió ninguna salida]</span>}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 italic gap-2 py-8">
              <Terminal className="h-8 w-8 text-slate-700 animate-pulse" />
              <span>Esperando ejecución... escribe código y presiona "Ejecutar"</span>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
