import assert from "node:assert/strict";
import test from "node:test";

import {
  dateKeyOf,
  getExamPlanStatus,
  normalizeExamOutcomeUpdate,
  pickExamOutcome,
  summarizeExamOutcomes,
} from "../src/lib/exam-outcome.js";

const NOW = new Date(2026, 10, 18, 12, 0, 0); // 18 Nov 2026, local noon

test("setting a date stores it and clears an older result", () => {
  const { patch } = normalizeExamOutcomeUpdate(
    { exam_date: "2026-12-05" },
    { exam_date: "2026-10-01", exam_result: "not_passed" },
    NOW,
  );
  assert.deepEqual(patch, { exam_date: "2026-12-05", exam_result: null, exam_result_reported_at: null });
});

test("re-saving the same date keeps the result", () => {
  const { patch } = normalizeExamOutcomeUpdate(
    { exam_date: "2026-11-01" },
    { exam_date: "2026-11-01", exam_result: "passed" },
    NOW,
  );
  assert.deepEqual(patch, { exam_date: "2026-11-01" });
});

test("a result needs a date that has already happened", () => {
  assert.match(normalizeExamOutcomeUpdate({ exam_result: "passed" }, {}, NOW).error, /exam date/i);
  assert.match(
    normalizeExamOutcomeUpdate({ exam_result: "passed" }, { exam_date: "2026-12-01" }, NOW).error,
    /not happened/,
  );
  const { patch } = normalizeExamOutcomeUpdate({ exam_result: "passed" }, { exam_date: "2026-11-10" }, NOW);
  assert.equal(patch.exam_result, "passed");
  assert.equal(patch.exam_result_reported_at, NOW.toISOString());
});

test("bad input is rejected", () => {
  assert.ok(normalizeExamOutcomeUpdate({ exam_date: "12/05/2026" }, {}, NOW).error);
  assert.ok(normalizeExamOutcomeUpdate({ exam_date: "2026-02-30" }, {}, NOW).error);
  assert.ok(normalizeExamOutcomeUpdate({ exam_date: "2031-01-01" }, {}, NOW).error);
  assert.ok(normalizeExamOutcomeUpdate({ exam_result: "maybe" }, { exam_date: "2026-11-01" }, NOW).error);
});

test("dashboard status follows the date", () => {
  assert.deepEqual(getExamPlanStatus({}, NOW), { state: "no_date" });
  assert.equal(getExamPlanStatus({ exam_date: "2026-11-18" }, NOW).daysLeft, 0);
  assert.equal(getExamPlanStatus({ exam_date: "2026-11-25" }, NOW).daysLeft, 7);
  assert.equal(getExamPlanStatus({ exam_date: "2026-11-17" }, NOW).state, "awaiting_result");
  assert.equal(getExamPlanStatus({ exam_date: "2026-11-17", exam_result: "passed" }, NOW).state, "reported");
});

test("Postgres Date objects are read as date keys", () => {
  assert.equal(dateKeyOf(new Date("2026-12-05T00:00:00Z")), "2026-12-05");
  assert.equal(pickExamOutcome({ exam_date: new Date("2026-12-05T00:00:00Z") }).exam_date, "2026-12-05");
});

test("owner summary counts each member once", () => {
  const summary = summarizeExamOutcomes(
    [
      { exam_date: "2026-11-01", exam_result: "passed" },
      { exam_date: "2026-11-02", exam_result: "passed" },
      { exam_date: "2026-11-03", exam_result: "not_passed" },
      { exam_date: "2026-11-04" },
      { exam_date: "2026-12-04" },
      {},
    ],
    NOW,
  );
  assert.deepEqual(summary, {
    withDate: 5,
    upcoming: 1,
    awaiting: 1,
    reported: 3,
    passed: 2,
    notPassed: 1,
    passRate: 67,
    reliable: false,
  });
});
