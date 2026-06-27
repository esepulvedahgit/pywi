import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Terminal, Clock, Maximize2, Minimize2, Trash2, BarChart2, Download, Sparkles } from 'lucide-react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useT } from '../i18n';
import PlotsPanel from './PlotsPanel';

// ── Xterm theme objects — one per IDE theme ──────────────────────────────────
// Shared ANSI palettes — only per-theme surface colours differ.
const BASE_DARK_ANSI = {
  black: '#0f172a',   red: '#f87171',   green: '#4ade80',   yellow: '#facc15',
  blue: '#60a5fa',    magenta: '#c084fc', cyan: '#22d3ee',  white: '#e2e8f0',
  brightBlack: '#475569', brightRed: '#fca5a5', brightGreen: '#86efac', brightYellow: '#fde68a',
  brightBlue: '#93c5fd',  brightMagenta: '#d8b4fe', brightCyan: '#67e8f9', brightWhite: '#f8fafc',
};

const XTERM_THEMES = {
  light: {
    background: '#f8fafc',
    foreground: '#0f172a',
    cursor: '#6366f1',
    cursorAccent: '#f8fafc',
    black: '#1e293b',   red: '#dc2626',   green: '#16a34a',   yellow: '#ca8a04',
    blue: '#2563eb',    magenta: '#9333ea', cyan: '#0891b2',  white: '#f1f5f9',
    brightBlack: '#475569', brightRed: '#ef4444', brightGreen: '#22c55e', brightYellow: '#eab308',
    brightBlue: '#60a5fa',  brightMagenta: '#c084fc', brightCyan: '#22d3ee', brightWhite: '#ffffff',
  },
  'vibrant-dark': {
    ...BASE_DARK_ANSI,
    background: '#090d16',
    foreground: '#e2e8f0',
    cursor: '#6366f1',
    cursorAccent: '#090d16',
  },
  'midnight-obsidian': {
    ...BASE_DARK_ANSI,
    black: '#1a1a1a',           // darker cell background vs vibrant-dark
    white: '#d4d4d4',           // slightly dimmer default text
    brightBlack: '#525252',     // lighter mid-gray
    brightWhite: '#fafafa',     // near-white
    background: '#080808',
    foreground: '#d4d4d4',
    cursor: '#a3a3a3',
    cursorAccent: '#080808',
  },
} as const;

// ── Exit result returned by the WS after a run ───────────────────────────────
export interface ExitResult {
  success: boolean;
  exitCode: number;
  duration: number;
  generatedFiles: string[];
  ptyBuffer: string;      // full accumulated terminal text (for AI tutor)
}

// ── Props ────────────────────────────────────────────────────────────────────
export interface XtermConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  onClear: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  projectId: string;
  fileId: string;
  runCode: string;         // current editor content (saved before run)
  token: string;
  runNonce: number;        // increment to start a new run
  stopNonce: number;       // increment to stop the current run
  activeTheme: 'light' | 'vibrant-dark' | 'midnight-obsidian';
  aiReady?: boolean;
  onRunStateChange?: (isRunning: boolean) => void;
  onExitResult?: (result: ExitResult) => void;
  onExplainError?: () => void;
}

// ── Max PTY buffer to keep in memory (for AI tutor) ─────────────────────────
const MAX_BUFFER_CHARS = 64 * 1024; // 64 KB

