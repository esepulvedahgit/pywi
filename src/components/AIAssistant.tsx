import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, Minimize2, Sparkles, Send, Trash2, Zap, Code2, Lightbulb, Copy, Check, RotateCcw, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { ExecutionResult, ChatMessage, TokenUsage, IdeContext, DiffProposal, FileItem, Project } from '../types';
import { useT } from '../i18n';
import { lineDiff } from '../lib/lineDiff';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  activeTheme: string;
  code: string;
  executionResult: ExecutionResult | null;
  language: string;
  userId: string;
  aiReady: boolean; // true when config is validated and assistant can be used
  getEditorContext: () => IdeContext;
  onApplyEdit: (proposal: Pick<DiffProposal, 'target' | 'content'>) => void;
  currentFile: FileItem | null;
  currentProject: Project | null;
  /** Pre-filled command dispatched from outside the panel (e.g. "Explain error", inline gen) */
  aiCommand?: { text: string; nonce: number } | null;
  /** Lines currently selected in the editor; shown as a badge above the input */
  selectionInfo?: { fromLine: number; toLine: number } | null;
  /** Collapses the editor selection so the badge disappears */
  onClearSelection?: () => void;
}

// Bloque de código con botón de copiar al portapapeles
function CodeBlock({ code, lang, isLight }: { code: string; lang: string; isLight: boolean }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(code).then(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setCopied(true);
        timerRef.current = setTimeout(() => setCopied(false), 1500);
      }).catch(() => {/* ignore */});
    } catch {/* ignore en contextos sin clipboard */}
  };

  return (
    <div className="relative group my-2">
      <pre className="rounded-md bg-slate-900/80 border border-slate-700/60 p-3 pr-16 overflow-x-auto text-[11px] font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap select-text">
        {lang && <span className="block text-[9px] text-slate-500 uppercase tracking-widest mb-1 select-none">{lang}</span>}
        {code}
      </pre>
      <button
        onClick={handleCopy}
        title={copied ? t('aiCopiedCode') : t('aiCopyCode')}
        className={`absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all select-none
          ${copied
            ? 'bg-emerald-600/80 text-emerald-100'
            : isLight
              ? 'bg-slate-700/70 hover:bg-slate-600/90 text-slate-300 hover:text-white'
              : 'bg-slate-700/60 hover:bg-slate-600/80 text-slate-400 hover:text-slate-100'
          }`}
      >
        {copied
          ? <><Check className="h-3 w-3" />{t('aiCopiedCode')}</>
          : <><Copy className="h-3 w-3" />{t('aiCopyCode')}</>
        }
      </button>
    </div>
  );
}

// ── Diff proposal parsing ─────────────────────────────────────────────────────

/**
 * Extract all <diff_proposal> blocks from an assistant message.
 * Returns proposals with their "before" content captured at parse time.
 */
function parseDiffProposals(text: string, ctx: IdeContext): DiffProposal[] {
  const PROPOSAL_RE = /<diff_proposal\s+target="(selection|file)"\s+description="([^"]*)">([\s\S]*?)<\/diff_proposal>/g;
  const proposals: DiffProposal[] = [];
  let match: RegExpExecArray | null;
  while ((match = PROPOSAL_RE.exec(text)) !== null) {
    const target = match[1] as 'selection' | 'file';
    const description = match[2];
    // Strip the surrounding ```python ... ``` fence if present
    let content = match[3].trim();
    const fenceMatch = content.match(/^```(?:\w+)?\n?([\s\S]*?)```$/);
    if (fenceMatch) content = fenceMatch[1].trimEnd();

    // Capture "before" for diff display at parse time
    const beforeContent = target === 'selection'
      ? (ctx.selection?.text ?? '')
      : (ctx.code ?? '');

    proposals.push({ target, description, content, beforeContent });
  }
  return proposals;
}

/** Strip all <diff_proposal> blocks from text before markdown rendering. */
function stripDiffProposals(text: string): string {
  return text.replace(/<diff_proposal[\s\S]*?<\/diff_proposal>/g, '').trim();
}

// ── DiffProposalCard component ────────────────────────────────────────────────

