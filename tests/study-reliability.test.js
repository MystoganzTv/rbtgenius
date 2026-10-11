import assert from 'node:assert/strict';
import test from 'node:test';
import { React, act, create, screen, button } from './helpers/mobile-render.js';
import { postStudyAttempt } from '../mobile/src/services/studyAttempts.js';
import { buildMessage } from '../api/cron/daily-reminder.js';

const question = { id: 'question-c', concept_id: 'concept', prompt: 'Question?', question: 'Question?', answer: 'correct', options: ['wrong', 'wrong2', 'correct', 'wrong3'], correctIndex: 2, topic: 'measurement', difficulty: 'Easy', explanation: 'why', _raw: { correct_answer: 'C', options: ['A', 'B', 'C', 'D'].map(label => ({ label })) } };
const modules = {
  '../../components/ui': { Badge: 'Badge', ProgressBar: 'ProgressBar', toneColor: () => 'blue' },
  '../../components/i18n/TranslationSheet.jsx': { __esModule: true, default: 'TranslationSheet', TranslationTrigger: 'TranslationTrigger' },
  '../../components/questions/QuestionMedia.jsx': { __esModule: true, default: 'QuestionMedia' },
  '../../lib/questions/reviewed-question-translations.js': { buildQuestionTranslationContent: () => null, getSpanishForOptionText: () => '' },
  '../../services/ReviewPromptService.js': { requestReviewAfterPositiveMilestone: async () => {} },
  '../../context/AuthContext': { useAuth: () => ({ user: { id: 'u1', isPremium: true }, token: 'test' }) },
  'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'en' } }) },
};

test('exam timeout saves the latest selected answers exactly once, even after suspension', async context => {
  let tick, now = 1000, submitted = [];
  context.mock.method(globalThis, 'setInterval', callback => { tick = callback; return 1; });
  context.mock.method(globalThis, 'clearInterval', () => {});
  context.mock.method(Date, 'now', () => now);
  context.mock.method(globalThis, 'fetch', async (_url, options) => {
    submitted.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ score: 100, correct_answers: 1, total_questions: 1, domain_scores: { measurement: 100 } }) };
  });
  const { Component } = screen('screens/tabs/MockExamScreen.jsx', {
    ...modules, '../../services/questionService.js': { getMockExamQuestions: () => [question] },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, { navigation: {} })); });
  await act(async () => button(renderer, 'exams.start').props.onPress());
  await act(async () => button(renderer, 'correct').props.onPress());
  now += 91 * 60 * 1000;
  await act(async () => { tick(); tick(); });
  assert.equal(submitted.length, 1);
  assert.deepEqual(submitted[0].answers, { 'question-c': 'C' });
  assert.deepEqual(submitted[0].question_ids, ['question-c']);
  await act(async () => renderer.unmount());
});

test('failed answer is durable, blocks navigation, and retries the same ID after remount', async () => {
  const storage = new Map();
  let shouldFail = true, requests = [], saved = [], current;
  const { exports: { useStudySave } } = screen('hooks/useStudySave.js', {
    '@react-native-async-storage/async-storage': {
      getItem: async key => storage.get(key), setItem: async (key, value) => storage.set(key, value), removeItem: async key => storage.delete(key),
    },
    '../services/studyAttempts': { createAttemptId: () => 'stable-attempt-id', postStudyAttempt: async (_token, payload) => {
      requests.push(payload);
      if (shouldFail) throw new Error('503');
      return { ...payload, is_correct: true };
    } },
  });
  function Harness() { current = useStudySave('u1', 'token', 'practice', result => saved.push(result)); return null; }
  let renderer;
  await act(async () => { renderer = create(React.createElement(Harness)); });
  await act(async () => current.save({ question_id: 'q1', selected_answer: 'C' }));
  assert.equal(current.error, true);
  assert.equal(current.blocked, true);
  await act(async () => current.save({ question_id: 'q2', selected_answer: 'A' }));
  assert.equal(requests.length, 1);
  assert.equal(saved.length, 0);
  await act(async () => renderer.unmount());
  await act(async () => { renderer = create(React.createElement(Harness)); });
  assert.equal(current.pending.question_id, 'q1');
  shouldFail = false;
  await act(async () => current.retry());
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(current.blocked, false);
  assert.equal(storage.size, 0);
  assert.equal(saved.length, 1);
  await act(async () => renderer.unmount());
});

