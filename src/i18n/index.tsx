import React, { createContext, useContext } from 'react';
import { es } from './es';
import { en } from './en';

export type Lang = 'es' | 'en';

interface LanguageContextType {
  t: (key: string, vars?: Record<string, string | number>) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = { es, en };

export function LanguageProvider({
  children,
  lang,
  setLang,
}: {
  children: React.ReactNode;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) {
  const t = (key: string, vars?: Record<string, string | number>): string => {
    // Fallback a español si `lang` llega corrupto (ej. localStorage envenenado con
    // "undefined") — evita que translations[lang] sea undefined y reviente t().
    const dict = (translations[lang] as Record<string, string> | undefined) ?? translations.es;
    let str = dict[key] || key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ t, lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useT must be used within LanguageProvider');
  }
  return ctx.t;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLang must be used within LanguageProvider');
  }
  return ctx;
}
