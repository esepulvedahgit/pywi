import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CornerRightDown, Terminal, CheckCircle2, AlertTriangle, Clock, Maximize2, Minimize2, ChevronDown, ChevronRight } from 'lucide-react';
import { ExecutionResult } from '../types';

interface ParsedPythonError {
  errorType: string;
  errorMessage: string;
  filename: string;
  lineNumber: string;
  codeSnippet: string;
  isTraceback: boolean;
}

function parsePythonError(stderr: string): ParsedPythonError | null {
  if (!stderr || !stderr.trim()) return null;

  const lines = stderr.split('\n');
  const tracebackHeaderIdx = lines.findIndex(l =>
    /^Traceback \(most recent call last\):/.test(l.trim())
  );

  const errorLineRegex = /^([A-Z][a-zA-Z]*(?:Error|Warning|Exception|Interrupt|Fault))(:\s*(.*))?$/;
  let errorLineIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (errorLineRegex.test(lines[i].trim())) {
      errorLineIdx = i;
      break;
    }
  }

  if (errorLineIdx === -1) {
    return {
      errorType: 'Error',
      errorMessage: stderr.trim(),
      filename: '',
      lineNumber: '',
      codeSnippet: '',
      isTraceback: false,
    };
  }

  const errorMatch = lines[errorLineIdx].trim().match(errorLineRegex)!;
  const errorType = errorMatch[1];
  const errorMessage = errorMatch[3]?.trim() ?? '';

  const fileLineRegex = /^\s*File "([^"]+)",\s*line\s*(\d+)/;
  let filename = '';
  let lineNumber = '';
  let codeSnippet = '';

  for (let i = errorLineIdx - 1; i >= 0; i--) {
    const frameMatch = lines[i].match(fileLineRegex);
    if (frameMatch) {
      const fullPath = frameMatch[1];
      filename = fullPath.split('/').pop() ?? fullPath.split('\\').pop() ?? fullPath;
      lineNumber = frameMatch[2];

      if (i + 1 < errorLineIdx) {
        const nextLine = lines[i + 1];
        if (nextLine && !fileLineRegex.test(nextLine) && !/^\s*\^/.test(nextLine)) {
          codeSnippet = nextLine;
        }
      }
      break;
    }
  }

  return {
    errorType,
    errorMessage,
    filename,
    lineNumber,
    codeSnippet,
    isTraceback: tracebackHeaderIdx !== -1,
  };
}

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
  const [showRawTrace, setShowRawTrace] = useState(false);
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const parsedError = result && !result.success && result.stderr
    ? parsePythonError(result.stderr)
    : null;

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelRef.current?.offsetHeight ?? 300;

    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY;
      const newH = Math.max(80, Math.min(window.innerHeight * 0.95, startHeight + delta));
      setCustomHeight(newH);
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={customHeight ? { height: `${customHeight}px` } : undefined}
        className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-slate-700/80 shadow-2xl flex flex-col font-sans select-none ${
          !customHeight ? (isExpanded ? 'h-[90vh]' : 'h-[40vh] sm:h-[45vh]') : ''
        }`}
        id="console-bottom-sheet"
      >
        {/* Resize/Drag upper notch / handle */}
        <div
          onPointerDown={handleResizeStart}
          className="w-full h-1 bg-slate-800 flex items-center justify-center cursor-row-resize hover:bg-slate-700 select-none active:bg-slate-600"
        >
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
              onClick={() => {
                setCustomHeight(null);
                onToggleExpand();
              }}
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
              {parsedError && (
                <div className="bg-red-950/30 border-l-4 border-red-500 rounded-r-md overflow-hidden">
                  {/* Header: error type badge + location + message */}
                  <div className="px-3 pt-3 pb-2 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-mono select-text">
                          {parsedError.errorType}
                        </span>
                        {parsedError.filename && parsedError.lineNumber && (
                          <span className="text-[10px] text-slate-400 font-mono select-text">
                            {parsedError.filename}:{parsedError.lineNumber}
                          </span>
                        )}
                      </div>
                      {parsedError.errorMessage && (
                        <p className="mt-1.5 text-red-200 text-[11px] leading-snug font-mono select-text">
                          {parsedError.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Offending code snippet */}
                  {parsedError.codeSnippet && (
                    <div className="mx-3 mb-2 bg-slate-900/60 border border-red-500/20 rounded px-3 py-2">
                      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 select-none">
                        Línea {parsedError.lineNumber}
                      </div>
                      <pre className="text-[11px] font-mono text-amber-300 whitespace-pre-wrap select-text">
                        {parsedError.codeSnippet}
                      </pre>
                    </div>
                  )}

                  {/* Collapsible raw traceback */}
                  {parsedError.isTraceback && (
                    <div className="border-t border-red-500/20 mt-1">
                      <button
                        onClick={() => setShowRawTrace(prev => !prev)}
                        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-slate-500 hover:text-slate-300 hover:bg-red-950/20 transition-colors select-none font-mono"
                      >
                        {showRawTrace
                          ? <ChevronDown className="h-3 w-3 shrink-0" />
                          : <ChevronRight className="h-3 w-3 shrink-0" />
                        }
                        <span>{showRawTrace ? 'Ocultar' : 'Ver'} traceback completo</span>
                      </button>
                      {showRawTrace && (
                        <pre className="px-3 pb-3 whitespace-pre-wrap text-[10px] font-mono text-slate-400 select-text opacity-80">
                          {result!.stderr}
                        </pre>
                      )}
                    </div>
                  )}

                  {/* Non-traceback fallback */}
                  {!parsedError.isTraceback && (
                    <pre className="px-3 pb-3 whitespace-pre-wrap text-[11px] font-mono text-red-200 select-text opacity-90">
                      {result!.stderr}
                    </pre>
                  )}
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
