import React, { useState } from 'react';
import { Terminal, Shield, LogIn, UserPlus } from 'lucide-react';
import { User } from '../types';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al registrarse');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemo = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@ide.py', password: 'python123' })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar demo');
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError('No se pudo acceder al usuario de prueba. Intenta registrar uno nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 px-6 lg:px-8 font-sans" id="auth-screen-container">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center" id="logo-icon">
          <div className="h-14 w-14 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/25">
            <Terminal className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl font-bold tracking-tight text-slate-800">
          PyCloud Web IDE
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
          Enterprise Environment • v2.4.0
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md" id="auth-form-card">
        <div className="bg-white py-8 px-6 shadow-md rounded-2xl border border-slate-200/80">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-start gap-2" id="auth-error">
              <Shield className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="flex border-b border-slate-200 mb-6" id="auth-tab">
            <button
              onClick={() => { setIsRegistering(false); setError(''); }}
              className={`flex-1 pb-3 text-center font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                !isRegistering
                  ? 'border-indigo-650 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              id="tab-login"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => { setIsRegistering(true); setError(''); }}
              className={`flex-1 pb-3 text-center font-bold text-xs uppercase tracking-wider transition-colors border-b-2 ${
                isRegistering
                  ? 'border-indigo-650 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
              id="tab-register"
            >
              Registrarse
            </button>
          </div>

          <form className="space-y-4 text-slate-700" onSubmit={isRegistering ? handleRegister : handleLogin}>
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej. python_coder"
                  className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                  id="input-username"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Correo electrónico
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej. usuario@ide.py"
                className="mt-1 block w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                id="input-email"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Contraseña
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-xs text-xs uppercase tracking-wider font-bold text-white bg-indigo-650 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              id="auth-submit-btn"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : isRegistering ? (
                <>
                  <UserPlus className="h-4 w-4" /> Registrarse e Iniciar
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Entrar al IDE
                </>
              )}
            </button>
          </form>

          <div className="relative my-6" id="divider-auth">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-bold text-slate-400">
              <span className="bg-white px-2">Autenticación Rápida</span>
            </div>
          </div>

          <button
            onClick={handleInstantDemo}
            disabled={loading}
            className="w-full flex justify-center items-center gap-1.5 py-2.5 px-4 border border-slate-200 rounded-lg shadow-2xs text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
            id="demo-user-btn"
          >
            Utilizar Usuario Demo (admin@ide.py)
          </button>
        </div>
      </div>
    </div>
  );
}