interface DiffProposalCardProps {
  proposal: DiffProposal;
  isLight: boolean;
  onApply: () => void;
  onReject: () => void;
}

function DiffProposalCard({ proposal, isLight, onApply, onReject }: DiffProposalCardProps) {
  const [showDiff, setShowDiff] = useState(false);

  const bgCard = isLight
    ? 'bg-white border border-slate-200 shadow-sm'
    : 'bg-slate-800/80 border border-slate-700/60';

  const headerBg = isLight ? 'bg-slate-50 border-b border-slate-200' : 'bg-slate-900/60 border-b border-slate-700/40';
  const labelColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const descColor = isLight ? 'text-slate-800' : 'text-slate-200';

  const targetLabel = proposal.target === 'file' ? '📄 Archivo completo' : '✂️ Selección';

  const diffRows = showDiff && proposal.beforeContent !== undefined
    ? lineDiff(proposal.beforeContent, proposal.content)
    : [];

  if (proposal.applied) {
    return (
      <div className={`mt-2 rounded-xl px-3 py-2 flex items-center gap-2 text-xs ${isLight ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-emerald-950/30 border border-emerald-700/40 text-emerald-400'}`}>
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span>Cambio aplicado — <span className="opacity-70">{proposal.description}</span></span>
      </div>
    );
  }

  if (proposal.rejected) {
    return (
      <div className={`mt-2 rounded-xl px-3 py-2 flex items-center gap-2 text-xs ${isLight ? 'bg-slate-100 border border-slate-200 text-slate-400' : 'bg-slate-900/40 border border-slate-700/30 text-slate-600'}`}>
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Rechazado — <span className="opacity-70">{proposal.description}</span></span>
      </div>
    );
  }

  return (
    <div className={`mt-2 rounded-xl overflow-hidden ${bgCard}`}>
      {/* Header */}
      <div className={`px-3 py-2 flex items-center justify-between gap-2 ${headerBg}`}>
        <div className="min-w-0">
          <span className={`text-[10px] font-mono uppercase tracking-wider ${labelColor}`}>{targetLabel}</span>
          <p className={`text-xs font-medium leading-tight mt-0.5 ${descColor}`}>{proposal.description}</p>
        </div>
        <button
          onClick={() => setShowDiff(v => !v)}
          className={`shrink-0 flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors ${isLight ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-700 text-slate-400'}`}
          title={showDiff ? 'Ocultar diff' : 'Ver diff'}
        >
          {showDiff ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          diff
        </button>
      </div>

      {/* Diff view */}
      {showDiff && (
        <div className="overflow-x-auto max-h-48 text-[11px] font-mono leading-5">
          {diffRows.length === 0 ? (
            <div className={`px-3 py-2 ${isLight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/20 text-emerald-400'}`}>
              + (inserción vacía / sin contexto previo)
            </div>
          ) : diffRows.map((row, i) => (
            <div
              key={i}
              className={
                row.type === 'added'
                  ? isLight ? 'bg-emerald-50 text-emerald-800' : 'bg-emerald-950/30 text-emerald-300'
                  : row.type === 'removed'
                    ? isLight ? 'bg-rose-50 text-rose-700' : 'bg-rose-950/30 text-rose-400'
                    : isLight ? 'text-slate-500' : 'text-slate-500'
              }
            >
              <span className={`select-none pr-2 pl-2 font-bold ${row.type === 'added' ? 'text-emerald-500' : row.type === 'removed' ? 'text-rose-500' : 'opacity-0'}`}>
                {row.type === 'added' ? '+' : row.type === 'removed' ? '−' : ' '}
              </span>
              {row.text}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 flex gap-2 justify-end">
        <button
          onClick={onReject}
          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-700/60'}`}
        >
          <XCircle className="h-3.5 w-3.5" />
          Rechazar
        </button>
        <button
          onClick={onApply}
          className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-sm"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Aplicar
        </button>
      </div>
    </div>
  );
}

// Minimal markdown renderer: bold, inline code, fenced code blocks, line breaks
function renderMarkdown(text: string, isLight: boolean): React.ReactNode[] {
  const blocks = text.split(/(```[\s\S]*?```)/g);
  return blocks.map((block, bi) => {
    if (block.startsWith('```')) {
      const lines = block.slice(3).split('\n');
      const lang = lines[0].trim();
      const code = lines.slice(1).join('\n').replace(/```$/, '').trimEnd();
      return <React.Fragment key={bi}><CodeBlock code={code} lang={lang} isLight={isLight} /></React.Fragment>;
    }
    // Inline: bold **x**, inline code `x`, line breaks
    const parts = block.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <span key={bi}>
        {parts.map((part, pi) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={pi} className="font-semibold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            return <code key={pi} className="bg-slate-800/70 border border-slate-700/40 rounded px-1 py-0.5 text-[11px] font-mono text-amber-300">{part.slice(1, -1)}</code>;
          }
          return <span key={pi}>{part.split('\n').map((line, li, arr) => (
            <React.Fragment key={li}>{line}{li < arr.length - 1 && <br />}</React.Fragment>
          ))}</span>;
        })}
      </span>
    );
  });
}

// ── Token usage / cost tracking ──────────────────────────────────────────────

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI (USD per 1M tokens)
  'gpt-4o':            { input: 5.00,  output: 15.00 },
  'gpt-4o-mini':       { input: 0.15,  output: 0.60  },
  'gpt-4.1':           { input: 2.00,  output: 8.00  },
  'gpt-4.1-mini':      { input: 0.40,  output: 1.60  },
  'gpt-3.5-turbo':     { input: 0.50,  output: 1.50  },
  // DeepSeek
  'deepseek-chat':     { input: 0.27,  output: 1.10  },
  'deepseek-coder':    { input: 0.27,  output: 1.10  },
  // Gemini
  'gemini-2.5-pro':    { input: 1.25,  output: 10.00 },
  'gemini-2.5-flash':  { input: 0.15,  output: 0.60  },
  'gemini-2.0-flash':  { input: 0.10,  output: 0.40  },
  'gemini-1.5-pro':    { input: 3.50,  output: 10.50 },
  'gemini-1.5-flash':  { input: 0.075, output: 0.30  },
};

function calcCost(model: string, usage: TokenUsage): number | null {
  const p = MODEL_PRICING[model];
  if (!p) return null;
  return (usage.promptTokens / 1_000_000) * p.input
       + (usage.completionTokens / 1_000_000) * p.output;
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const ZERO_USAGE: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

// ── Floating panel geometry (desktop mode) ────────────────────────────────────

const FLOAT_KEY = 'py_ide_ai_float';
const MIN_W = 320, MIN_H = 360, MAX_W = 720;

type FloatRect = { top: number; left: number; width: number; height: number };

function clampSize(r: FloatRect): FloatRect {
  const maxH = window.innerHeight * 0.92;
  return {
    ...r,
    width:  Math.min(MAX_W, Math.max(MIN_W, r.width)),
    height: Math.min(maxH, Math.max(MIN_H, r.height)),
  };
}

function clampPos(r: FloatRect): FloatRect {
  return {
    ...r,
    top:  Math.min(window.innerHeight - 80, Math.max(0, r.top)),
    left: Math.min(window.innerWidth  - 80, Math.max(-r.width + 80, r.left)),
  };
}

function defaultFloatRect(): FloatRect {
  const w = 400;
  const h = Math.min(640, window.innerHeight * 0.78);
  return { top: 56, left: window.innerWidth - w - 12, width: w, height: h };
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AIAssistant({
  isOpen,
  onClose,
  isExpanded,
  onToggleExpand,
  activeTheme,
  code,
  executionResult,
  language,
  userId,
  aiReady,
  getEditorContext,
  onApplyEdit,
  currentFile: _currentFile,
  currentProject: _currentProject,
  aiCommand,
  selectionInfo,
  onClearSelection,
}: AIAssistantProps) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const [sessionUsage, setSessionUsage] = useState<TokenUsage>(ZERO_USAGE);
  const [currentModel, setCurrentModel] = useState<string>('');
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Tracks whether the intro greeting has been requested for this chat session
  const introRequestedRef = useRef(false);
  // Caches the model's intro greeting so "Borrar" can restore it instantly without a new API call
  const cachedIntroRef = useRef<ChatMessage | null>(null);
  // Tracks the last aiCommand nonce we handled — avoids re-firing the same command
  const lastHandledNonceRef = useRef<number | null>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // External command dispatch: fires sendMessage when the panel is open, ready, and idle.
  // If the intro call is still in progress (isThinking), the effect re-runs when it finishes.
  useEffect(() => {
    if (!aiCommand) return;
    if (!isOpen || !aiReady) return;
    if (aiCommand.nonce === lastHandledNonceRef.current) return;
    if (isThinking) return; // wait for intro or previous message to complete
    lastHandledNonceRef.current = aiCommand.nonce;
    sendMessage(aiCommand.text);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiCommand, isOpen, aiReady, isThinking]);

  // Auto-presentation: when the panel opens with an empty chat and a valid config,
  // ask the model to introduce itself before the user types anything.
  useEffect(() => {
    if (!isOpen || !aiReady || messages.length > 0 || isThinking || introRequestedRef.current) return;
    introRequestedRef.current = true;
    setIsThinking(true);
    const token = localStorage.getItem('py_ide_token');
    fetch('/api/ai/intro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(r => r.json())
      .then(data => {
        if (data.reply) {
          const introMsg: ChatMessage = { role: 'assistant', content: data.reply };
          cachedIntroRef.current = introMsg; // cache for instant restore on clear
          setMessages([introMsg]);
          if (data.usage) setSessionUsage(prev => ({
            promptTokens:     prev.promptTokens     + (data.usage.promptTokens     ?? 0),
            completionTokens: prev.completionTokens + (data.usage.completionTokens ?? 0),
            totalTokens:      prev.totalTokens      + (data.usage.totalTokens      ?? 0),
          }));
          if (data.model) setCurrentModel(data.model);
        }
      })
      .catch(() => {/* intro is best-effort; silence errors */})
      .finally(() => setIsThinking(false));
  }, [isOpen, aiReady, messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const sendMessage = useCallback(async (userContent: string) => {
    if (!userContent.trim() || isThinking) return;
    setError('');
    const newMsg: ChatMessage = { role: 'user', content: userContent.trim() };
    const updatedMsgs = [...messages, newMsg];
    setMessages(updatedMsgs);
    setInput('');
    setIsThinking(true);

    // Capture IDE context snapshot at the moment the user sends the message
    const ideContext = getEditorContext();

    // Insert an empty assistant message immediately — we'll stream text into it
    const placeholderIdx = updatedMsgs.length; // index of the incoming assistant msg
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    let fullText = '';

    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages: updatedMsgs, ideContext })
      });

      if (!res.ok || !res.body) {
        // Non-streaming error (e.g. auth failure before headers were sent)
        const data = await res.json().catch(() => ({})) as any;
        setError(data.error || 'Error al consultar la IA');
        // Remove the empty placeholder
        setMessages(prev => prev.slice(0, placeholderIdx));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const chunk = JSON.parse(trimmed) as any;
            if (chunk.type === 'delta' && chunk.text) {
              fullText += chunk.text;
              // Stream text into the placeholder message
              setMessages(prev => prev.map((m, i) =>
                i === placeholderIdx ? { ...m, content: fullText } : m
              ));
            } else if (chunk.type === 'done') {
              // Finalize: parse diff proposals and attach them
              const proposals = parseDiffProposals(fullText, ideContext);
              setMessages(prev => prev.map((m, i) =>
                i === placeholderIdx
                  ? { ...m, content: fullText, proposals: proposals.length > 0 ? proposals : undefined }
                  : m
              ));
              if (chunk.usage) {
                setSessionUsage(prev => ({
                  promptTokens:     prev.promptTokens     + (chunk.usage.promptTokens     ?? 0),
                  completionTokens: prev.completionTokens + (chunk.usage.completionTokens ?? 0),
                  totalTokens:      prev.totalTokens      + (chunk.usage.totalTokens      ?? 0),
                }));
              }
              if (chunk.model) setCurrentModel(chunk.model);
            } else if (chunk.type === 'error') {
              setError(chunk.error || 'Error al consultar la IA');
              if (!fullText) setMessages(prev => prev.slice(0, placeholderIdx));
            }
          } catch { /* skip malformed NDJSON line */ }
        }
      }

      // If stream ended with no text and no error — server already throws a
      // descriptive error for RECITATION/SAFETY/MAX_TOKENS, so this branch is a
      // last-resort safety net rather than the normal empty-response path.
      if (!fullText) {
        setError(t('aiNoTextResponse'));
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
          return prev;
        });
      }
    } catch {
      setError('Error de conexión');
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && !last.content) return prev.slice(0, -1);
        return prev;
      });
    } finally {
      setIsThinking(false);
    }
  }, [messages, isThinking, getEditorContext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // Chips send a short instruction — the IDE context (code, selection, stderr) is
  // attached automatically by sendMessage via getEditorContext(), so we no longer
  // need to paste the code into the chat message itself.
  const handleChip = (type: 'error' | 'code' | 'improve') => {
    const prompts: Record<string, string> = {
      error: t('aiExplainErrorPrompt'),
      code: 'Explica qué hace el código del archivo activo, paso a paso.',
      improve: 'Sugiere mejoras y buenas prácticas para el código del archivo activo.',
    };
    if (language === 'en') {
      prompts.code = 'Explain what the active file\'s code does, step by step.';
      prompts.improve = 'Suggest improvements and best practices for the active file\'s code.';
    }
    sendMessage(prompts[type]);
  };

  // ── Desktop vs Mobile detection ────────────────────────────────────────────
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Floating window geometry state ──────────────────────────────────────────
  const [floatRect, setFloatRect] = useState<FloatRect>(() => {
    try {
      const stored = localStorage.getItem(FLOAT_KEY);
      if (stored) {
        const r = JSON.parse(stored);
        // Guard against corrupted/manipulated values that would produce NaN
        const ok = r && ['top', 'left', 'width', 'height'].every(k => Number.isFinite(r[k]));
        if (ok) return clampSize(clampPos(r));
      }
    } catch { /* ignore */ }
    return defaultFloatRect();
  });
  const preExpandRectRef = useRef<FloatRect | null>(null);

  // Persist float geometry when it changes (desktop only)
  useEffect(() => {
    if (!isDesktop) return;
    try { localStorage.setItem(FLOAT_KEY, JSON.stringify(floatRect)); } catch { /* ignore */ }
  }, [floatRect, isDesktop]);

  // Reclamp on browser window resize so the panel stays visible
  useEffect(() => {
    const onResize = () => setFloatRect(prev => clampSize(clampPos(prev)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Mobile: resize bottom-sheet by dragging the top handle ──────────────────
  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const startY = e.clientY;
    const startH = panelRef.current?.offsetHeight ?? 400;
    const onMove = (ev: PointerEvent) => {
      const newH = Math.max(120, Math.min(window.innerHeight * 0.95, startH + (startY - ev.clientY)));
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

  // ── Desktop: drag the header to move the floating window ────────────────────
  const handleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start drag when the user clicks a button inside the header
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = floatRect.left;
    const startTop  = floatRect.top;
    const onMove = (ev: PointerEvent) => {
      setFloatRect(prev => clampPos({
        ...prev,
        left: startLeft + (ev.clientX - startX),
        top:  startTop  + (ev.clientY - startY),
      }));
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

  // ── Desktop: resize from edges/corners ──────────────────────────────────────
  type ResizeDir = 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right';
  const handleFloatResize = (e: React.PointerEvent<HTMLDivElement>, dir: ResizeDir) => {
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    const startX = e.clientX;
    const startY = e.clientY;
    const { top: st, left: sl, width: sw, height: sh } = floatRect;
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const next = { top: st, left: sl, width: sw, height: sh };
      if (dir === 'right'  || dir === 'bottom-right') next.width  = sw + dx;
      if (dir === 'left'   || dir === 'bottom-left')  { next.width = sw - dx; next.left = sl + dx; }
      if (dir === 'bottom' || dir === 'bottom-left' || dir === 'bottom-right') next.height = sh + dy;
      setFloatRect(clampPos(clampSize(next)));
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

  // ── Desktop: maximize / restore the floating window ─────────────────────────
  const handleExpandDesktop = () => {
    if (isExpanded) {
      if (preExpandRectRef.current) setFloatRect(preExpandRectRef.current);
      onToggleExpand();
    } else {
      preExpandRectRef.current = floatRect;
      const maxH = window.innerHeight * 0.92;
      setFloatRect(clampPos({ top: 8, left: window.innerWidth - MAX_W - 8, width: MAX_W, height: maxH }));
      onToggleExpand();
    }
  };

  // ── Theme-aware colors ───────────────────────────────────────────────────────
  const isLight    = activeTheme === 'light';
  const isObsidian = activeTheme === 'midnight-obsidian';
  // Background and border colours split so each mode applies borders differently
  const panelBg     = isLight ? 'bg-slate-50'  : isObsidian ? 'bg-black'    : 'bg-slate-950';
  const panelBorder = isLight ? 'border-slate-200' : isObsidian ? 'border-neutral-900' : 'border-slate-700/80';
  const headerBg    = isLight ? 'bg-white border-b border-slate-200'   : isObsidian ? 'bg-[#080808] border-b border-neutral-900' : 'bg-slate-900 border-b border-slate-800';
  const headerText  = isLight ? 'text-slate-700' : 'text-slate-200';
  const contentBg   = isLight ? 'bg-slate-50'  : isObsidian ? 'bg-black'    : 'bg-[#0b0f19]';
  const inputBg     = isLight ? 'bg-white border border-slate-300 text-slate-800 focus:border-indigo-400' : isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-100 focus:border-indigo-500' : 'bg-slate-800/60 border border-slate-700 text-slate-100 focus:border-indigo-500';
  const inputAreaBg = isLight ? 'bg-white border-t border-slate-200'   : isObsidian ? 'bg-[#080808] border-t border-neutral-900' : 'bg-slate-900 border-t border-slate-800';
  const userBubble  = 'bg-indigo-600 text-white';
  const aiBubble    = isLight ? 'bg-white border border-slate-200 text-slate-800' : isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-100' : 'bg-slate-800/70 border border-slate-700/50 text-slate-200';
  const chipStyle   = isLight ? 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200' : 'bg-slate-800/60 hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-300 border border-slate-700/50 hover:border-indigo-700/50';
  const iconBtn     = isLight ? 'p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors' : 'p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors';

  if (!isOpen) return null;

  const hasError = !!executionResult?.stderr;
  const hasCode  = !!code?.trim();

  // ── Shared inner content (identical in both modes) ───────────────────────────
  const innerContent = (
    <>
      {/* Header — also the drag handle in desktop mode */}
      <div
        className={`px-4 py-2 flex items-center justify-between select-none shrink-0 ${headerBg}${isDesktop ? ' cursor-grab active:cursor-grabbing' : ''}`}
        onPointerDown={isDesktop ? handleDragStart : undefined}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
          <h3 className={`font-semibold text-xs tracking-tight uppercase ${headerText}`}>
            {t('aiPanelTitle')}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {/* Token usage indicator — shows after first message */}
          {sessionUsage.totalTokens > 0 && (() => {
            const cost = calcCost(currentModel, sessionUsage);
            return (
              <div className="flex items-center gap-1 text-[10px] font-mono opacity-50 hover:opacity-100 transition-opacity mr-1">
                <span title={`Entrada: ${sessionUsage.promptTokens} | Salida: ${sessionUsage.completionTokens}`}>
                  ↑{formatTokens(sessionUsage.promptTokens)} ↓{formatTokens(sessionUsage.completionTokens)}
                </span>
                {cost !== null && <span title="Costo estimado de la sesión">~${cost.toFixed(4)}</span>}
                <button
                  onClick={() => { setSessionUsage(ZERO_USAGE); setCurrentModel(''); }}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                  title={t('aiResetUsage')}
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                </button>
              </div>
            );
          })()}
          {messages.length > 0 && (
            <button
              onClick={() => {
                // Restore cached greeting instantly — no new API call, no cost, no latency
                setMessages(cachedIntroRef.current ? [cachedIntroRef.current] : []);
                setError('');
                setSessionUsage(ZERO_USAGE);
              }}
              className={iconBtn}
              title={t('aiClearChat')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={isDesktop ? handleExpandDesktop : () => { setCustomHeight(null); onToggleExpand(); }}
            className={iconBtn}
            title={isExpanded ? t('consoleRestoreTooltip') : t('consoleMaximizeTooltip')}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={onClose} className={iconBtn} title={t('consoleCloseTooltip')}>
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick action chips */}
      <div className={`px-3 py-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0 ${inputAreaBg}`}>
        {hasError && (
          <button onClick={() => handleChip('error')} disabled={isThinking}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 disabled:opacity-40 ${chipStyle}`}>
            <Zap className="h-3 w-3" />{t('aiChipExplainError')}
          </button>
        )}
        {hasCode && (
          <button onClick={() => handleChip('code')} disabled={isThinking}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 disabled:opacity-40 ${chipStyle}`}>
            <Code2 className="h-3 w-3" />{t('aiChipExplainCode')}
          </button>
        )}
        {hasCode && (
          <button onClick={() => handleChip('improve')} disabled={isThinking}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 disabled:opacity-40 ${chipStyle}`}>
            <Lightbulb className="h-3 w-3" />{t('aiChipImprove')}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 ${contentBg} select-text`}>
        {messages.length === 0 && !isThinking && (
          <div className={`h-full flex flex-col items-center justify-center gap-3 py-8 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
            <Sparkles className="h-10 w-10 opacity-40" />
            <p className="text-xs text-center px-4 opacity-70">
              {aiReady ? t('aiInputPlaceholder') : t('aiNoConfig')}
            </p>
          </div>
        )}

        {messages.map((msg, msgIdx) => (
          <div key={msgIdx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
              msg.role === 'user' ? userBubble + ' rounded-br-sm' : aiBubble + ' rounded-bl-sm'
            }`}>
              {msg.role === 'assistant'
                ? <div className="space-y-1">{renderMarkdown(stripDiffProposals(msg.content), isLight)}</div>
                : <span className="whitespace-pre-wrap">{msg.content}</span>
              }
            </div>
            {/* Diff proposal cards below assistant messages */}
            {msg.role === 'assistant' && msg.proposals && msg.proposals.map((proposal, pIdx) => (
              <div key={pIdx} className="w-full max-w-[92%]">
                <DiffProposalCard
                  proposal={proposal}
                  isLight={isLight}
                  onApply={() => {
                    onApplyEdit({ target: proposal.target, content: proposal.content });
                    setMessages(prev => prev.map((m, mi) => {
                      if (mi !== msgIdx || !m.proposals) return m;
                      return { ...m, proposals: m.proposals.map((p, pi) => pi === pIdx ? { ...p, applied: true } : p) };
                    }));
                  }}
                  onReject={() => {
                    setMessages(prev => prev.map((m, mi) => {
                      if (mi !== msgIdx || !m.proposals) return m;
                      return { ...m, proposals: m.proposals.map((p, pi) => pi === pIdx ? { ...p, rejected: true } : p) };
                    }));
                  }}
                />
              </div>
            ))}
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className={`rounded-2xl rounded-bl-sm px-3 py-2 text-xs flex items-center gap-2 ${aiBubble}`}>
              <span className="inline-flex gap-1">
                {[0, 1, 2].map(d => (
                  <span key={d} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </span>
              <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{t('aiThinking')}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-[11px] text-rose-400 bg-rose-950/20 border border-rose-500/20 rounded-lg px-3 py-2 mx-2">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className={`px-3 py-2 flex flex-col gap-1.5 ${inputAreaBg}`}>
        {/* Selection badge: shown when the user has lines selected in the editor */}
        {selectionInfo && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg w-fit text-[11px] font-medium
            bg-indigo-500/10 border border-indigo-500/30
            ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            <Code2 className="h-3 w-3 shrink-0" />
            <span>
              {selectionInfo.fromLine === selectionInfo.toLine
                ? t('aiSelectionAttachedOne', { line: selectionInfo.fromLine })
                : t('aiSelectionAttached', { from: selectionInfo.fromLine, to: selectionInfo.toLine })}
            </span>
            {onClearSelection && (
              <button onClick={onClearSelection} title={t('aiClearSelectionTooltip')}
                className={`ml-0.5 transition-colors ${isLight ? 'hover:text-indigo-800' : 'hover:text-indigo-100'}`}>
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('aiInputPlaceholder')}
            disabled={isThinking}
            className={`flex-1 resize-none rounded-xl px-3 py-2 text-xs outline-none transition-colors leading-relaxed placeholder:opacity-50 disabled:opacity-40 ${inputBg}`}
            style={{ minHeight: '36px', maxHeight: '120px', overflow: 'auto' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isThinking}
            className="shrink-0 h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white flex items-center justify-center transition-all active:scale-95 shadow-md"
            title={t('aiSend')}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );

  // ── Render: Desktop = floating panel | Mobile = bottom-sheet ─────────────────
  return (
    <AnimatePresence>
      {isDesktop ? (
        /* ── Desktop floating window ── */
        <motion.div
          ref={panelRef}
          key="desktop-float"
          initial={{ opacity: 0, scale: 0.96, y: -8 }}
          animate={{ opacity: 1, scale: 1,    y:  0 }}
          exit={{    opacity: 0, scale: 0.96, y: -8 }}
          transition={{ type: 'spring', damping: 22, stiffness: 280 }}
          style={{
            position: 'fixed',
            top:    floatRect.top,
            left:   floatRect.left,
            width:  floatRect.width,
            height: floatRect.height,
            transformOrigin: 'top right',
            zIndex: 50,
          }}
          className={`flex flex-col font-sans overflow-hidden rounded-2xl shadow-2xl border ${panelBorder} ${panelBg}`}
          id="ai-assistant-panel"
          onAnimationComplete={() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })}
        >
          {innerContent}

          {/* Resize handles — invisible but pointer-interactive strips on each edge/corner */}
          {/* Left edge */}
          <div className="absolute left-0 top-10 bottom-10 w-1.5 cursor-ew-resize z-10 hover:bg-indigo-500/10 rounded-l-2xl transition-colors"
            onPointerDown={e => handleFloatResize(e, 'left')} />
          {/* Right edge */}
          <div className="absolute right-0 top-10 bottom-10 w-1.5 cursor-ew-resize z-10 hover:bg-indigo-500/10 rounded-r-2xl transition-colors"
            onPointerDown={e => handleFloatResize(e, 'right')} />
          {/* Bottom edge */}
          <div className="absolute bottom-0 left-10 right-10 h-1.5 cursor-ns-resize z-10 hover:bg-indigo-500/10 rounded-b-2xl transition-colors"
            onPointerDown={e => handleFloatResize(e, 'bottom')} />
          {/* Bottom-left corner */}
          <div className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-10"
            onPointerDown={e => handleFloatResize(e, 'bottom-left')} />
          {/* Bottom-right corner */}
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
            onPointerDown={e => handleFloatResize(e, 'bottom-right')} />
        </motion.div>
      ) : (
        /* ── Mobile bottom-sheet (unchanged) ── */
        <motion.div
          ref={panelRef}
          key="mobile-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={customHeight ? { height: `${customHeight}px` } : undefined}
          className={`fixed bottom-0 left-0 right-0 z-[41] shadow-2xl flex flex-col font-sans select-none border-t ${panelBorder} ${panelBg} ${
            !customHeight ? (isExpanded ? 'h-[90vh]' : 'h-[50vh] sm:h-[55vh]') : ''
          }`}
          id="ai-assistant-panel"
          onAnimationComplete={() => messagesEndRef.current?.scrollIntoView({ behavior: 'instant' })}
        >
          {/* Mobile drag handle — touch-none prevents browser scroll interpretation */}
          <div
            onPointerDown={handleResizeStart}
            className={`w-full h-5 flex items-center justify-center cursor-row-resize select-none touch-none ${isLight ? 'bg-slate-200 hover:bg-slate-300 active:bg-slate-400' : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600'}`}
          >
            <div className={`w-12 h-1.5 rounded-full pointer-events-none ${isLight ? 'bg-slate-300' : 'bg-slate-600'}`} />
          </div>
          {innerContent}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
