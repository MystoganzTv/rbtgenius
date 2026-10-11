import translations from './question-translations-es.json';
import { setConceptTranslations, getConceptTranslationEs, getSpanishForOptionText } from './question-bank.js';
setConceptTranslations(translations);
export { getConceptTranslationEs, getSpanishForOptionText };
function stripTrailingPeriod(text) { return String(text || '').replace(/[.。]+$/, '').trim(); }
function stripLeadingPara(text) { return String(text || '').replace(/^para\s+/i, '').trim(); }

function buildReviewedQuestionText(question, reviewed) {
  if (!reviewed) return "";
  const kind = question?.id?.split("_").pop();

  if (kind === "definition" && reviewed.definition) {
    return `¿Qué concepto corresponde a esta definición: ${stripTrailingPeriod(reviewed.definition)}?`;
  }

  if (kind === "scenario" && reviewed.scenario) {
    return `${reviewed.scenario} ¿Qué concepto corresponde mejor?`;
  }

  if (kind === "purpose" && reviewed.answer) {
    return `¿Cuál es el objetivo principal de ${stripTrailingPeriod(reviewed.answer)}?`;
  }

  return reviewed.scenario || reviewed.definition || reviewed.answer || "";
}

function buildReviewedExplanationText(question, reviewed) {
  if (!reviewed) return "";
  const kind = question?.id?.split("_").pop();

  if (kind === "purpose" && reviewed.explanation && reviewed.purpose) {
    return `${reviewed.explanation} El objetivo principal es ${stripTrailingPeriod(stripLeadingPara(reviewed.purpose))}.`;
  }

  return reviewed.explanation || "";
}

export function buildQuestionTranslationContent(question) {
  if (!question) return null;

  const reviewed = getConceptTranslationEs(question.concept_id);
  const questionTextEs = buildReviewedQuestionText(question, reviewed);
  const explanationEs = buildReviewedExplanationText(question, reviewed);
  const options = (question.options || []).map((option) => ({
    label: option.label,
    english: option.text || "",
    spanish: reviewed?.options_es?.[String(option.text || "").trim()] || getSpanishForOptionText(option.text) || "",
  }));

  return {
    conceptId: question.concept_id,
    englishText: question.text || "",
    spanishText: questionTextEs,
    explanationEnglish: question.explanation || "",
    explanationSpanish: explanationEs,
    options,
  };
}
