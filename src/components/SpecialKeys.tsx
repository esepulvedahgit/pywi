import React from 'react';
import { Space, X } from 'lucide-react';

interface SpecialKeysProps {
  onInsertChar: (char: string) => void;
  onClose?: () => void;
}

export default function SpecialKeys({ onInsertChar, onClose }: SpecialKeysProps) {
  const keys = [
    { label: 'Tab', val: '    ', description: 'Indentación de 4 espacios' },
    { label: ':', val: ':' },
    { label: '=', val: '=' },
    { label: '_', val: '_' },
    { label: '[', val: '[' },
    { label: ']', val: ']' },
    { label: '{', val: '{' },
    { label: '}', val: '}' },
    { label: '(', val: '(' },
    { label: ')', val: ')' },
    { label: '"', val: '"' },
    { label: "'", val: "'" },
    { label: ',', val: ',' },
    { label: '.', val: '.' },
    { label: '/', val: '/' },
    { label: '+', val: '+' },
    { label: '-', val: '-' },
    { label: '*', val: '*' },
    { label: '#', val: '#' },
  ];

  return (
    <div 
      className="bg-slate-900 border-b border-slate-700/60 p-2 overflow-x-auto flex items-center gap-1.5 scrollbar-thin select-none"
      id="mobile-special-keys-panel"
    >
      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1 shrink-0 hidden sm:inline">
        Teclado Móvil:
      </span>
      {keys.map((k) => (
        <button
          key={k.label}
          onClick={() => onInsertChar(k.val)}
          title={k.description || `Insertar ${k.label}`}
          className="shrink-0 h-9 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-indigo-600 active:text-white rounded-md text-xs font-mono font-bold shadow-sm border border-slate-700/45 transition-all flex items-center justify-center min-w-[34px]"
          id={`key-btn-${k.label === 'Tab' ? 'tab' : k.label}`}
        >
          {k.label === 'Tab' ? (
            <span className="flex items-center gap-1 text-[10px] uppercase font-semibold">
              <Space className="h-3 w-3" /> Tab
            </span>
          ) : (
            k.label
          )}
        </button>
      ))}
      
      {onClose && (
        <button
          onClick={onClose}
          title="Ocultar teclado táctil"
          className="shrink-0 h-9 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 active:bg-rose-600 active:text-white rounded-md text-xs font-semibold tracking-wide border border-rose-500/25 transition-all flex items-center gap-1 ml-auto"
          id="key-btn-close-kb"
        >
          <X className="h-3.5 w-3.5" />
          <span>Ocultar</span>
        </button>
      )}
    </div>
  );
}