export default function XtermConsole({
  isOpen, onClose, onClear, isExpanded, onToggleExpand,
  projectId, fileId, runCode, token,
  runNonce, stopNonce,
  activeTheme,
  aiReady, onRunStateChange, onExitResult, onExplainError,
}: XtermConsoleProps) {
  const t = useT();

  // ── Bottom-sheet layout state ────────────────────────────────────────────
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'console' | 'plots'>('console');
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Run state ────────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [exitResult, setExitResult] = useState<ExitResult | null>(null);
  // hasTraceback is derived from exitResult in render — no extra useState needed

  // ── xterm refs ───────────────────────────────────────────────────────────
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Buffer accumulated as an array of chunks to avoid O(n²) per-chunk string concat.
  // Joined and tail-sliced once at run exit (consumed by the AI tutor).
  const ptyChunksRef = useRef<string[]>([]);

  // ── Initialise xterm once the panel div mounts ───────────────────────────
  useEffect(() => {
    if (!termRef.current) return;

    const term = new XTerm({
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      theme: XTERM_THEMES[activeTheme],
      allowTransparency: false,
      scrollback: 5000,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Passthrough: user keystrokes → WS input messages
    term.onData((data) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    return () => {
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, []); // only once

  // ── Update xterm theme when activeTheme changes ───────────────────────────
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.theme = XTERM_THEMES[activeTheme];
    }
  }, [activeTheme]);

  // ── Fit terminal when panel opens or expands ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const fit = () => {
      try {
        fitAddonRef.current?.fit();
        // Notify server of new size
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && xtermRef.current) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          }));
        }
      } catch { /* terminal may not be ready yet */ }
    };
    // Small delay to let the panel animate into position
    const timer = setTimeout(fit, 50);
    return () => clearTimeout(timer);
  }, [isOpen, isExpanded, customHeight]);

  // ── Shared helpers ───────────────────────────────────────────────────────
  // Single call-site for stopping the running state.
  const stopRunning = () => { setIsRunning(false); onRunStateChange?.(false); };

  // Reset terminal display and buffer for a fresh run.
  const resetRunState = () => {
    ptyChunksRef.current = [];
    setExitResult(null);
    setViewMode('console');
    const term = xtermRef.current;
    if (term) {
      term.reset();
      term.options.theme = XTERM_THEMES[activeTheme];
    }
  };

  // ── Start a run when runNonce increments ─────────────────────────────────
  useEffect(() => {
    if (runNonce === 0) return; // initial mount — no run yet

    // Close any existing WS first
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    resetRunState();

    // Build WS URL — same origin, replace http/https → ws/wss
    const wsUrl = `${window.location.origin.replace(/^http/, 'ws')}/ws/run`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    setIsRunning(true);
    onRunStateChange?.(true);

    ws.onopen = () => {
      // Send start message with auth + params
      ws.send(JSON.stringify({
        type: 'start',
        token,
        projectId,
        fileId,
        runCode,
        cols: xtermRef.current?.cols ?? 80,
        rows: xtermRef.current?.rows ?? 24,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          const data: string = msg.data ?? '';
          // Write to terminal; accumulate raw chunks (joined + sliced at exit)
          xtermRef.current?.write(data);
          ptyChunksRef.current.push(data);
        } else if (msg.type === 'denied') {
          xtermRef.current?.writeln(`\r\n\x1b[31m⛔ ${msg.message ?? 'Acceso denegado'}\x1b[0m`);
          stopRunning();
        } else if (msg.type === 'exit') {
          // Join chunks once and tail-slice to cap size
          const buf = ptyChunksRef.current.join('').slice(-MAX_BUFFER_CHARS);

          const result: ExitResult = {
            success: msg.success,
            exitCode: msg.exitCode ?? 1,
            duration: msg.duration ?? 0,
            generatedFiles: msg.generatedFiles ?? [],
            ptyBuffer: buf,
          };
          setExitResult(result);
          onExitResult?.(result);
          stopRunning();

          // Auto-switch to plots view if images were generated
          if (result.generatedFiles.length > 0) setViewMode('plots');
        }
      } catch { /* ignore malformed messages */ }
    };

    ws.onerror = () => {
      xtermRef.current?.writeln('\r\n\x1b[31m[Error de conexión WebSocket]\x1b[0m');
      stopRunning();
    };

    // Use wsRef guard to avoid stale closure on isRunning
    ws.onclose = () => {
      if (wsRef.current === ws) {
        stopRunning();
        wsRef.current = null;
      }
    };

    return () => {
      ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNonce]);

  // ── Stop when stopNonce increments ───────────────────────────────────────
  useEffect(() => {
    if (stopNonce === 0) return;
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'stop' }));
    } else if (ws) {
      ws.close();
    }
  }, [stopNonce]);

  // ── Resize handle (drag from top of panel) ───────────────────────────────
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const startY = e.clientY;
    const startHeight = panelRef.current?.offsetHeight ?? 300;

    const onMove = (ev: PointerEvent) => {
      const delta = startY - ev.clientY;
      const newH = Math.max(80, Math.min(
        (window.visualViewport?.height ?? window.innerHeight) * 0.95,
        startHeight + delta
      ));
      setCustomHeight(newH);
    };
    const cleanup = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', cleanup);
      document.removeEventListener('pointercancel', cleanup);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', cleanup);
    document.addEventListener('pointercancel', cleanup);
  };

  // ── Download plot helper ──────────────────────────────────────────────────
  const handleDownload = async (filename: string) => {
    const url = `/api/projects/${projectId}/output-files/${encodeURIComponent(filename)}`;
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch { /* silencioso */ }
  };

  // ── Clear: reset terminal and close WS ───────────────────────────────────
  const handleClear = () => {
    wsRef.current?.close();
    wsRef.current = null;
    stopRunning();
    resetRunState();
    onClear();
  };

  if (!isOpen) return null;

  // Derived — no state needed
  const hasTraceback = !!exitResult?.ptyBuffer.includes('Traceback (most recent call last)');

  const heightStyle = customHeight
    ? { height: `${customHeight}px`, bottom: 'var(--keyboard-inset, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
    : { bottom: 'var(--keyboard-inset, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' };

  const panelHeightClass = !customHeight
    ? (isExpanded
        ? 'h-[calc(var(--app-height,100dvh)*0.9)]'
        : 'h-[calc(var(--app-height,100dvh)*0.4)] sm:h-[calc(var(--app-height,100dvh)*0.45)]')
    : '';

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={heightStyle}
        className={`fixed left-0 right-0 z-40 bg-slate-950 border-t border-slate-700/80 shadow-2xl flex flex-col font-sans select-none ${panelHeightClass}`}
        id="console-bottom-sheet"
      >
        {/* Resize/drag notch */}
        <div
          onPointerDown={handleResizeStart}
          className="w-full h-5 bg-slate-800 flex items-center justify-center cursor-row-resize hover:bg-slate-700 select-none active:bg-slate-600 touch-none"
        >
          <div className="w-12 h-1.5 bg-slate-600 rounded-full pointer-events-none" />
        </div>

        {/* Header */}
        <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-indigo-400 shrink-0" />
            <h3 className="font-semibold text-xs tracking-tight text-slate-200 uppercase">
              {t('stdoutConsole')}
            </h3>
            {exitResult && (
              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                exitResult.success
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
              }`}>
                {exitResult.success ? t('successCode0') : t('failed')}
              </span>
            )}
            {isRunning && (
              <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                ●
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {exitResult && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-0.5 text-slate-500">
                  <Clock className="h-3 w-3" /> {exitResult.duration}ms
                </span>
              </div>
            )}

            {/* Explain with AI tutor button — shown when traceback detected */}
            {hasTraceback && !isRunning && aiReady && onExplainError && (
              <button
                onClick={onExplainError}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-indigo-600/80 hover:bg-indigo-500 text-indigo-100 transition-colors shrink-0"
              >
                <Sparkles className="h-2.5 w-2.5" />
                {t('aiExplainErrorBtn')}
              </button>
            )}

            {/* Plots toggle */}
            {exitResult?.generatedFiles && exitResult.generatedFiles.length > 0 && (
              <>
                <button
                  onClick={() => setViewMode(v => v === 'console' ? 'plots' : 'console')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === 'plots'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-indigo-400 hover:bg-slate-700'
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  <span>{exitResult.generatedFiles.length} {t('plotsLabel')}</span>
                </button>
                <button
                  onClick={() => exitResult.generatedFiles.forEach((f, i) => setTimeout(() => handleDownload(f), i * 300))}
                  className="p-1 rounded transition-colors bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Clear button */}
            {(exitResult || isRunning) && (
              <button
                onClick={handleClear}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                title={t('consoleClearTooltip')}
                id="btn-clear-console"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => { setCustomHeight(null); onToggleExpand(); }}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
              id="btn-toggle-expand-console"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
              id="btn-close-console"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content pane — terminal div always mounted, visibility toggled with CSS */}
        <div className="flex-1 overflow-hidden relative">
          {/* xterm terminal — always in DOM so xterm doesn't need to re-init */}
          <div
            ref={termRef}
            className="absolute inset-0 p-2"
            style={{
              display: viewMode === 'console' ? 'block' : 'none',
              background: XTERM_THEMES[activeTheme].background,
            }}
          />

          {/* Idle overlay — shown only in console view when no run has happened yet */}
          {viewMode === 'console' && !isRunning && !exitResult && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 italic gap-2 pointer-events-none">
              <Terminal className="h-8 w-8 text-slate-700" />
              <span className="text-xs">{t('waiting')}</span>
            </div>
          )}

          {/* Plots panel — overlays when viewMode === 'plots' */}
          {viewMode === 'plots' && exitResult?.generatedFiles?.length ? (
            <div className="absolute inset-0 overflow-auto p-4 bg-[#0b0f19]">
              <PlotsPanel projectId={projectId} files={exitResult.generatedFiles} token={token} />
            </div>
          ) : null}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
