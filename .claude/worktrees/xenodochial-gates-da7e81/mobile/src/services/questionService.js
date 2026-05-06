import {
  buildFlashcardBank, buildMockExamQuestionSet, buildPracticeQuestionBank,
  evaluateQuestionAnswer, OFFICIAL_CONCEPT_COUNT, PRACTICE_BATCH_SIZE,
  topicLabels, TOTAL_PRACTICE_QUESTIONS,
} from '../lib/question-bank.js';

export { OFFICIAL_CONCEPT_COUNT, TOTAL_PRACTICE_QUESTIONS, topicLabels };

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
