import React from 'react';
import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';
import { useT } from '../i18n';
import { checkPassword, passwordScore } from '../utils/passwordPolicy';

interface PasswordStrengthMeterProps {
  password: string;
  /** Use dark variant inside dark-background modals/screens (default: false = light) */
  dark?: boolean;
}

export default function PasswordStrengthMeter({ password, dark = false }: PasswordStrengthMeterProps) {
  const t = useT();

  if (!password) return null;

  const score = passwordScore(password);
  const checks = checkPassword(password);

  const barColor = score <= 2 ? '#ef4444' : score <= 3 ? '#f59e0b' : '#22c55e';
  const strengthLabel =
    score <= 2 ? t('pwStrengthWeak') : score <= 3 ? t('pwStrengthMedium') : t('pwStrengthStrong');

  const requirements = [
    { key: 'minLen',   label: t('pwReqMinLen'),  met: checks.minLen },
    { key: 'lower',    label: t('pwReqLower'),   met: checks.lower },
    { key: 'upper',    label: t('pwReqUpper'),   met: checks.upper },
    { key: 'digit',    label: t('pwReqDigit'),   met: checks.digit },
    { key: 'special',  label: t('pwReqSpecial'), met: checks.special },
  ];

  const trackCls = dark ? 'bg-slate-600' : 'bg-slate-200';

  return (
    <div className="mt-2 space-y-1.5">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${trackCls}`}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(score / 5) * 100}%`, backgroundColor: barColor }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-xs font-semibold w-14 text-right" style={{ color: barColor }}>
          {strengthLabel}
        </span>
      </div>

      {/* Requirements checklist */}
      <div className="grid grid-cols-1 gap-0.5">
        {requirements.map(req => (
          <div key={req.key} className="flex items-center gap-1.5">
            {req.met ? (
              <Check className="h-3 w-3 text-emerald-500 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-slate-400 shrink-0" />
            )}
            <span className={`text-xs ${req.met ? 'text-emerald-500' : 'text-slate-400'}`}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
