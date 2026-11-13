import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { dictionaries, type Dictionary } from '../i18n/translations';
import type { Lang, Localized } from '../types';

interface LanguageValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  t: Dictionary;
  /** Picks the current-language string from a localized pair. */
  pick: (value: Localized) => string;
  toggle: () => void;
}

const STORAGE_KEY = 'alyusr.lang';
const LanguageContext = createContext<LanguageValue | null>(null);

function readInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'ar' || stored === 'en') return stored;
  } catch {
    /* storage unavailable — fall through */
  }
  return 'ar';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readInitialLang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const root = document.documentElement;
    root.lang = lang;
    root.dir = dir;
    document.title =
      lang === 'ar' ? 'صيدلية اليسر | اطلب دواك أونلاين' : 'Al-Yusr Pharmacy | Order your medicine online';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang, dir]);

  const toggle = useCallback(() => setLang((current) => (current === 'ar' ? 'en' : 'ar')), []);
  const pick = useCallback((value: Localized) => value[lang], [lang]);

  const value = useMemo<LanguageValue>(
    () => ({ lang, dir, t: dictionaries[lang], pick, toggle }),
    [lang, dir, pick, toggle],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
