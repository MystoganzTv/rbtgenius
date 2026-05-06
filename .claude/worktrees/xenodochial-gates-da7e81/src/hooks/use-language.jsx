import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "rbt_genius_language_mode";
const DEFAULT_LANGUAGE = "en";

const LanguageContext = createContext(null);

function resolveInitialLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "es") {
    return saved;
  }

  const browserLanguage = window.navigator?.language?.toLowerCase?.() || "";
  return browserLanguage.startsWith("es") ? "es" : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(resolveInitialLanguage);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language === "en" ? "en" : "es";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      isEnglish: language === "en",
      isSpanish: language === "es",
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
}
