"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations, type TranslationKey, type Lang } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  t: (key: TranslationKey) => string;
  toggleLanguage: (newLang?: Lang) => void;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  const t = useCallback(
    (key: TranslationKey): string => {
      return (translations[lang] as any)?.[key] || (translations["en"] as any)?.[key] || key;
    },
    [lang]
  );

  const toggleLanguage = useCallback(
    (newLang?: Lang) => {
      const l = newLang || (lang === "en" ? "ar" : "en");
      setLang(l);
      localStorage.setItem("paynest_lang", l);
    },
    [lang]
  );

  useEffect(() => {
    const storedLang = localStorage.getItem("paynest_lang") as Lang | null;
    if (storedLang === "ar" || storedLang === "en") setLang(storedLang);
  }, []);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage, isRTL: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
