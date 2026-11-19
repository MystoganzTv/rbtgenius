import assert from "node:assert/strict";
import test from "node:test";

import {
  appliedQuestions,
  buildFlashcardBank,
  evaluateQuestionAnswer,
  getAppliedTranslationEs,
  getQuestionById,
  rbtQuestions,
  sanitizeQuestion,
} from "../shared/questions/question-bank.js";
import { APPLIED_QUESTIONS } from "../shared/questions/question-bank-applied.js";

test("every applied question is complete, eligible and in the practice bank", () => {
  assert.ok(appliedQuestions.length >= 30, "applied layer should not shrink silently");
  const practiceIds = new Set(rbtQuestions.map((question) => question.id));
  const seen = new Set();

  for (const question of appliedQuestions) {
    assert.match(question.id, /^applied_/);
    assert.doesNotMatch(question.id, /_(definition|scenario|purpose)$/);
    assert.ok(!seen.has(question.id), `duplicate id ${question.id}`);
    seen.add(question.id);

    assert.ok(practiceIds.has(question.id), `${question.id} is not RBT-eligible`);
    assert.ok(question.task_list_code, `${question.id} has no outline code`);
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options.map((option) => option.text)).size, 4, `${question.id} repeats an option`);
    assert.equal(getQuestionById(question.id), question);
  }
});

test("the source's first option is always the graded correct answer", () => {
  for (const source of APPLIED_QUESTIONS) {
    const built = getQuestionById(source.id);
    const correct = built.options.find((option) => option.label === built.correct_answer);
    assert.equal(correct.text, source.options[0], source.id);
    assert.equal(evaluateQuestionAnswer(source.id, built.correct_answer).is_correct, true);
  }
});

test("correct letters are spread evenly across A–D", () => {
  const counts = { A: 0, B: 0, C: 0, D: 0 };
  for (const question of appliedQuestions) counts[question.correct_answer] += 1;
  const values = Object.values(counts);
  assert.ok(Math.max(...values) - Math.min(...values) <= 1, JSON.stringify(counts));
});

test("Spanish stays aligned with the English option order", () => {
  for (const source of APPLIED_QUESTIONS) {
    const built = getQuestionById(source.id);
    const spanish = getAppliedTranslationEs(source.id);
    assert.ok(spanish?.text && spanish?.explanation, `${source.id} is missing Spanish`);
    assert.equal(source.es.options.length, 4, source.id);
    for (const option of built.options) {
      const sourceIndex = source.options.indexOf(option.text);
      assert.equal(spanish.options[option.label], source.es.options[sourceIndex], `${source.id} ${option.label}`);
    }
  }
});

test("graphs are well formed and survive sanitizing", () => {
  const graphed = appliedQuestions.filter((question) => question.chart);
  assert.ok(graphed.length >= 4);
  for (const question of graphed) {
    const { series, y_max: yMax, phase_change_after: phase } = question.chart;
    assert.ok(series.length >= 5, question.id);
    assert.ok(series.every((value) => Number.isFinite(value) && value >= 0 && value <= yMax), question.id);
    if (phase !== undefined) assert.ok(phase > 0 && phase < series.length, question.id);
    // Students need the graph before answering, so it must not be stripped.
    assert.deepEqual(sanitizeQuestion(question).chart, question.chart);
    assert.equal(sanitizeQuestion(question).correct_answer, undefined);
  }
});

test("flashcards never include applied questions", () => {
  const cards = buildFlashcardBank(5000, "applied-check");
  assert.ok(cards.length > 1000);
  assert.ok(cards.every((card) => !card.id.startsWith("applied_")));
});

test("practice batches and mock exams carry about one applied question in four", async () => {
  const { buildMockExamQuestionSet, buildPracticeQuestionBank, TOTAL_PRACTICE_QUESTIONS } = await import("../shared/questions/question-bank.js");
  const batch = buildPracticeQuestionBank(TOTAL_PRACTICE_QUESTIONS, "share-check", { history: {} }).slice(0, 24);
  assert.equal(batch.filter((question) => question.kind === "applied").length, 6);
  const exam = buildMockExamQuestionSet(85, null, "share-check");
  const appliedInExam = exam.filter((question) => question.kind === "applied").length;
  assert.ok(appliedInExam >= 18 && appliedInExam <= 24, `got ${appliedInExam}`);
});

test("applied questions answered correctly stop taking the reserved slots", async () => {
  const { buildPracticeQuestionBank, TOTAL_PRACTICE_QUESTIONS } = await import("../shared/questions/question-bank.js");
  const history = Object.fromEntries(
    appliedQuestions.map((question) => [question.id, { last_correct: true, last_at: "2026-11-01T00:00:00Z" }]),
  );
  const batch = buildPracticeQuestionBank(TOTAL_PRACTICE_QUESTIONS, "share-check", { history }).slice(0, 24);
  assert.equal(batch.filter((question) => question.kind === "applied").length, 0);
});
