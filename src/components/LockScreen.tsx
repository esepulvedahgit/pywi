import React, { useState, useRef, useEffect } from 'react';
import { Lock, LogOut, Eye, EyeOff } from 'lucide-react';
import { useT } from '../i18n';
import { User } from '../types';

interface LockScreenProps {
  user: User;
  activeTheme: 'light' | 'vibrant-dark' | 'midnight-obsidian';
  onUnlock: () => void;
  onLogout: () => void;
}

export default function LockScreen({ user, activeTheme, onUnlock, onLogout }: LockScreenProps) {
  const tl = useT();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus el campo al montar
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('py_ide_token', data.token);
        onUnlock();
      } else {
        setError(tl('lockScreenPasswordError'));
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError(tl('errorConnectionFallback'));
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = activeTheme !== 'light';

  const overlayBg = activeTheme === 'light'
    ? 'bg-slate-200/80 backdrop-blur-sm'
    : 'bg-black/70 backdrop-blur-sm';

  const cardBg = activeTheme === 'light'
    ? 'bg-white border-slate-200 shadow-xl'
    : activeTheme === 'midnight-obsidian'
      ? 'bg-[#0a0a0a] border-neutral-800 shadow-2xl'
      : 'bg-slate-950 border-slate-800 shadow-2xl';

  const titleColor = isDark ? 'text-white' : 'text-slate-900';
  const subtitleColor = isDark ? 'text-slate-400' : 'text-slate-500';

  const inputClass = activeTheme === 'light'
    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-300'
    : activeTheme === 'midnight-obsidian'
      ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-800'
      : 'bg-slate-900 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-800';

  const avatarClass = activeTheme === 'light'
    ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
    : 'bg-indigo-900/50 text-indigo-300 border-indigo-700';

  const logoutClass = activeTheme === 'light'
    ? 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${overlayBg}`}>
      <div className={`rounded-2xl border p-8 w-full max-w-sm mx-4 ${cardBg}`}>

        {/* Avatar + lock icon + título */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className={`h-16 w-16 rounded-full border-2 flex items-center justify-center text-xl font-bold uppercase ${avatarClass}`}>
              {(user.username?.charAt(0) || user.email?.charAt(0) || '?').toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center">
              <Lock className="h-3 w-3 text-white" />
            </div>
          </div>
          <h2 className={`text-base font-bold mt-1 ${titleColor}`}>{tl('lockScreenTitle')}</h2>
          <p className={`text-xs text-center mt-1.5 leading-relaxed px-2 ${subtitleColor}`}>
            {tl('lockScreenSubtitle')}
          </p>
          <p className={`text-xs font-medium mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {user.email}
          </p>
        </div>

        {/* Formulario de desbloqueo */}
        <form onSubmit={handleUnlock} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder={tl('lockScreenPasswordPlaceholder')}
              className={`w-full px-4 py-3 pr-10 rounded-xl border text-sm outline-none transition-all ${inputClass}`}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-80 ${subtitleColor}`}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <p className="text-red-500 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading || !password.trim()}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {isLoading ? tl('lockScreenUnlocking') : tl('lockScreenUnlock')}
          </button>
        </form>

        {/* Enlace cierre de sesión completo */}
        <button
          type="button"
          onClick={onLogout}
          className={`mt-4 w-full flex items-center justify-center gap-2 text-xs py-2 rounded-lg transition-colors ${logoutClass}`}
        >
          <LogOut className="h-3.5 w-3.5" />
          {tl('lockScreenLogout')}
        </button>
      </div>
    </div>
  );
}
