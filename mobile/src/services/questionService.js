import {
  buildFlashcardBank, buildMockExamQuestionSet, buildPracticeQuestionBank,
  evaluateQuestionAnswer, OFFICIAL_CONCEPT_COUNT, PRACTICE_BATCH_SIZE,
  topicLabels, TOTAL_PRACTICE_QUESTIONS,
} from '../lib/question-bank.js';
import { localizeQuestion } from '../lib/i18n.js';

export { OFFICIAL_CONCEPT_COUNT, TOTAL_PRACTICE_QUESTIONS, topicLabels };

const STOP_WORDS = new Set(['the','a','an','of','in','on','at','to','for','is','are','was','were','be','been','it','its','this','that','and','or','but','with','as','by','from','which','what','who','how','so','if','not','no','can','will','do','does','did','have','has','had','they','them','their','we','our','you','your','my','me','he','she','his','her','would','could','should','may','might']);

function mixRatio(originalText, translatedText) {
  const origWords = (originalText || '').toLowerCase().match(/[a-z]{4,}/g) || [];
  const transWords = new Set((translatedText || '').toLowerCase().match(/[a-z]{4,}/g) || []);
  const meaningful = origWords.filter(w => !STOP_WORDS.has(w));
  if (meaningful.length === 0) return 0;
  const shared = meaningful.filter(w => transWords.has(w)).length;
  return shared / meaningful.length;
}

// Wraps localizeQuestion with a quality check: if the Spanish translation
// retains >40% of original English content words, fall back to pure English.
export function localizeQuestionSafe(rawQuestion, language) {
  const localized = localizeQuestion(rawQuestion, language);
  if (!localized || language !== 'es') return localized;
  const ratio = mixRatio(rawQuestion.text, localized.localizedText?.primary);
  if (ratio > 0.40) return localizeQuestion(rawQuestion, 'en');
  const optionsMixed = localized.options.some((opt, i) =>
    mixRatio(rawQuestion.options[i]?.text, opt.localizedText?.primary) > 0.40
  );
  if (optionsMixed) return localizeQuestion(rawQuestion, 'en');
  return localized;
}

export const TOPIC_KEYS = Object.keys(topicLabels);
export const TOPICS = TOPIC_KEYS.map(key => ({ key, label: topicLabels[key] }));

export function adaptQuestion(q) {
  const optionTexts = q.options.map(o => o.text);
  const correctIndex = q.options.findIndex(o => o.label === q.correct_answer);
  const diffMap = { beginner: 'Easy', intermediate: 'Medium', advanced: 'Hard' };
  return {
    id: q.id, concept_id: q.concept_id,
    prompt: q.text, options: optionTexts,
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    correct_answer: q.correct_answer,
    difficulty: diffMap[q.difficulty] ?? 'Medium',
    topic: q.topic, topicLabel: topicLabels[q.topic] ?? q.topic,
    task_list_code: q.task_list_code ?? null,
    task_list_section: q.task_list_section ?? null,
    explanation: q.explanation ?? '',
    timeEstimate: q.difficulty === 'advanced' ? 3 : q.difficulty === 'intermediate' ? 2 : 1,
    _raw: q,
  };
}

let _practiceCache = null;
export function getPracticeBank() {
  if (!_practiceCache) _practiceCache = buildPracticeQuestionBank(TOTAL_PRACTICE_QUESTIONS).map(adaptQuestion);
  return _practiceCache;
}
export function getPracticeByTopic(topicKey, limit = 24) {
  const all = getPracticeBank();
  const filtered = topicKey ? all.filter(q => q.topic === topicKey) : all;
  return filtered.slice(0, limit);
}
export function getMockExamQuestions(size = 85) {
  return buildMockExamQuestionSet(size).map(adaptQuestion);
}

let _flashcardCache = null;
export function getFlashcards(limit = 120) {
  if (!_flashcardCache) {
    _flashcardCache = buildFlashcardBank(limit).map(q => ({
      id: q.id, domain: topicLabels[q.topic] ?? q.topic, topic: q.topic,
      question: q.text,
      answer: q.options.find(o => o.label === q.correct_answer)?.text ?? '',
      explanation: q.explanation ?? '',
    }));
  }
  return _flashcardCache;
}
export function checkAnswer(questionId, selectedLetter) {
  return evaluateQuestionAnswer(questionId, selectedLetter);
}

export const DOMAIN_ACCENT_MAP = {
  measurement: 'success', assessment: 'gold', skill_acquisition: 'primary',
  behavior_reduction: 'gold', documentation: 'success', professional_conduct: 'primary',
};
export const DOMAIN_STATUS_MAP = {
  measurement: { status: 'Exam Ready', recommendation: 'Keep sharp with mixed-review sets twice a week.' },
  assessment: { status: 'Almost There', recommendation: 'Review preference assessments and indirect measures.' },
  skill_acquisition: { status: 'Keep Studying', recommendation: 'Spend time on prompting, shaping and fading decisions.' },
  behavior_reduction: { status: 'Almost There', recommendation: 'Practice matching strategies to the function of behavior.' },
  documentation: { status: 'Domain Mastery', recommendation: 'Maintain with short warm-up questions before each session.' },
  professional_conduct: { status: 'Keep Studying', recommendation: 'Review boundaries, scope of competence and reporting.' },
};
const defaultMastery = { measurement: 92, assessment: 81, skill_acquisition: 76, behavior_reduction: 79, documentation: 88, professional_conduct: 74 };
export function buildDomainStats(userMastery = {}) {
  return TOPICS.map(({ key, label }) => ({
    key, label,
    accent: DOMAIN_ACCENT_MAP[key] ?? 'primary',
    mastery: userMastery[key] ?? defaultMastery[key] ?? 75,
    ...(DOMAIN_STATUS_MAP[key] ?? { status: 'Keep Studying', recommendation: 'Keep practicing!' }),
  }));
}
