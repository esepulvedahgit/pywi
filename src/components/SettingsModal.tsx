import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Mail, Code, Lock, Users, UserPlus } from 'lucide-react';
import { useT, useLang } from '../i18n';
import { UserSettings } from '../types';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userRole: 'admin' | 'user';
  userSettings: UserSettings;
  onSettingsSaved: (settings: UserSettings) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  userId,
  userRole,
  userSettings,
  onSettingsSaved,
}: SettingsModalProps) {
  const t = useT();
  const { setLang } = useLang();

  const [activeTab, setActiveTab] = useState<'editor' | 'language' | 'smtp' | 'security' | 'users'>('editor');
  const [localSettings, setLocalSettings] = useState<UserSettings>(userSettings);
  const [smtpConfig, setSmtpConfig] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    from: '',
    secure: false,
  });
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);

  // Security (password change) state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Admin: users list state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [usersMessage, setUsersMessage] = useState('');
  const [usersError, setUsersError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Load SMTP config and admin users on mount
  useEffect(() => {
    if (!isOpen) return;
    const token = localStorage.getItem('py_ide_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {} as Record<string, string>;

    fetch('/api/system/smtp', { headers })
      .then(r => r.json())
      .then(cfg => setSmtpConfig(cfg))
      .catch(err => console.error('Error loading SMTP config:', err));

    if (userRole === 'admin') {
      fetch('/api/admin/users', { headers })
        .then(r => r.json())
        .then(users => setAdminUsers(users))
        .catch(() => {});
    }
  }, [isOpen, userRole]);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Completa todos los campos');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas nuevas no coinciden');
      return;
    }
    setSavingPassword(true);
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Error al cambiar la contraseña');
      } else {
        setPasswordMessage('Contraseña cambiada correctamente');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage(''), 4000);
      }
    } catch {
      setPasswordError('Error de conexión');
    } finally {
      setSavingPassword(false);
    }
  };

  const loadAdminUsers = async () => {
    const token = localStorage.getItem('py_ide_token');
    const res = await fetch('/api/admin/users', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (res.ok) setAdminUsers(await res.json());
  };

  const handleCreateUser = async () => {
    setUsersError('');
    setUsersMessage('');
    if (!newUsername || !newEmail || !newUserPassword) {
      setUsersError('Completa todos los campos');
      return;
    }
    setCreatingUser(true);
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ username: newUsername, email: newEmail, password: newUserPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setUsersError(data.error || 'Error al crear usuario');
      } else {
        setUsersMessage(`Usuario "${newUsername}" creado correctamente`);
        setNewUsername('');
        setNewEmail('');
        setNewUserPassword('');
        loadAdminUsers();
        setTimeout(() => setUsersMessage(''), 4000);
      }
    } catch {
      setUsersError('Error de conexión');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch(`/api/users/${userId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(localSettings),
      });

      if (res.ok) {
        onSettingsSaved(localSettings);
        setLang(localSettings.language);
        setSavedOk(true);
        setTimeout(() => setSavedOk(false), 2000);
      }
    } catch (err) {
      setSmtpMessage('Error guardando configuración');
      setTimeout(() => setSmtpMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmtp = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/system/smtp', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(smtpConfig),
      });

      if (res.ok) {
        setSmtpMessage(t('saved'));
        setTimeout(() => setSmtpMessage(''), 3000);
      }
    } catch (err) {
      setSmtpMessage('Error guardando SMTP');
      setTimeout(() => setSmtpMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setSmtpLoading(true);
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/system/smtp/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
      });

      const data = await res.json();
      if (res.ok) {
        setSmtpMessage(t('testEmailSent'));
      } else {
        setSmtpMessage(data.error || t('connectionError'));
      }
      setTimeout(() => setSmtpMessage(''), 5000);
    } catch (err) {
      setSmtpMessage(t('connectionError'));
      setTimeout(() => setSmtpMessage(''), 3000);
    } finally {
      setSmtpLoading(false);
    }
  };

  if (!isOpen) return null;

  const getThemeClasses = () => {
    return {
      overlay: 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center',
      modal: 'bg-slate-950 border border-slate-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col',
      header: 'bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800',
      title: 'text-slate-100 font-semibold flex items-center gap-2',
      closeBtn: 'p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors',
      tabBar: 'flex border-b border-slate-800 bg-slate-900',
      tab: 'flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer transition-colors border-b-2',
      tabActive: 'text-indigo-400 border-indigo-500',
      tabInactive: 'text-slate-500 border-transparent hover:text-slate-300',
      content: 'flex-1 overflow-y-auto p-6 space-y-5 bg-[#0b0f19]',
      input: 'w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-indigo-500',
      label: 'block text-xs font-bold uppercase text-slate-400 mb-1.5',
      checkbox: 'w-4 h-4 cursor-pointer',
      button: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50',
      buttonSecondary: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-slate-100',
      footer: 'border-t border-slate-800 px-6 py-4 flex justify-end gap-2 bg-slate-900',
      message: 'text-xs text-emerald-400',
    };
  };

  const c = getThemeClasses();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className={c.overlay}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className={c.modal}
        >
          {/* Header */}
          <div className={c.header}>
            <div className={c.title}>
              <Settings className="h-5 w-5" />
              <span>{t('settings')}</span>
            </div>
            <button
              onClick={onClose}
              className={c.closeBtn}
              title={t('close')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className={c.tabBar}>
            <button
              onClick={() => setActiveTab('editor')}
              className={`${c.tab} ${activeTab === 'editor' ? c.tabActive : c.tabInactive}`}
            >
              <Code className="h-4 w-4" />
              {t('editor')}
            </button>
            <button
              onClick={() => setActiveTab('language')}
              className={`${c.tab} ${activeTab === 'language' ? c.tabActive : c.tabInactive}`}
            >
              <span className="text-lg">🌐</span>
              {t('language')}
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`${c.tab} ${activeTab === 'smtp' ? c.tabActive : c.tabInactive}`}
            >
              <Mail className="h-4 w-4" />
              {t('smtp')}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`${c.tab} ${activeTab === 'security' ? c.tabActive : c.tabInactive}`}
            >
              <Lock className="h-4 w-4" />
              Seguridad
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`${c.tab} ${activeTab === 'users' ? c.tabActive : c.tabInactive}`}
              >
                <Users className="h-4 w-4" />
                Usuarios
              </button>
            )}
          </div>

          {/* Content */}
          <div className={c.content}>
            {/* Editor Tab */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <div>
                  <label className={c.label}>{t('indentation')}</label>
                  <div className="flex gap-4">
                    {[2, 4].map(size => (
                      <label key={size} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="indentation"
                          value={size}
                          checked={localSettings.indentation === size}
                          onChange={() =>
                            setLocalSettings({ ...localSettings, indentation: size as 2 | 4 })
                          }
                          className={c.checkbox}
                        />
                        <span className="text-sm text-slate-300">
                          {t(`indent${size}` as 'indent2' | 'indent4')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Language Tab */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                <div>
                  <label className={c.label}>{t('language')}</label>
                  <div className="flex gap-4">
                    {[
                      { code: 'es', label: t('español') },
                      { code: 'en', label: t('english') },
                    ].map(lang => (
                      <label key={lang.code} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="language"
                          value={lang.code}
                          checked={localSettings.language === lang.code}
                          onChange={() =>
                            setLocalSettings({
                              ...localSettings,
                              language: lang.code as 'es' | 'en',
                            })
                          }
                          className={c.checkbox}
                        />
                        <span className="text-sm text-slate-300">{lang.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">Cambia tu contraseña de acceso. Debes introducir tu contraseña actual para confirmar el cambio.</p>
                <div>
                  <label className={c.label}>Contraseña actual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className={c.input}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className={c.label}>Nueva contraseña</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={c.input}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <label className={c.label}>Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={c.input}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>
                {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                {passwordMessage && <p className="text-xs text-emerald-400">{passwordMessage}</p>}
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className={c.button}
                >
                  {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            )}

            {/* Users Tab (admin only) */}
            {activeTab === 'users' && userRole === 'admin' && (
              <div className="space-y-6">
                {/* Create user form */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> Crear nuevo usuario
                  </p>
                  <div>
                    <label className={c.label}>Nombre de usuario</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className={c.input}
                      placeholder="Ej. python_dev"
                    />
                  </div>
                  <div>
                    <label className={c.label}>Correo electrónico</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className={c.input}
                      placeholder="usuario@example.com"
                    />
                  </div>
                  <div>
                    <label className={c.label}>Contraseña temporal</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className={c.input}
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  {usersError && <p className="text-xs text-red-400">{usersError}</p>}
                  {usersMessage && <p className="text-xs text-emerald-400">{usersMessage}</p>}
                  <button
                    onClick={handleCreateUser}
                    disabled={creatingUser}
                    className={c.button}
                  >
                    {creatingUser ? 'Creando...' : 'Crear usuario'}
                  </button>
                </div>

                {/* Users list */}
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Usuarios registrados
                  </p>
                  <div className="space-y-2">
                    {adminUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded px-3 py-2">
                        <div>
                          <p className="text-sm text-slate-200 font-medium">{u.username}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          u.role === 'admin'
                            ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'
                            : 'bg-slate-700 text-slate-400 border border-slate-600'
                        }`}>
                          {u.role === 'admin' ? 'Admin' : 'Usuario'}
                        </span>
                      </div>
                    ))}
                    {adminUsers.length === 0 && (
                      <p className="text-xs text-slate-500">No hay usuarios registrados.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SMTP Tab */}
            {activeTab === 'smtp' && (
              <div className="space-y-4">
                <div>
                  <label className={c.label}>{t('smtpHost')}</label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={e => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    className={c.input}
                    placeholder="smtp.example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={c.label}>{t('smtpPort')}</label>
                    <input
                      type="number"
                      value={smtpConfig.port}
                      onChange={e =>
                        setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })
                      }
                      className={c.input}
                      min="1"
                      max="65535"
                    />
                  </div>

                  <div>
                    <label className={c.label}>{t('smtpSecure')}</label>
                    <label className="flex items-center gap-2 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={smtpConfig.secure}
                        onChange={e =>
                          setSmtpConfig({ ...smtpConfig, secure: e.target.checked })
                        }
                        className={c.checkbox}
                      />
                      <span className="text-sm text-slate-300">TLS</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={c.label}>{t('smtpUser')}</label>
                  <input
                    type="text"
                    value={smtpConfig.user}
                    onChange={e => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                    className={c.input}
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className={c.label}>{t('smtpPassword')}</label>
                  <input
                    type="password"
                    value={smtpConfig.password}
                    onChange={e => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                    className={c.input}
                    placeholder={smtpConfig.password === '••••••' ? '••••••' : 'Contraseña'}
                  />
                </div>

                <div>
                  <label className={c.label}>{t('smtpFrom')}</label>
                  <input
                    type="email"
                    value={smtpConfig.from}
                    onChange={e => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                    className={c.input}
                    placeholder="noreply@example.com"
                  />
                </div>

                {smtpMessage && <p className={c.message}>{smtpMessage}</p>}

                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleTestSmtp}
                    disabled={smtpLoading}
                    className={c.buttonSecondary}
                  >
                    {smtpLoading ? 'Probando...' : t('testConnection')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={c.footer}>
            {(activeTab === 'editor' || activeTab === 'language') && (
              <motion.button
                onClick={handleSaveSettings}
                disabled={saving || savedOk}
                animate={savedOk ? { scale: [1, 1.08, 1], backgroundColor: ['#4f46e5', '#16a34a', '#16a34a'] } : {}}
                transition={{ duration: 0.35 }}
                className={c.button}
              >
                {saving ? t('save') + '...' : savedOk ? '✓ ' + t('saved') : t('save')}
              </motion.button>
            )}
            {activeTab === 'smtp' && (
              <button
                onClick={handleSaveSmtp}
                disabled={saving}
                className={c.button}
              >
                {saving ? t('save') + '...' : t('save')}
              </button>
            )}
            <button onClick={onClose} className={c.buttonSecondary}>
              {t('cancel')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
