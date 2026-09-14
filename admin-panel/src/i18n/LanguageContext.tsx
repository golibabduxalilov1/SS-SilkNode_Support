import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { ru, uz } from './translations';

export type Language = 'uz' | 'ru';

const LANGUAGE_KEY = 'language';

type Dict = typeof uz;

type Primitive = string;

type DeepKeys<T> = {
  [K in keyof T & string]: T[K] extends Primitive ? K : `${K}.${DeepKeys<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DeepKeys<Dict>;

function resolve(dict: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, dict);
  return typeof value === 'string' ? value : path;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  const stored = localStorage.getItem(LANGUAGE_KEY);
  if (stored === 'uz' || stored === 'ru') return stored;
  return 'uz';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next = prev === 'uz' ? 'ru' : 'uz';
      localStorage.setItem(LANGUAGE_KEY, next);
      return next;
    });
  }, []);

  const t = useMemo(() => {
    const dict = language === 'ru' ? ru : uz;
    return (key: TranslationKey) => resolve(dict, key);
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t }),
    [language, setLanguage, toggleLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
