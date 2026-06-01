import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, Minimize2, Sparkles, Send, Trash2, Zap, Code2, Lightbulb, Copy, Check } from 'lucide-react';
import { ExecutionResult, ChatMessage } from '../types';
import { useT } from '../i18n';

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
}: AIAssistantProps) {
  const t = useT();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState('');
  const [customHeight, setCustomHeight] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

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

    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ messages: updatedMsgs })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al consultar la IA');
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setIsThinking(false);
    }
  }, [messages, isThinking]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleChip = (type: 'error' | 'code' | 'improve') => {
    const codeSnippet = code ? `\`\`\`python\n${code.slice(0, 2000)}\n\`\`\`` : '';
    const errorSnippet = executionResult?.stderr ? `\nError:\n\`\`\`\n${executionResult.stderr.slice(0, 1000)}\n\`\`\`` : '';

    const prompts: Record<string, string> = {
      error: `Explica este error de Python y cómo corregirlo:${errorSnippet}\n\nCódigo:\n${codeSnippet}`,
      code: `Explica qué hace este código Python paso a paso:\n${codeSnippet}`,
      improve: `Sugiere mejoras o buenas prácticas para este código Python:\n${codeSnippet}`,
    };
    if (language === 'en') {
      prompts.error = `Explain this Python error and how to fix it:${errorSnippet}\n\nCode:\n${codeSnippet}`;
      prompts.code = `Explain what this Python code does step by step:\n${codeSnippet}`;
      prompts.improve = `Suggest improvements and best practices for this Python code:\n${codeSnippet}`;
    }
    sendMessage(prompts[type]);
  };

  // Drag-to-resize
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

  // Theme-aware colors (mirrors ConsoleSheet dark style; light gets a soft variant)
  const isLight = activeTheme === 'light';
  const isObsidian = activeTheme === 'midnight-obsidian';
  const panelBg = isLight ? 'bg-slate-50 border-t border-slate-200' : isObsidian ? 'bg-black border-t border-neutral-900' : 'bg-slate-950 border-t border-slate-700/80';
  const headerBg = isLight ? 'bg-white border-b border-slate-200' : isObsidian ? 'bg-[#080808] border-b border-neutral-900' : 'bg-slate-900 border-b border-slate-800';
  const headerText = isLight ? 'text-slate-700' : 'text-slate-200';
  const contentBg = isLight ? 'bg-slate-50' : isObsidian ? 'bg-black' : 'bg-[#0b0f19]';
  const inputBg = isLight ? 'bg-white border border-slate-300 text-slate-800 focus:border-indigo-400' : isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-100 focus:border-indigo-500' : 'bg-slate-800/60 border border-slate-700 text-slate-100 focus:border-indigo-500';
  const inputAreaBg = isLight ? 'bg-white border-t border-slate-200' : isObsidian ? 'bg-[#080808] border-t border-neutral-900' : 'bg-slate-900 border-t border-slate-800';
  const userBubble = 'bg-indigo-600 text-white';
  const aiBubble = isLight ? 'bg-white border border-slate-200 text-slate-800' : isObsidian ? 'bg-neutral-900 border border-neutral-800 text-neutral-100' : 'bg-slate-800/70 border border-slate-700/50 text-slate-200';
  const chipStyle = isLight ? 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200' : 'bg-slate-800/60 hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-300 border border-slate-700/50 hover:border-indigo-700/50';
  const iconBtn = isLight ? 'p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded transition-colors' : 'p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors';

  if (!isOpen) return null;

  const hasError = !!executionResult?.stderr;
  const hasCode = !!code?.trim();

  return (
    <AnimatePresence>
      <motion.div
        ref={panelRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={customHeight ? { height: `${customHeight}px` } : undefined}
        className={`fixed bottom-0 left-0 right-0 z-39 shadow-2xl flex flex-col font-sans select-none ${panelBg} ${
          !customHeight ? (isExpanded ? 'h-[90vh]' : 'h-[50vh] sm:h-[55vh]') : ''
        }`}
        id="ai-assistant-panel"
      >
        {/* Drag handle — touch-none evita que el browser interprete el gesto como scroll */}
        <div
          onPointerDown={handleResizeStart}
          className={`w-full h-5 flex items-center justify-center cursor-row-resize select-none touch-none ${isLight ? 'bg-slate-200 hover:bg-slate-300 active:bg-slate-400' : 'bg-slate-800 hover:bg-slate-700 active:bg-slate-600'}`}
        >
          <div className={`w-12 h-1.5 rounded-full pointer-events-none ${isLight ? 'bg-slate-300' : 'bg-slate-600'}`} />
        </div>

        {/* Header */}
        <div className={`px-4 py-2 flex items-center justify-between ${headerBg}`}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <h3 className={`font-semibold text-xs tracking-tight uppercase ${headerText}`}>
              {t('aiPanelTitle')}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(''); }}
                className={iconBtn}
                title={t('aiClearChat')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => { setCustomHeight(null); onToggleExpand(); }}
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
            <button
              onClick={() => handleChip('error')}
              disabled={isThinking}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 disabled:opacity-40 ${chipStyle}`}
            >
              <Zap className="h-3 w-3" />
              {t('aiChipExplainError')}
            </button>
          )}
          {hasCode && (
            <button
              onClick={() => handleChip('code')}
              disabled={isThinking}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 disabled:opacity-40 ${chipStyle}`}
            >
              <Code2 className="h-3 w-3" />
              {t('aiChipExplainCode')}
            </button>
          )}
          {hasCode && (
            <button
              onClick={() => handleChip('improve')}
              disabled={isThinking}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 disabled:opacity-40 ${chipStyle}`}
            >
              <Lightbulb className="h-3 w-3" />
              {t('aiChipImprove')}
            </button>
          )}
        </div>

        {/* Messages */}
        <div className={`flex-1 overflow-y-auto px-3 py-3 space-y-3 ${contentBg} select-text`}>
          {messages.length === 0 && !isThinking && (
            <div className={`h-full flex flex-col items-center justify-center gap-3 py-8 ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>
              <Sparkles className="h-10 w-10 opacity-40" />
              <p className="text-xs text-center px-4 opacity-70">{t('aiNoConfig').includes('Configura') ? t('aiInputPlaceholder') : t('aiInputPlaceholder')}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${msg.role === 'user' ? userBubble + ' rounded-br-sm' : aiBubble + ' rounded-bl-sm'}`}>
                {msg.role === 'assistant'
                  ? <div className="space-y-1">{renderMarkdown(msg.content, isLight)}</div>
                  : <span className="whitespace-pre-wrap">{msg.content}</span>
                }
              </div>
            </div>
          ))}

          {isThinking && (
            <div className="flex justify-start">
              <div className={`rounded-2xl rounded-bl-sm px-3 py-2 text-xs flex items-center gap-2 ${aiBubble}`}>
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map(d => (
                    <span
                      key={d}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                      style={{ animationDelay: `${d * 0.15}s` }}
                    />
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
        <div className={`px-3 py-2 flex items-end gap-2 ${inputAreaBg}`}>
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
      </motion.div>
    </AnimatePresence>
  );
}
