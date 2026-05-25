import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('payzen_lang') || 'ar';
  });

  const t = useCallback(
    (key) => {
      return translations[lang]?.[key] || translations['en']?.[key] || key;
    },
    [lang]
  );

  const toggleLanguage = useCallback(
    (newLang) => {
      const l = newLang || (lang === 'en' ? 'ar' : 'en');
      setLang(l);
      localStorage.setItem('payzen_lang', l);
    },
    [lang]
  );

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage, isRTL: lang === 'ar' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
