// Exam date and self-reported result.
//
// Students tell us when their real RBT exam is and, once the date has passed,
// whether they passed. That gives the business a real pass rate (for the
// listing and marketing) and the data to check whether the readiness score
// predicts anything. Shared by the web app, the local server and the Vercel API.

export const EXAM_RESULTS = ["passed", "not_passed"];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

function isValidDateKey(value) {
  if (!DATE_KEY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Postgres DATE columns can arrive as Date objects (UTC midnight) depending on
// the driver; everything here compares YYYY-MM-DD strings.
export function dateKeyOf(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  const text = String(value);
  return DATE_KEY.test(text.slice(0, 10)) ? text.slice(0, 10) : null;
}

export function todayDateKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(fromKey, toKey) {
  return Math.round(
    (Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / DAY_MS,
  );
}

/**
 * Validates a PUT body against the current user and returns the fields to
 * store, or { error }. Setting a new date clears any earlier result, so a
 * student who rescheduled is asked again after the new date.
 */
export function normalizeExamOutcomeUpdate(body = {}, current = {}, now = new Date()) {
  const patch = {};
  const today = todayDateKey(now);

  if (Object.prototype.hasOwnProperty.call(body, "exam_date")) {
    const date = body.exam_date;
    if (date === null || date === "") {
      patch.exam_date = null;
      patch.exam_result = null;
      patch.exam_result_reported_at = null;
    } else if (typeof date === "string" && isValidDateKey(date)) {
      if (Math.abs(daysBetween(today, date)) > 730) {
        return { error: "exam_date must be within two years of today" };
      }
      patch.exam_date = date;
      if (date !== dateKeyOf(current.exam_date)) {
        patch.exam_result = null;
        patch.exam_result_reported_at = null;
      }
    } else {
      return { error: "exam_date must be YYYY-MM-DD" };
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, "exam_result")) {
    const result = body.exam_result;
    if (result === null) {
      patch.exam_result = null;
      patch.exam_result_reported_at = null;
    } else if (EXAM_RESULTS.includes(result)) {
      const date = patch.exam_date !== undefined ? patch.exam_date : dateKeyOf(current.exam_date);
      if (!date) return { error: "Set the exam date before reporting a result" };
      if (date > today) return { error: "The exam date has not happened yet" };
      patch.exam_result = result;
      patch.exam_result_reported_at = now.toISOString();
    } else {
      return { error: "exam_result must be passed, not_passed or null" };
    }
  }

  return { patch };
}

export function pickExamOutcome(user = {}) {
  return {
    exam_date: dateKeyOf(user?.exam_date),
    exam_result: user?.exam_result || null,
    exam_result_reported_at: user?.exam_result_reported_at || null,
  };
}

/**
 * What the dashboard card should show:
 *   no_date          → ask for the exam date
 *   upcoming         → countdown (daysLeft ≥ 0; 0 means today)
 *   awaiting_result  → the date has passed: ask how it went
 *   reported         → thank them; passed or not
 */
export function getExamPlanStatus(outcome = {}, now = new Date()) {
  const date = outcome.exam_date;
  if (!date) return { state: "no_date" };
  if (outcome.exam_result) return { state: "reported", result: outcome.exam_result, date };
  const daysLeft = daysBetween(todayDateKey(now), date);
  if (daysLeft >= 0) return { state: "upcoming", daysLeft, date };
  return { state: "awaiting_result", daysSince: -daysLeft, date };
}

/** Owner dashboard summary. Only members, never admins. */
export function summarizeExamOutcomes(users = [], now = new Date()) {
  const today = todayDateKey(now);
  let withDate = 0;
  let upcoming = 0;
  let awaiting = 0;
  let passed = 0;
  let notPassed = 0;

  for (const user of users) {
    const examDate = dateKeyOf(user?.exam_date);
    if (!examDate) continue;
    withDate += 1;
    if (user.exam_result === "passed") passed += 1;
    else if (user.exam_result === "not_passed") notPassed += 1;
    else if (examDate >= today) upcoming += 1;
    else awaiting += 1;
  }

  const reported = passed + notPassed;
  return {
    withDate,
    upcoming,
    awaiting,
    reported,
    passed,
    notPassed,
    passRate: reported > 0 ? Math.round((passed / reported) * 100) : null,
    // Small samples swing wildly; the dashboard says so below this size.
    reliable: reported >= 20,
  };
}
