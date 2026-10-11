import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { en } from './dictionaries/en';
import { zh } from './dictionaries/zh';

export type Locale = 'en' | 'zh';

export const LOCALE_LABELS: Record<Locale, { label: string; short: string }> = {
  en: { label: 'English', short: 'EN' },
  zh: { label: '简体中文', short: '中' },
};

const DICTIONARIES: Record<Locale, Record<string, string>> = { en, zh };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggleLocale: () => void;
  t: (key: string, fallback?: string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'frequi.locale';

function resolveInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') {
      return saved;
    }
  } catch {
    // localStorage unavailable
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    if (navigator.language.toLowerCase().startsWith('zh')) {
      return 'zh';
    }
  }

  return 'en';
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  }, [locale, setLocale]);

  useEffect(() => {
    try {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    } catch {
      // ignore
    }
  }, [locale]);

  const t = useCallback(
    (key: string, fallback?: string): string => {
      const dict = DICTIONARIES[locale] || DICTIONARIES.en;
      if (dict && dict[key]) {
        return dict[key];
      }
      const zhDict = DICTIONARIES.zh;
      if (zhDict && zhDict[key]) {
        return zhDict[key];
      }
      return fallback !== undefined ? fallback : key;
    },
    [locale]
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return ctx;
}

export function useT(): (key: string, fallback?: string) => string {
  const { t } = useLocale();
  return t;
}
