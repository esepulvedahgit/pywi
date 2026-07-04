import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Settings, Mail, Code, Lock, Users, UserPlus, Trash2, Sparkles, DatabaseBackup, Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { useT, useLang } from '../i18n';
import { UserSettings, AIConfig } from '../types';
import { isValidPassword } from '../utils/passwordPolicy';
import PasswordStrengthMeter from './PasswordStrengthMeter';

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
  activeTheme?: string;
  onSettingsSaved: (settings: UserSettings) => void;
  initialTab?: 'editor' | 'language' | 'smtp' | 'security' | 'users' | 'ai' | 'backup';
  onAiConfigSaved?: (cfg: AIConfig) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  userId,
  userRole,
  userSettings,
  activeTheme = 'vibrant-dark',
  onSettingsSaved,
  initialTab,
  onAiConfigSaved,
}: SettingsModalProps) {
  const t = useT();
  const { setLang } = useLang();

  const [activeTab, setActiveTab] = useState<'editor' | 'language' | 'smtp' | 'security' | 'users' | 'ai' | 'backup'>(initialTab || 'editor');
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
  const [smtpSavedOk, setSmtpSavedOk] = useState(false);

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
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  // Backup (download) state
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [backupError, setBackupError] = useState('');

  // Restore state
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [restoreMessage, setRestoreMessage] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // AI config state
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'openai', model: '', baseUrl: '', enabled: false, hasKey: false, validated: false
  });
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSavedOk, setAiSavedOk] = useState(false);
  const [aiTesting, setAiTesting] = useState(false);
  const [aiMessage, setAiMessage] = useState('');   // test result message
  const [aiSaveMessage, setAiSaveMessage] = useState(''); // save result message

  const modelPlaceholders: Record<string, string> = {
    openai: 'gpt-4o-mini',
    deepseek: 'deepseek-chat',
    gemini: 'gemini-1.5-flash',
    custom: 'model-name',
  };

  // Load SMTP config and admin users on mount
  useEffect(() => {
    if (!isOpen) return;
    // Jump to the requested tab when opening
    if (initialTab) setActiveTab(initialTab);
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

    fetch('/api/ai/config', { headers })
      .then(r => r.ok ? r.json() : null)
      .then((cfg: AIConfig | null) => { if (cfg) { setAiConfig(cfg); setAiApiKey(''); } })
      .catch(() => {});
  }, [isOpen, userRole]);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordMessage('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(t('passwordErrorEmpty'));
      return;
    }
    if (!isValidPassword(newPassword)) {
      setPasswordError(t('passwordErrorTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t('passwordErrorMismatch'));
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
        setPasswordError(data.error || t('passwordErrorChange'));
      } else {
        setPasswordMessage(t('passwordChangedOk'));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordMessage(''), 4000);
      }
    } catch {
      setPasswordError(t('passwordErrorConnection'));
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
      setUsersError(t('usersErrorEmpty'));
      return;
    }
    if (!isValidPassword(newUserPassword)) {
      setUsersError(t('passwordErrorTooShort'));
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
        setUsersError(data.error || t('usersErrorCreate'));
      } else {
        setUsersMessage(t('userCreatedSuccess', { name: newUsername }));
        setNewUsername('');
        setNewEmail('');
        setNewUserPassword('');
        loadAdminUsers();
        setTimeout(() => setUsersMessage(''), 4000);
      }
    } catch {
      setUsersError(t('usersErrorConnection'));
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (targetId: string) => {
    const token = localStorage.getItem('py_ide_token');
    try {
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (!res.ok) {
        setUsersError(data.error || 'Error al eliminar usuario');
      } else {
        setUsersMessage(t('userDeletedOk'));
        setConfirmDeleteUserId(null);
        loadAdminUsers();
        setTimeout(() => setUsersMessage(''), 4000);
      }
    } catch {
      setUsersError(t('connectionError2'));
    }
  };

  const handleDownloadBackup = async () => {
    setBackupError('');
    if (backupPassword.length < 12) {
      setBackupError(t('backupPasswordTooShort'));
      return;
    }
    if (!/^[\x20-\x7E]+$/.test(backupPassword)) {
      setBackupError(t('backupPasswordCharset'));
      return;
    }
    if (backupPassword !== backupPasswordConfirm) {
      setBackupError(t('backupPasswordMismatch'));
      return;
    }
    setBackupLoading(true);
    const token = localStorage.getItem('py_ide_token');
    try {
      const res = await fetch(`/api/users/${userId}/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ password: backupPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setBackupError(data.error || t('backupError'));
        return;
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const filename = match?.[1] || `backup_${userId}.zip`;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setBackupPassword('');
      setBackupPasswordConfirm('');
    } catch {
      setBackupError(t('backupError'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoreError('');
    setRestoreMessage('');
    if (!restoreFile) {
      setRestoreError(t('restoreNoFile'));
      return;
    }
    if (!restorePassword) {
      setRestoreError(t('restorePasswordLabel'));
      return;
    }
    setRestoreConfirm(false);
    setRestoring(true);
    const token = localStorage.getItem('py_ide_token');
    try {
      const formData = new FormData();
      formData.append('backup', restoreFile);
      formData.append('password', restorePassword);
      const res = await fetch(`/api/users/${userId}/restore`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRestoreError(data.error || t('restoreError'));
        return;
      }
      setRestoreMessage(t('restoreSuccess'));
      // Recargar para que la app relea el estado restaurado (proyectos/archivos).
      setTimeout(() => window.location.reload(), 900);
    } catch {
      setRestoreError(t('restoreError'));
    } finally {
      setRestoring(false);
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
      setSmtpMessage(t('smtpSavingError'));
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
        setSmtpSavedOk(true);
        setTimeout(() => setSmtpSavedOk(false), 2000);
      }
    } catch (err) {
      setSmtpMessage(t('smtpSavingError2'));
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

  const handleSaveAIConfig = async () => {
    setAiSaving(true);
    setAiSaveMessage('');
    try {
      const token = localStorage.getItem('py_ide_token');
      const res = await fetch('/api/ai/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          provider: aiConfig.provider,
          model: aiConfig.model,
          apiKey: aiApiKey || '••••••',
          baseUrl: aiConfig.baseUrl,
          // 'enabled' is not sent — server derives it from the validation result
        })
      });
      if (res.ok) {
        const saved = await res.json().catch(() => ({})) as any;
        setAiSavedOk(true);
        setAiApiKey('');
        // Refresh to get hasKey + validated status
        const token2 = localStorage.getItem('py_ide_token');
        const r2 = await fetch('/api/ai/config', { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} });
        if (r2.ok) {
          const freshCfg = await r2.json();
          setAiConfig(freshCfg);
          onAiConfigSaved?.(freshCfg);
        }
        // Show validation outcome: validated → activated; error field → validation failed but saved
        if (saved.validated) {
          setAiSaveMessage('✓ ' + t('aiValidatedOk'));
        } else if (saved.error) {
          setAiSaveMessage('✗ ' + saved.error);
        } else {
          setAiSaveMessage('✓ ' + t('saved'));
        }
        setTimeout(() => { setAiSavedOk(false); setAiSaveMessage(''); }, 5000);
      } else {
        const d = await res.json().catch(() => ({})) as any;
        setAiSaveMessage('✗ ' + (d.error || t('error')));
        setTimeout(() => setAiSaveMessage(''), 4000);
      }
    } catch {
      setAiSaveMessage('✗ ' + t('connectionError2'));
      setTimeout(() => setAiSaveMessage(''), 3000);
    } finally {
      setAiSaving(false);
    }
  };

  const handleTestAI = async () => {
    setAiTesting(true);
    setAiMessage('');
    try {
      const token = localStorage.getItem('py_ide_token');
      // Send current form values so the test works even before saving.
      // The server uses the body key in plain text (or falls back to the stored encrypted key).
      // Nothing is persisted — only Guardar enables the tutor button.
      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          provider: aiConfig.provider,
          model: aiConfig.model,
          apiKey: aiApiKey,          // plain text from the form field (empty string if not changed)
          baseUrl: aiConfig.baseUrl,
        })
      });
      const data = await res.json() as any;
      setAiMessage(res.ok ? `✓ ${data.message || t('aiTestOk')}` : `✗ ${data.error || t('aiTestFail')}`);
      setTimeout(() => setAiMessage(''), 5000);
    } catch {
      setAiMessage(`✗ ${t('connectionError')}`);
      setTimeout(() => setAiMessage(''), 3000);
    } finally {
      setAiTesting(false);
    }
  };

  if (!isOpen) return null;

  const getThemeClasses = (theme: string) => {
    if (theme === 'light') {
      return {
        overlay: 'fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-white border border-slate-200 rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col',
        header: 'bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200',
        title: 'text-slate-800 font-semibold flex items-center gap-2',
        closeBtn: 'p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded transition-colors',
        tabBar: 'flex min-w-0 border-b border-slate-200 bg-slate-50 overflow-x-auto scrollbar-thin',
        tab: 'flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium cursor-pointer transition-colors border-b-2 shrink-0 whitespace-nowrap',
        tabActive: 'text-indigo-600 border-indigo-500',
        tabInactive: 'text-slate-400 border-transparent hover:text-slate-600',
        tabFadeLeft: 'bg-gradient-to-r from-slate-50 to-transparent',
        tabFadeRight: 'bg-gradient-to-l from-slate-50 to-transparent',
        content: 'flex-1 overflow-y-auto p-6 space-y-5 bg-white',
        input: 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded text-slate-800 text-sm focus:outline-none focus:border-indigo-400',
        label: 'block text-xs font-bold uppercase text-slate-500 mb-1.5',
        checkbox: 'w-4 h-4 cursor-pointer',
        button: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50',
        buttonSecondary: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-slate-100 hover:bg-slate-200 text-slate-700',
        footer: 'border-t border-slate-200 px-6 py-4 flex justify-between items-center gap-2 bg-slate-50',
        message: 'text-xs text-emerald-600',
      };
    }
    // midnight-obsidian: paleta negra/neutral
    if (theme === 'midnight-obsidian') {
      return {
        overlay: 'fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
        modal: 'bg-black border border-neutral-900 rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col',
        header: 'bg-[#080808] px-6 py-4 flex items-center justify-between border-b border-neutral-900',
        title: 'text-neutral-100 font-semibold flex items-center gap-2',
        closeBtn: 'p-1 hover:bg-neutral-900 text-neutral-400 hover:text-neutral-100 rounded transition-colors',
        tabBar: 'flex min-w-0 border-b border-neutral-900 bg-[#080808] overflow-x-auto scrollbar-thin',
        tab: 'flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium cursor-pointer transition-colors border-b-2 shrink-0 whitespace-nowrap',
        tabActive: 'text-indigo-400 border-indigo-500',
        tabInactive: 'text-neutral-500 border-transparent hover:text-neutral-300',
        tabFadeLeft: 'bg-gradient-to-r from-[#080808] to-transparent',
        tabFadeRight: 'bg-gradient-to-l from-[#080808] to-transparent',
        content: 'flex-1 overflow-y-auto p-6 space-y-5 bg-black',
        input: 'w-full px-3 py-2 bg-neutral-900/50 border border-neutral-800 rounded text-neutral-200 text-sm focus:outline-none focus:border-indigo-500',
        label: 'block text-xs font-bold uppercase text-neutral-400 mb-1.5',
        checkbox: 'w-4 h-4 cursor-pointer',
        button: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50',
        buttonSecondary: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-neutral-800 hover:bg-neutral-700 text-neutral-100',
        footer: 'border-t border-neutral-900 px-6 py-4 flex justify-between items-center gap-2 bg-[#080808]',
        message: 'text-xs text-emerald-400',
      };
    }
    // vibrant-dark: paleta slate
    return {
      overlay: 'fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4',
      modal: 'bg-slate-950 border border-slate-800 rounded-t-2xl sm:rounded-lg shadow-2xl w-full sm:max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col',
      header: 'bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800',
      title: 'text-slate-100 font-semibold flex items-center gap-2',
      closeBtn: 'p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors',
      tabBar: 'flex min-w-0 border-b border-slate-800 bg-slate-900 overflow-x-auto scrollbar-thin',
      tab: 'flex items-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium cursor-pointer transition-colors border-b-2 shrink-0 whitespace-nowrap',
      tabActive: 'text-indigo-400 border-indigo-500',
      tabInactive: 'text-slate-500 border-transparent hover:text-slate-300',
      tabFadeLeft: 'bg-gradient-to-r from-slate-900 to-transparent',
      tabFadeRight: 'bg-gradient-to-l from-slate-900 to-transparent',
      content: 'flex-1 overflow-y-auto p-6 space-y-5 bg-[#0b0f19]',
      input: 'w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded text-slate-200 text-sm focus:outline-none focus:border-indigo-500',
      label: 'block text-xs font-bold uppercase text-slate-400 mb-1.5',
      checkbox: 'w-4 h-4 cursor-pointer',
      button: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50',
      buttonSecondary: 'px-4 py-2 rounded text-sm font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-slate-100',
      footer: 'border-t border-slate-800 px-6 py-4 flex justify-between items-center gap-2 bg-slate-900',
      message: 'text-xs text-emerald-400',
    };
  };

  const c = getThemeClasses(activeTheme);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
          <div className="relative min-w-0">
            {/* Pista visual de scroll en móvil: la barra ya es deslizable (overflow-x-auto),
                estos degradados solo indican que hay más pestañas fuera de vista. */}
            <div className={`${c.tabFadeLeft} absolute inset-y-0 left-0 w-6 z-10 sm:hidden pointer-events-none`} />
            <div className={`${c.tabFadeRight} absolute inset-y-0 right-0 w-6 z-10 sm:hidden pointer-events-none`} />
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
              <span className="text-base sm:text-lg">🌐</span>
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
              {t('securityTab')}
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('users')}
                className={`${c.tab} ${activeTab === 'users' ? c.tabActive : c.tabInactive}`}
              >
                <Users className="h-4 w-4" />
                {t('usersTab')}
              </button>
            )}
            <button
              onClick={() => setActiveTab('ai')}
              className={`${c.tab} ${activeTab === 'ai' ? c.tabActive : c.tabInactive}`}
            >
              <Sparkles className="h-4 w-4" />
              {t('aiTabLabel')}
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`${c.tab} ${activeTab === 'backup' ? c.tabActive : c.tabInactive}`}
            >
              <DatabaseBackup className="h-4 w-4" />
              {t('backupTab')}
            </button>
            </div>
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
                <p className="text-xs text-slate-400">{t('securityDescription')}</p>
                <div>
                  <label className={c.label}>{t('currentPassword')}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className={c.input}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className={c.label}>{t('newPassword')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className={c.input}
                    placeholder={t('newPasswordPlaceholder')}
                  />
                  <PasswordStrengthMeter password={newPassword} dark />
                </div>
                <div>
                  <label className={c.label}>{t('confirmNewPassword')}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className={c.input}
                    placeholder={t('repeatNewPassword')}
                  />
                </div>
                {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
                {passwordMessage && <p className="text-xs text-emerald-400">{passwordMessage}</p>}
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className={c.button}
                >
                  {savingPassword ? t('savingPassword') : t('changePassword')}
                </button>
              </div>
            )}

            {/* Users Tab (admin only) */}
            {activeTab === 'users' && userRole === 'admin' && (
              <div className="space-y-6">
                {/* Create user form */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <UserPlus className="h-3.5 w-3.5" /> {t('createNewUser')}
                  </p>
                  <div>
                    <label className={c.label}>{t('username')}</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value)}
                      className={c.input}
                      placeholder={t('usernamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className={c.label}>{t('email')}</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className={c.input}
                      placeholder={t('emailPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className={c.label}>{t('tempPassword')}</label>
                    <input
                      type="password"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className={c.input}
                      placeholder={t('newPasswordPlaceholder')}
                    />
                    <PasswordStrengthMeter password={newUserPassword} dark />
                  </div>
                  {usersError && <p className="text-xs text-red-400">{usersError}</p>}
                  {usersMessage && <p className="text-xs text-emerald-400">{usersMessage}</p>}
                  <button
                    onClick={handleCreateUser}
                    disabled={creatingUser}
                    className={c.button}
                  >
                    {creatingUser ? t('creatingUser') : t('createUserBtn')}
                  </button>
                </div>

                {/* Users list */}
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> {t('registeredUsers')}
                  </p>
                  <div className="space-y-2">
                    {adminUsers.map(u => (
                      <div key={u.id}>
                        <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded px-3 py-2">
                          <div>
                            <p className="text-sm text-slate-200 font-medium">{u.username}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              u.role === 'admin'
                                ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700'
                                : 'bg-slate-700 text-slate-400 border border-slate-600'
                            }`}>
                              {u.role === 'admin' ? t('roleAdmin') : t('roleUser')}
                            </span>
                            {u.role !== 'admin' && u.id !== userId && (
                              <button
                                onClick={() => setConfirmDeleteUserId(u.id)}
                                className="p-1 text-slate-500 hover:text-red-400 rounded transition-colors"
                                title={t('deleteUser')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        {confirmDeleteUserId === u.id && (
                          <div className="mx-0 mt-1 px-3 py-2 bg-red-950/60 rounded-md border border-red-700/50 flex items-center justify-between gap-2">
                            <span className="text-xs text-red-300">{t('confirmDeleteUser', { name: u.username })}</span>
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors"
                              >
                                {t('confirmDeleteFolderYes')}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteUserId(null)}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold rounded transition-colors"
                              >
                                {t('confirmDeleteFolderNo')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {adminUsers.length === 0 && (
                      <p className="text-xs text-slate-500">{t('noRegisteredUsers')}</p>
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
                    placeholder={smtpConfig.password === '••••••' ? '••••••' : t('password')}
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
                    {smtpLoading ? t('smtpTestingBtn') : t('testConnection')}
                  </button>
                </div>
              </div>
            )}

            {/* AI Assistant Tab */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                {/* Status indicator — replaces the manual "enable" checkbox */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  aiConfig.validated
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/40'
                }`}>
                  <span>{aiConfig.validated ? '●' : '○'}</span>
                  <span>{aiConfig.validated ? t('aiStatusActive') : t('aiStatusInactive')}</span>
                </div>

                {/* Provider */}
                <div>
                  <label className={c.label}>{t('aiProvider')}</label>
                  <select
                    value={aiConfig.provider}
                    onChange={e => setAiConfig({ ...aiConfig, provider: e.target.value as AIConfig['provider'] })}
                    className={c.input}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="custom">Custom (OpenAI-compatible)</option>
                  </select>
                </div>

                {/* Model */}
                <div>
                  <label className={c.label}>{t('aiModel')}</label>
                  <input
                    type="text"
                    value={aiConfig.model}
                    onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                    placeholder={modelPlaceholders[aiConfig.provider]}
                    className={c.input}
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className={c.label}>
                    {t('aiApiKey')}
                    {aiConfig.hasKey && (
                      <span className="ml-2 text-emerald-500 normal-case font-normal">● {t('aiHasKey')}</span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={aiApiKey}
                    onChange={e => setAiApiKey(e.target.value)}
                    placeholder={aiConfig.hasKey ? '••••••••••••' : 'sk-...'}
                    className={c.input}
                    autoComplete="new-password"
                  />
                </div>

                {/* Base URL (custom only) */}
                {aiConfig.provider === 'custom' && (
                  <div>
                    <label className={c.label}>{t('aiBaseUrl')}</label>
                    <input
                      type="text"
                      value={aiConfig.baseUrl || ''}
                      onChange={e => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                      placeholder={t('aiBaseUrlPlaceholder')}
                      className={c.input}
                    />
                  </div>
                )}

                {/* Test + message */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleTestAI}
                    disabled={aiTesting || (!aiApiKey && !aiConfig.hasKey) || !aiConfig.model.trim()}
                    className={c.buttonSecondary + ' disabled:opacity-40'}
                  >
                    {aiTesting ? '...' : t('aiTest')}
                  </button>
                  {aiMessage && (
                    <span className={`text-xs ${aiMessage.startsWith('✓') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {aiMessage}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                {/* Descargar copia cifrada */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <DatabaseBackup className="h-3.5 w-3.5" /> {t('backupSectionTitle')}
                  </p>
                  <p className="text-xs text-slate-400">{t('backupDesc')}</p>
                  <div>
                    <label className={c.label}>{t('backupPasswordLabel')}</label>
                    <input
                      type="password"
                      value={backupPassword}
                      onChange={e => { setBackupPassword(e.target.value); setBackupError(''); }}
                      className={c.input}
                      placeholder="••••••••"
                    />
                    <PasswordStrengthMeter password={backupPassword} dark />
                  </div>
                  <div>
                    <label className={c.label}>{t('backupPasswordConfirmLabel')}</label>
                    <input
                      type="password"
                      value={backupPasswordConfirm}
                      onChange={e => { setBackupPasswordConfirm(e.target.value); setBackupError(''); }}
                      className={c.input}
                      placeholder="••••••••"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">{t('backupPasswordHint')}</p>
                  {backupError && <p className="text-xs text-red-400">{backupError}</p>}
                  <button onClick={handleDownloadBackup} disabled={backupLoading} className={c.button}>
                    {backupLoading ? t('backupGenerating') : t('backupDownload')}
                  </button>
                </div>

                <div className="border-t border-slate-800/60" />

                {/* Restaurar copia (destructivo) */}
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> {t('restoreTitle')}
                  </p>
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-amber-300">{t('restoreWarning')}</span>
                  </div>
                  <div>
                    <label className={c.label}>{t('restoreFileLabel')}</label>
                    <input
                      ref={restoreFileRef}
                      type="file"
                      accept=".zip"
                      className="hidden"
                      onChange={e => { setRestoreFile(e.target.files?.[0] || null); setRestoreError(''); setRestoreMessage(''); setRestoreConfirm(false); }}
                    />
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => restoreFileRef.current?.click()} className={c.buttonSecondary}>
                        {t('restoreChooseFile')}
                      </button>
                      <span className="text-xs text-slate-400 truncate">{restoreFile?.name || '—'}</span>
                    </div>
                  </div>
                  <div>
                    <label className={c.label}>{t('restorePasswordLabel')}</label>
                    <input
                      type="password"
                      value={restorePassword}
                      onChange={e => { setRestorePassword(e.target.value); setRestoreError(''); }}
                      className={c.input}
                      placeholder="••••••••"
                    />
                  </div>
                  {restoreError && <p className="text-xs text-red-400">{restoreError}</p>}
                  {restoreMessage && <p className="text-xs text-emerald-400">{restoreMessage}</p>}
                  {!restoreConfirm ? (
                    <button
                      onClick={() => {
                        setRestoreError('');
                        if (!restoreFile) { setRestoreError(t('restoreNoFile')); return; }
                        if (!restorePassword) { setRestoreError(t('restorePasswordLabel')); return; }
                        setRestoreConfirm(true);
                      }}
                      disabled={restoring}
                      className="px-4 py-2 rounded text-sm font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                    >
                      {t('restoreButton')}
                    </button>
                  ) : (
                    <div className="rounded-md border border-red-700/50 bg-red-950/40 px-3 py-2 space-y-2">
                      <p className="text-xs text-red-300">{t('restoreConfirmQuestion')}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRestore}
                          disabled={restoring}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors disabled:opacity-50"
                        >
                          {t('restoreConfirmYes')}
                        </button>
                        <button
                          onClick={() => setRestoreConfirm(false)}
                          disabled={restoring}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded transition-colors"
                        >
                          {t('restoreConfirmNo')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Restore progress overlay */}
          {restoring && (
            <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
              <span className="text-sm text-slate-200 font-medium">{t('restoreInProgress')}</span>
            </div>
          )}

          {/* Footer */}
          <div className={c.footer}>
            {/* Left side — reserved (backup moved to its own tab) */}
            <div />
            {/* Right side — save / cancel */}
            <div className="flex gap-2">
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
              <motion.button
                onClick={handleSaveSmtp}
                disabled={saving || smtpSavedOk}
                animate={smtpSavedOk ? { scale: [1, 1.08, 1], backgroundColor: ['#4f46e5', '#16a34a', '#16a34a'] } : {}}
                transition={{ duration: 0.35 }}
                className={c.button}
              >
                {saving ? t('save') + '...' : smtpSavedOk ? '✓ ' + t('saved') : t('save')}
              </motion.button>
            )}
            {activeTab === 'ai' && (
              <>
                {aiSaveMessage && (
                  <span className={`text-xs self-center ${
                    aiSaveMessage.startsWith('✓') ? 'text-emerald-400' :
                    aiSaveMessage.startsWith('⚠') ? 'text-amber-400' :
                    'text-rose-400'
                  }`}>
                    {aiSaveMessage}
                  </span>
                )}
                <motion.button
                  onClick={handleSaveAIConfig}
                  disabled={aiSaving || aiSavedOk}
                  animate={aiSavedOk ? { scale: [1, 1.08, 1], backgroundColor: ['#4f46e5', '#16a34a', '#16a34a'] } : {}}
                  transition={{ duration: 0.35 }}
                  className={c.button}
                >
                  {aiSaving ? t('aiSave') + '...' : aiSavedOk ? '✓ ' + t('saved') : t('aiSave')}
                </motion.button>
              </>
            )}
            <button onClick={onClose} className={c.buttonSecondary}>
              {t('cancel')}
            </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
