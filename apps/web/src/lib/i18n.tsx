'use client';

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { catalogs, type Catalog, type Locale } from '@/lib/messages';

const KEY = 'fields.locale';

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  m: Catalog;
};

const I18nContext = createContext<I18nValue>({
  locale: 'fr',
  setLocale: () => undefined,
  m: catalogs.fr,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'fr') setLocaleState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem(KEY, next);
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, m: catalogs[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LanguageSwitch() {
  const { locale, setLocale, m } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={m.pub.language}>
      <button type="button" className={locale === 'fr' ? 'is-on' : ''} onClick={() => setLocale('fr')}>
        FR
      </button>
      <button type="button" className={locale === 'en' ? 'is-on' : ''} onClick={() => setLocale('en')}>
        EN
      </button>
    </div>
  );
}
