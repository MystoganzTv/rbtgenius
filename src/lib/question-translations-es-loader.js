import { setConceptTranslations } from "./question-bank.js";

let initialized = false;

export async function initTranslations() {
  if (initialized) return;
  initialized = true;

  try {
    const translations = await import("./question-translations-es.json", {
      assert: { type: "json" },
    });
    setConceptTranslations(translations.default || translations);
  } catch {
    // Translations file not yet generated — questions will show in English
    // Run: node scripts/translate-questions.mjs to generate it
  }
}
