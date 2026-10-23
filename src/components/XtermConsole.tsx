import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
  // Light IDE theme still gets a dark terminal (VS Code-style: dark terminal floats in a light editor).
  // This keeps the already-dark panel chrome (slate-900/950) cohesive with its contents.
  light: {
    ...BASE_DARK_ANSI,
    background: '#0b0f19',
    foreground: '#e2e8f0',
    cursor: '#6366f1',
    cursorAccent: '#0b0f19',
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
  runNonce: number;        // increment to start a new run
  stopNonce: number;       // increment to stop the current run
  activeTheme: 'light' | 'vibrant-dark' | 'midnight-obsidian';
  aiReady?: boolean;
  onRunStateChange?: (isRunning: boolean) => void;
  onExitResult?: (result: ExitResult) => void;
  onExplainError?: () => void;
  onImportBlocked?: (module: string) => void;
}

// ── Max PTY buffer to keep in memory (for AI tutor) ─────────────────────────
const MAX_BUFFER_CHARS = 64 * 1024; // 64 KB

export default function XtermConsole({
  isOpen, onClose, onClear, isExpanded, onToggleExpand,
  projectId, fileId, runCode,
  runNonce, stopNonce,
  activeTheme,
  aiReady, onRunStateChange, onExitResult, onExplainError, onImportBlocked,
}: XtermConsoleProps) {
  const t = useT();

  // ── Bottom-sheet layout state ────────────────────────────────────────────
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'console' | 'plots'>('console');
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Run state ────────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [exitResult, setExitResult] = useState<ExitResult | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  // hasError is derived from exitResult in render — no extra useState needed

  // ── xterm refs ───────────────────────────────────────────────────────────
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  // Buffer accumulated as an array of chunks to avoid O(n²) per-chunk string concat.
  // Joined and tail-sliced once at run exit (consumed by the AI tutor).
  const ptyChunksRef = useRef<string[]>([]);

  // ── Initialise xterm ONCE — the div is now always mounted, so the terminal
  //    instance + its buffer/scrollback survive close/open. Disposed only when
  //    the component itself unmounts.
  useEffect(() => {
    if (!termRef.current || xtermRef.current) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // create once; dispose on true unmount only

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
        const term = xtermRef.current;
        // Force a repaint of the visible rows — the renderer may have been idle
        // while the panel was slid off-screen, which can leave the canvas blank.
        if (term) term.refresh(0, term.rows - 1);
        // Notify server of new size
        const ws = wsRef.current;
        if (ws && ws.readyState === WebSocket.OPEN && term) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: term.cols,
            rows: term.rows,
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
    setHintDismissed(false);
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
          // Normalizar saltos de línea a \r\n: xterm deja las líneas en cascada con \n crudo.
          const clean = String(msg.message ?? 'Acceso denegado').replace(/\r?\n/g, '\r\n');
          xtermRef.current?.writeln(`\r\n\x1b[31m⛔ ${clean}\x1b[0m`);
          if (msg.reason === 'forbidden_import' && msg.module) {
            onImportBlocked?.(msg.module);
          }
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
      const res = await fetch(url, { headers: {} });
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

  // NOTE: no early `return null` — the panel stays mounted so the xterm buffer
  // survives close/open. When closed it is slid off-screen + made inert below.

  // Derived — no state needed.
  // Un SyntaxError de script no imprime "Traceback (...)", así que también
  // detectamos errores de compilación por su firma al inicio de línea.
  // Se limpian los códigos ANSI antes de casar (Python 3.13+ colorea el traceback en un TTY).
  const errorText = exitResult ? exitResult.ptyBuffer.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '') : '';
  const hasError = !!exitResult && !exitResult.success && (
    errorText.includes('Traceback (most recent call last)') ||
    /(^|\n)\s*(SyntaxError|IndentationError|TabError):/.test(errorText)
  );

  const heightStyle = customHeight
    ? { height: `${customHeight}px`, bottom: 'var(--keyboard-inset, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }
    : { bottom: 'var(--keyboard-inset, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' };

  const panelHeightClass = !customHeight
    ? (isExpanded
        ? 'h-[calc(var(--app-height,100dvh)*0.9)]'
        : 'h-[calc(var(--app-height,100dvh)*0.4)] sm:h-[calc(var(--app-height,100dvh)*0.45)]')
    : '';

  // Theme-aware frame border — the console fill stays dark in every theme,
  // but the top edge and header divider reflect the active theme's divider hue.
  const frameBorder = activeTheme === 'light'
    ? 'border-slate-300'
    : activeTheme === 'midnight-obsidian'
    ? 'border-neutral-800'
    : 'border-slate-700';

  // Theme-aware chrome — el cuerpo del terminal (xterm) sigue oscuro en todos los
  // temas (diseño VS Code), pero el chrome (panel, muesca, header, botones) adopta
  // la paleta del tema, igual que AIAssistant/Sidebar.
  const isLight    = activeTheme === 'light';
  const isObsidian = activeTheme === 'midnight-obsidian';
  const panelBg    = isLight ? 'bg-slate-50'    : isObsidian ? 'bg-black'       : 'bg-slate-950';
  const notchBg    = isLight ? 'bg-slate-200 hover:bg-slate-300 active:bg-slate-400'
                             : isObsidian ? 'bg-neutral-900 hover:bg-neutral-800 active:bg-neutral-700'
                             : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600';
  const notchGrip  = isLight ? 'bg-slate-400'   : isObsidian ? 'bg-neutral-700' : 'bg-slate-600';
  const headerBg   = isLight ? 'bg-white'       : isObsidian ? 'bg-[#080808]'   : 'bg-slate-900';
  const titleText  = isLight ? 'text-slate-700' : isObsidian ? 'text-neutral-200' : 'text-slate-200';
  const btnHover   = isLight ? 'hover:bg-slate-100' : isObsidian ? 'hover:bg-neutral-900' : 'hover:bg-slate-800';
  const btnIdle    = isLight ? 'text-slate-500' : 'text-slate-400';
  const btnHoverText = isLight ? 'hover:text-slate-800' : isObsidian ? 'hover:text-neutral-100' : 'hover:text-slate-200';
  const btnSurface = isLight ? 'bg-slate-100 hover:bg-slate-200' : isObsidian ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-slate-800 hover:bg-slate-700';

  return (
    <motion.div
      ref={panelRef}
      initial={{ y: '100%' }}
      animate={{ y: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={heightStyle}
      aria-hidden={!isOpen}
      tabIndex={isOpen ? undefined : -1}
      className={`fixed left-0 right-0 z-40 ${panelBg} border-t ${frameBorder} shadow-2xl flex flex-col font-sans select-none ${panelHeightClass} ${isOpen ? '' : 'pointer-events-none'}`}
      id="console-bottom-sheet"
    >
        {/* Resize/drag notch */}
        <div
          onPointerDown={handleResizeStart}
          className={`w-full h-5 ${notchBg} flex items-center justify-center cursor-row-resize select-none touch-none`}
        >
          <div className={`w-12 h-1.5 ${notchGrip} rounded-full pointer-events-none`} />
        </div>

        {/* Header */}
        <div className={`${headerBg} px-4 py-2 flex items-center justify-between border-b ${frameBorder}`}>
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-indigo-400 shrink-0" />
            <h3 className={`font-semibold text-xs tracking-tight ${titleText} uppercase`}>
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

            {/* Explain with AI tutor button — shown when a Python error is detected */}
            {hasError && !isRunning && aiReady && onExplainError && (
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
                      : `${btnSurface} text-indigo-400`
                  }`}
                >
                  <BarChart2 className="h-3.5 w-3.5" />
                  <span>{exitResult.generatedFiles.length} {t('plotsLabel')}</span>
                </button>
                <button
                  onClick={() => exitResult.generatedFiles.forEach((f, i) => setTimeout(() => handleDownload(f), i * 300))}
                  className={`p-1 rounded transition-colors ${btnSurface} ${btnIdle} hover:text-emerald-400`}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
              </>
            )}

            {/* Clear button */}
            {(exitResult || isRunning) && (
              <button
                onClick={handleClear}
                className={`p-1 ${btnHover} ${btnIdle} hover:text-rose-400 rounded transition-colors`}
                title={t('consoleClearTooltip')}
                id="btn-clear-console"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => { setCustomHeight(null); onToggleExpand(); }}
              className={`p-1 ${btnHover} ${btnIdle} ${btnHoverText} rounded transition-colors`}
              id="btn-toggle-expand-console"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            <button
              onClick={onClose}
              className={`p-1 ${btnHover} ${btnIdle} ${btnHoverText} rounded transition-colors`}
              id="btn-close-console"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Subtle tutor hint — shown discreetly when a Python error is detected */}
        {hasError && !isRunning && aiReady && onExplainError && !hintDismissed && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-indigo-950/40 border-b border-indigo-500/20 text-[11px] text-indigo-300/90">
            <button
              onClick={onExplainError}
              className="flex items-center gap-1.5 flex-1 min-w-0 text-left hover:text-indigo-200 transition-colors"
            >
              <Sparkles className="h-3 w-3 shrink-0 text-indigo-400" />
              <span className="truncate">{t('aiErrorHint')}</span>
            </button>
            <button
              onClick={() => setHintDismissed(true)}
              className="p-0.5 rounded text-indigo-400/70 hover:text-indigo-200 hover:bg-indigo-500/10 transition-colors shrink-0"
              title={t('dismissNotification')}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

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
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 italic gap-2 pointer-events-none">
              <Terminal className="h-8 w-8 text-slate-600" />
              <span className="text-xs">{t('waiting')}</span>
            </div>
          )}

          {/* Plots panel — overlays when viewMode === 'plots' */}
          {viewMode === 'plots' && exitResult?.generatedFiles?.length ? (
            <div className="absolute inset-0 overflow-auto p-4 bg-[#0b0f19]">
              <PlotsPanel projectId={projectId} files={exitResult.generatedFiles} />
            </div>
          ) : null}
        </div>
    </motion.div>
  );
}
