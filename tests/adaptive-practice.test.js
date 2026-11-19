import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPracticeQuestionBank,
  orderPracticeAdaptively,
  PRACTICE_REVIEW_SPACING_MS,
} from "../shared/questions/question-bank.js";

const NOW = Date.parse("2026-11-18T18:00:00Z");
const hoursAgo = (hours) => new Date(NOW - hours * 60 * 60 * 1000).toISOString();
const ids = (questions) => questions.map((question) => question.id);
const q = (id) => ({ id });

test("due mistakes are interleaved with new questions, one in three", () => {
  const questions = ["n1", "m1", "n2", "n3", "m2", "n4", "n5"].map(q);
  const history = {
    m1: { last_correct: false, last_at: hoursAgo(30) },
    m2: { last_correct: false, last_at: hoursAgo(48) },
  };
  // Oldest mistake first, then two new questions before the next mistake.
  assert.deepEqual(ids(orderPracticeAdaptively(questions, history, { now: NOW })), [
    "m2", "n1", "n2", "m1", "n3", "n4", "n5",
  ]);
});

test("a mistake made minutes ago waits instead of coming straight back", () => {
  const questions = ["recent", "new", "old_right"].map(q);
  const history = {
    recent: { last_correct: false, last_at: hoursAgo(0.1) },
    old_right: { last_correct: true, last_at: hoursAgo(200) },
  };
  assert.deepEqual(ids(orderPracticeAdaptively(questions, history, { now: NOW })), ["new", "recent", "old_right"]);
  assert.ok(PRACTICE_REVIEW_SPACING_MS >= 60 * 60 * 1000);
});

test("questions answered correctly come back oldest first, after everything else", () => {
  const questions = ["c_recent", "c_old", "new"].map(q);
  const history = {
    c_recent: { last_correct: true, last_at: hoursAgo(1) },
    c_old: { last_correct: true, last_at: hoursAgo(100) },
  };
  assert.deepEqual(ids(orderPracticeAdaptively(questions, history, { now: NOW })), ["new", "c_old", "c_recent"]);
});

test("totals-only history (current production API) still prioritises mistakes", () => {
  const questions = ["new", "mostly_wrong", "mostly_right"].map(q);
  const history = {
    mostly_wrong: { total: 3, correct: 1, wrong: 2 },
    mostly_right: { total: 3, correct: 3, wrong: 0 },
  };
  assert.deepEqual(ids(orderPracticeAdaptively(questions, history, { now: NOW })), [
    "mostly_wrong", "new", "mostly_right",
  ]);
});

test("no history keeps the original order", () => {
  const questions = ["a", "b", "c"].map(q);
  assert.deepEqual(ids(orderPracticeAdaptively(questions, {}, { now: NOW })), ["a", "b", "c"]);
});

test("the server bank puts a due mistake first and keeps every question", () => {
  const all = buildPracticeQuestionBank(5000, "adaptive-seed");
  const target = all[500].id;
  const ordered = buildPracticeQuestionBank(5000, "adaptive-seed", {
    history: { [target]: { last_correct: false, last_at: hoursAgo(24) } },
    now: NOW,
  });
  assert.equal(ordered[0].id, target);
  assert.equal(ordered.length, all.length);
  assert.equal(new Set(ids(ordered)).size, all.length);
  assert.equal(ordered[0].practice_index, 1);
});
