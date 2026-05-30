import React, { createContext, useContext } from 'react';
import { es } from './es';
import { en } from './en';

export type Lang = 'es' | 'en';

interface LanguageContextType {
  t: (key: string) => string;
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
  const t = (key: string): string => {
    const dict = translations[lang] as Record<string, string>;
    return dict[key] || key;
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
