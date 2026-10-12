import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isRtlLocale, isSiteLocale, type SiteLocale } from "../data/languages";
import { translate } from "../data/translations";

type LanguageContextValue = { locale: SiteLocale; setLocale: (locale: SiteLocale) => void; toggleLocale: () => void; t: (key: Parameters<typeof translate>[0]) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SiteLocale>("ar");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("folio-locale");
      if (isSiteLocale(saved)) setLocaleState(saved);
    } catch {
      // Storage can be unavailable in privacy-restricted contexts.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
    try {
      window.localStorage.setItem("folio-locale", locale);
    } catch {
      // The selected language still works for this session.
    }
  }, [locale]);

  const setLocale = useCallback((next: SiteLocale) => setLocaleState(next), []);
  const toggleLocale = useCallback(() => setLocaleState(current => current === "ar" ? "en" : "ar"), []);
  const t = useCallback((key: Parameters<typeof translate>[0]) => translate(key, locale), [locale]);
  const value = useMemo(() => ({ locale, setLocale, toggleLocale, t }), [locale, setLocale, toggleLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
