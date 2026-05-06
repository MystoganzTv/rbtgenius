import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './en.json';
import es from './es.json';

const LANG_KEY = 'rbt_language';

export async function initI18n() {
  let savedLang = 'en';
  try {
    const stored = await AsyncStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'es') savedLang = stored;
  } catch {}

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        en: { translation: en },
        es: { translation: es },
      },
      lng: savedLang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });

  return i18n;
}

export function changeLanguage(lang) {
  i18n.changeLanguage(lang);
  AsyncStorage.setItem(LANG_KEY, lang).catch(() => {});
}

export default i18n;
