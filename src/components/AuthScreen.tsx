import React, { useState } from 'react';
import { Shield, LogIn, UserPlus } from 'lucide-react';
import { User } from '../types';
import { useT } from '../i18n';
import { isValidPassword } from '../utils/passwordPolicy';
import PasswordStrengthMeter from './PasswordStrengthMeter';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  adminExists: boolean;
}

export default function AuthScreen({ onLoginSuccess, adminExists }: AuthScreenProps) {
  const t = useT();
  const [view, setView] = useState<'login' | 'register' | 'forgot'>('login');
  const isRegistering = view === 'register';
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('errorLoginFallback'));
      }

      if (data.token) {
        localStorage.setItem('py_ide_token', data.token);
      }
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || t('errorConnectionFallback'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidPassword(password)) {
      setError(t('passwordErrorTooShort'));
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t('errorRegisterFallback'));
      }

      if (data.token) {
        localStorage.setItem('py_ide_token', data.token);
      }
      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || t('errorConnectionFallback'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail) { setError(t('errorEmptyFields')); return; }
    setLoading(true);
    setError('');
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      setForgotSent(true);
    } catch {
      setError(t('errorConnectionFallback'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans" id="auth-screen-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center" id="logo-icon">
          <img
            src="/images/logo_pywi.png"
            alt="PyWI Logo"
            className="h-24 w-24 drop-shadow-lg"
          />
        </div>
        <h2 className="mt-2 text-center text-2xl font-bold tracking-tight text-slate-800">
          PyWI
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500 font-medium">
          Python Web IDE
        </p>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md" id="auth-form-card">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2" id="auth-error">
              <Shield className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {view === 'forgot' ? (
            <div className="pb-4 mb-2 border-b border-slate-200" id="auth-tab">
              <p className="text-center font-bold text-xs uppercase tracking-wider text-indigo-600 border-b-2 border-indigo-700 pb-3">
                {t('forgotPasswordTitle')}
              </p>
            </div>
          ) : !adminExists ? (
            <div className="flex border-b border-slate-200 mb-6" id="auth-tab">
              <button
                onClick={() => { setView('login'); setError(''); }}
                className={`flex-1 pb-3 text-center font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                  view === 'login'
                    ? 'border-indigo-700 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
                id="tab-login"
              >
                {t('authTabLogin')}
              </button>
              <button
                onClick={() => { setView('register'); setError(''); }}
                className={`flex-1 pb-3 text-center font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                  view === 'register'
                    ? 'border-indigo-700 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
                id="tab-register"
              >
                {t('authTabRegister')}
              </button>
            </div>
          ) : (
            <div className="pb-4 mb-2 border-b border-slate-200" id="auth-tab">
              <p className="text-center font-bold text-xs uppercase tracking-wider text-indigo-600 border-b-2 border-indigo-700 pb-3">
                {t('authTabLogin')}
              </p>
            </div>
          )}

          {view === 'forgot' ? (
            <div className="space-y-4 text-slate-700">
              {forgotSent ? (
                <div className="text-center space-y-4">
                  <p className="text-sm text-emerald-600">{t('resetLinkSent')}</p>
                  <button
                    onClick={() => { setView('login'); setForgotSent(false); setForgotEmail(''); }}
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    {t('backToLogin')}
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-500">{t('emailForReset')}</p>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-xs text-xs uppercase tracking-wider font-bold text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 transition-colors"
                  >
                    {loading ? t('authLoadingText') : t('sendInstructions')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setView('login'); setError(''); }}
                    className="w-full text-xs text-slate-500 hover:text-slate-700 text-center mt-1"
                  >
                    {t('backToLogin')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <form className="space-y-4 text-slate-700" onSubmit={isRegistering ? handleRegister : handleLogin}>
              {isRegistering && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    {t('username')}
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('authUsernamePlaceholder')}
                    className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                    id="input-username"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('authEmailPlaceholder')}
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                  id="input-email"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {t('password')}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  id="input-password"
                />
                {isRegistering && <PasswordStrengthMeter password={password} />}
              </div>

              <button
                type="submit"
                disabled={loading || (isRegistering && !isValidPassword(password))}
                className="w-full mt-6 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-xs text-xs uppercase tracking-wider font-bold text-white bg-indigo-700 hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-50 transition-colors"
                id="auth-submit-btn"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t('authLoadingText')}
                  </>
                ) : isRegistering ? (
                  <>
                    <UserPlus className="h-4 w-4" /> {t('authRegisterAndLogin')}
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> {t('authEnterIde')}
                  </>
                )}
              </button>

              {!isRegistering && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setError(''); }}
                    className="text-xs text-slate-400 hover:text-indigo-600 transition-colors mt-1"
                  >
                    {t('forgotPassword')}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Footer anclado al fondo del viewport */}
      <p className="absolute bottom-6 inset-x-0 text-center text-xs text-slate-400 font-semibold uppercase tracking-wider select-none">
        Enterprise Environment
      </p>
    </div>
  );
}