test('HTTP errors never resolve as a successful study attempt', async context => {
  context.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 500, json: async () => ({}) }));
  await assert.rejects(postStudyAttempt('token', {}), error => error.status === 500);
});

for (const gotIt of [true, false]) test(`flashcards submit the actual ${gotIt ? 'correct' : 'incorrect'} letter`, async () => {
  const submitted = [];
  const { Component } = screen('screens/tabs/FlashcardsScreen.tsx', {
    ...modules,
    '../../hooks/useStudySave': { useStudySave: () => ({ blocked: false, save: async payload => { submitted.push(payload); return payload; } }) },
    '../../components/questions/StudySaveStatus': { __esModule: true, default: 'StudySaveStatus' },
    '../../services/questionService.js': { getFlashcards: () => [question], TOPICS: [{ key: 'measurement', label: 'Data' }] },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, { navigation: {} })); });
  // The card itself flips to reveal both self-assessment actions.
  const card = renderer.root.findAllByType('Pressable').find(node => node.findAllByType('Text').some(text => text.props.children === 'Question?'));
  await act(async () => card.props.onPress());
  await act(async () => button(renderer, gotIt ? 'flashcards.mastered_label' : 'flashcard_ui.study_more').props.onPress());
  assert.equal(submitted.length, 1);
  assert.equal(submitted[0].selected_answer === 'C', gotIt);
  await act(async () => renderer.unmount());
});

test('personalized reminder localizes domain labels and inactivity messages', () => {
  const stats = { domains: { measurement: { pct: 40 } }, lastAt: new Date() };
  assert.match(buildMessage(stats, 'es').body, /Recolección de datos/);
  assert.match(buildMessage(stats, 'en').body, /Data Collection/);
  assert.match(buildMessage({ ...stats, lastAt: new Date(Date.now() - 8 * 86400000) }, 'es').body, /Han pasado 8 días/);
});

test('Spanish legal documents render every policy with Apple billing terms', async () => {
  const spanish = await import('../mobile/src/lib/legalContentEs.js');
  const billing = await import('../mobile/src/lib/legalBilling.ios.js');
  for (const [type, title] of [['terms', 'Términos de servicio'], ['privacy', 'Política de privacidad'], ['refund', 'Política de reembolsos']]) {
    const { Component } = screen('screens/legal/LegalScreen.jsx', {
      '@expo/vector-icons': { Feather: 'Feather' },
      '../../lib/legalBilling': billing, '../../lib/legalContentEs': spanish,
      'react-i18next': { useTranslation: () => ({ t: key => key, i18n: { language: 'es' } }) },
    });
    let renderer;
    await act(async () => { renderer = create(React.createElement(Component, { route: { params: { type } }, navigation: {} })); });
    const text = renderer.root.findAllByType('Text').map(node => node.props.children).join(' ');
    assert.ok(text.includes(title), `${type} title missing`);
    if (type === 'privacy') assert.ok(text.includes('Apple'));
    assert.ok(renderer.root.findByType('ScrollView'));
    await act(async () => renderer.unmount());
  }
});

test('analytics shows a retry after failed requests and preserves a real zero percent', async context => {
  let failed = true;
  context.mock.method(globalThis, 'fetch', async url => ({ ok: !failed, json: async () => url.endsWith('/dashboard')
    ? { progress: { accuracy_rate: 0, total_questions_completed: 1, readiness_score: 0 } }
    : { attempts: [{ created_at: new Date().toISOString(), is_correct: false }], exams: [] } }));
  const { Component } = screen('screens/tabs/AnalyticsScreen.tsx', {
    ...modules,
    '../../components/ui': { ProgressBar: 'ProgressBar', SectionTitle: 'SectionTitle', toneColor: () => 'blue' },
    '../../services/questionService.js': { TOTAL_PRACTICE_QUESTIONS: 1119 },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component)); });
  const retry = renderer.root.findByType('Pressable');
  assert.ok(retry.findAllByType('Text').some(n => n.props.children.includes('common.network_error')));
  failed = false;
  await act(async () => retry.props.onPress());
  assert.equal(renderer.root.findAllByType('Pressable').length, 0);
  assert.ok(renderer.root.findAllByType('Text').some(n => n.props.children === '0%'));
  await act(async () => renderer.unmount());
});
