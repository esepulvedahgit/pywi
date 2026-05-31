import React, { useState } from 'react';
import { useT } from '../i18n';

interface ResetPasswordScreenProps {
  token: string;
  onDone: () => void;
}

export default function ResetPasswordScreen({ token, onDone }: ResetPasswordScreenProps) {
  const t = useT();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!newPassword || !confirmPassword) { setError(t('errorEmptyFields')); return; }
    if (newPassword.length < 8) { setError(t('passwordMin8')); return; }
    if (newPassword !== confirmPassword) { setError(t('passwordsDoNotMatch')); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('resetTokenInvalid'));
      } else {
        setSuccess(true);
        setTimeout(onDone, 2500);
      }
    } catch {
      setError(t('errorConnectionFallback'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-100">{t('resetPasswordTitle')}</h1>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-emerald-400">{t('resetSuccess')}</p>
            <p className="text-xs text-slate-500">{t('backToLogin')}...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">{t('newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">{t('confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Repite la contraseña"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleReset}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '...' : t('resetPasswordTitle')}
            </button>
            <button
              onClick={onDone}
              className="w-full text-xs text-slate-500 hover:text-slate-300 text-center"
            >
              {t('backToLogin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
