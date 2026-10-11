import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { rbtQuestions } from '../shared/questions/question-bank.js';
const require = createRequire(new URL('../mobile/package.json', import.meta.url));
const babel = require('@babel/core');
const filename = new URL('../api/index.js', import.meta.url);
const source = readFileSync(filename, 'utf8');
const imports = babel.parseSync(source, { babelrc: false, configFile: false }).program.body.filter(n => n.type === 'ImportDeclaration').map(n => n.source.value);
const modules = {};
for (const id of imports) if (id !== './lib/db.js') modules[id] = { __esModule: true, ...await import(id.startsWith('.') ? new URL(id, filename).href : id) };
const { code } = babel.transformSync(source, { babelrc: false, configFile: false, plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });
function fixture(plan = 'premium_monthly') {
  const attempts = new Map(), exams = [];
  const user = { id: 'test-user', plan, token: 'test', token_expires_at: new Date(Date.now() + 86400000).toISOString() };
  const db = {
    getUserBySessionToken: async () => user,
    getAttemptsByUser: async () => [...attempts.values()],
    getMockExamsMetaByUser: async () => exams,
    getMockExamsByUser: async () => exams,
    countTutorMessagesToday: async () => 0,
    getAttemptById: async id => attempts.get(id),
    createAttempt: async a => { if (!attempts.has(a.id)) attempts.set(a.id, a); return attempts.get(a.id); },
    createMockExam: async e => { exams.push(e); return e; },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => id === './lib/db.js' ? db : modules[id], module, module.exports);
  return { attempts, exams, get: path => module.exports.default(new Request(`https://test.local/api/${path}`, { headers: { Authorization: 'Bearer test' } })), post: (path, body) => module.exports.default(new Request(`https://test.local/api/${path}`, { method: 'POST', headers: { Authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify(body) })) };
}
test('API retries persist one attempt and return the original correct result', async () => {
  const f = fixture(), q = rbtQuestions[0];
  const payload = { attempt_id: 'same-attempt-123', question_id: q.id, selected_answer: q.correct_answer };
  const first = await f.post('question-attempts', payload);
  assert.equal(first.status, 201);
  const again = await f.post('question-attempts', payload);
  assert.equal(again.status, 200);
  assert.equal((await again.json()).is_correct, true);
  assert.equal(f.attempts.size, 1);
});
test('API rejects incomplete and duplicate exam banks without storing a shortened result', async () => {
  const f = fixture(), q = rbtQuestions[0];
  for (const ids of [[], [q.id, 'not-a-question'], [q.id, q.id]]) {
    assert.equal((await f.post('mock-exams', { question_ids: ids, answers: {} })).status, 400);
  }
  assert.equal(f.exams.length, 0);
  const res = await f.post('mock-exams', { question_ids: [q.id], answers: { [q.id]: q.correct_answer } });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).score, 100);
});


test('Free mobile accounts can read their study analytics while mock exams remain Pro', async () => {
  const f = fixture('free');
  const analytics = await f.get('analytics');
  assert.equal(analytics.status, 200);
  assert.deepEqual((await analytics.json()).attempts, []);
  assert.equal((await f.post('mock-exams', { question_ids: [rbtQuestions[0].id] })).status, 403);
});
