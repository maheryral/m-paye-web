import React, { createContext, useCallback, useContext, useState } from 'react';

export type Locale = 'fr' | 'en';

const messages: Record<Locale, Record<string, string>> = {
  fr: {
    'dashboard.advantages': 'Vos avantages',
    'dashboard.cashback': 'Cashback',
    'dashboard.freeTransfers': 'Transferts gratuits',
    'dashboard.referral': 'Parrainage',
  },
  en: {
    'dashboard.advantages': 'Your benefits',
    'dashboard.cashback': 'Cashback',
    'dashboard.freeTransfers': 'Free transfers',
    'dashboard.referral': 'Referral',
  },
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
  formatCurrency: (amount: number) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_KEY = '@locale';

export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    return saved === 'en' || saved === 'fr' ? saved : 'fr';
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(LOCALE_KEY, l);
  }, []);

  const t = useCallback(
    (key: string) => messages[locale][key] ?? messages.fr[key] ?? key,
    [locale],
  );

  const formatCurrency = useCallback((amount: number) => {
    const n = Number(amount) || 0;
    return `${n.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US')} Ar`;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, formatCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale doit être utilisé dans un LocaleProvider');
  return ctx;
};
