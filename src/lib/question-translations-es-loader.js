import { setConceptTranslations } from "./question-bank.js";
import translations from "./question-translations-es.json";

export function initTranslations() {
  if (translations && Object.keys(translations).length > 0) {
    setConceptTranslations(translations);
  }
}
