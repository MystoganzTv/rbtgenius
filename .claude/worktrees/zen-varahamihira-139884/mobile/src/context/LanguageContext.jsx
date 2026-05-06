import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateUi } from '../lib/i18n.js';

const LANG_KEY = 'rbt_language';

const LanguageContext = createContext({
  language: 'en',
  toggleLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((v) => {
      if (v === 'en' || v === 'es') setLanguage(v);
    });
  }, []);

  const toggleLanguage = async () => {
    const next = language === 'en' ? 'es' : 'en';
    setLanguage(next);
    await AsyncStorage.setItem(LANG_KEY, next);
  };

  const t = (key) => {
    if (language === 'en') return key;
    return translateUi(key, language) || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
