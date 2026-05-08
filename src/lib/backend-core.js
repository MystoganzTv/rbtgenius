import { TOTAL_PRACTICE_QUESTIONS, topicLabels } from "./question-bank.js";
import { TASK_LIST_SECTIONS } from "./task-list.js";

// Topic buckets in question-bank.js map 1:1 to the current RBT exam domains.
// Keep this in sync with question-bank.js -> topicLabels.
const TOPIC_TO_SECTION = {
  measurement: "A",
  assessment: "B",
  skill_acquisition: "C",
  behavior_reduction: "D",
  documentation: "E",
  professional_conduct: "F",
};

/**
 * Computes mastery (smoothed accuracy) and raw attempt counts for each of the
 * 6 RBT exam domains, derived from the existing attempts data via
 * their `topic` field. No schema changes required — works retroactively.
 */
function computeTaskListSectionMastery(attempts) {
  const mastery = {};
  const counts = {};
  const correct = {};

  TASK_LIST_SECTIONS.forEach(({ code }) => {
    mastery[code] = 0;
    counts[code] = 0;
    correct[code] = 0;
  });

  attempts.forEach((attempt) => {
    const section = TOPIC_TO_SECTION[attempt.topic];
    if (!section) return;
    counts[section] += 1;
    if (attempt.is_correct) correct[section] += 1;
  });

  Object.keys(mastery).forEach((section) => {
    if (counts[section] > 0) {
      mastery[section] = getSmoothedRate(correct[section], counts[section]);
    }
  });

  return { mastery, counts };
}

export const DEMO_USER_ID = "user-demo";

export const defaultUser = {
  id: "user-default",
  token: null,
  full_name: "Student",
  email: "",
  role: "student",
  plan: "free",
};

export const MIN_DOMAIN_ATTEMPTS = 10;

function buildAchievements({
  totalQuestionsCompleted,
  bankCoveragePercent,
  studyStreakDays,
  totalMockExams,
  passedMockExams,
  readinessScore,
}) {
  return [
    {
      id: "first-50",
      emoji: "🎯",
      label: "First 50",
      description: "Answer your first 50 questions.",
      unlocked: totalQuestionsCompleted >= 50,
    },
    {
      id: "practice-250",
      emoji: "📚",
      label: "250 Answered",
      description: "Build a real practice base with 250 answered questions.",
      unlocked: totalQuestionsCompleted >= 250,
    },
    {
      id: "coverage-10",
      emoji: "🗺️",
      label: "10% Covered",
      description: `Cover at least 10% of the ${TOTAL_PRACTICE_QUESTIONS}-question bank.`,
      unlocked: bankCoveragePercent >= 10,
    },
    {
      id: "streak-3",
      emoji: "🔥",
      label: "3-Day Streak",
      description: "Come back and study on 3 consecutive return days.",
      unlocked: studyStreakDays >= 3,
    },
    {
      id: "first-mock",
      emoji: "📝",
      label: "First Mock",
      description: "Complete your first mock exam.",
      unlocked: totalMockExams >= 1,
    },
    {
      id: "mock-pass",
      emoji: "🏆",
      label: "Mock Pass",
      description: "Pass at least one mock exam.",
      unlocked: passedMockExams >= 1,
    },
    {
      id: "ready-signal",
      emoji: "🧠",
      label: "Ready Signal",
      description: "Reach a stronger readiness score built from coverage and exam data.",
      unlocked: readinessScore >= 80,
    },
  ];
}

function getSmoothedRate(correct, total, baselineRate = 0.65, baselineWeight = 6) {
  if (total <= 0) {
    return 0;
  }

  const weightedCorrect = correct + baselineRate * baselineWeight;
  const weightedTotal = total + baselineWeight;
  return Math.round((weightedCorrect / weightedTotal) * 100);
}

function toDateStr(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value instanceof Date ? value.toISOString().slice(0, 10) : '';
}

function formatUniqueStudyDays(attempts) {
  const dateKeys = new Set(
    attempts
      .map((attempt) => toDateStr(attempt.created_at))
      .filter(Boolean),
  );

  if (dateKeys.size === 0) {
    return { streak: 0, lastStudyDate: null };
  }

  const sorted = [...dateKeys].sort((left, right) => (left < right ? 1 : -1));
  let consecutiveDays = 1;
  let cursor = new Date(`${sorted[0]}T00:00:00`);

  for (const dateKey of sorted.slice(1)) {
    const expectedPrevious = new Date(cursor);
    expectedPrevious.setDate(expectedPrevious.getDate() - 1);

    if (dateKey === expectedPrevious.toISOString().slice(0, 10)) {
      consecutiveDays += 1;
      cursor = expectedPrevious;
      continue;
    }

    break;
  }

  return {
    streak: Math.max(0, consecutiveDays - 1),
    lastStudyDate: sorted[0],
  };
}

export function computeProgress(db, userId) {
  const attempts = db.attempts.filter((attempt) => attempt.user_id === userId);
  const practiceAttempts = attempts.filter(
    (attempt) => !attempt.source || attempt.source === "practice",
  );
  const exams = db.mockExams.filter((exam) => exam.user_id === userId);
  const user = db.users.find((entry) => entry.id === userId) || defaultUser;
  const recentAttempts = [...attempts]
    .sort((left, right) => (left.created_at < right.created_at ? 1 : -1))
    .slice(0, 50);

  const totalQuestionsCompleted = attempts.length;
  const totalCorrect = attempts.filter((attempt) => attempt.is_correct).length;
  const totalAccuracy =
    totalQuestionsCompleted > 0
      ? Math.round((totalCorrect / totalQuestionsCompleted) * 100)
      : 0;
  const accuracyRate = getSmoothedRate(totalCorrect, totalQuestionsCompleted, 0.62, 20);
  const recentCorrect = recentAttempts.filter((attempt) => attempt.is_correct).length;
  const recentAccuracy = getSmoothedRate(recentCorrect, recentAttempts.length, 0.62, 10);

  const domainAttemptCounts = Object.keys(topicLabels).reduce((result, key) => {
    result[key] = attempts.filter((attempt) => attempt.topic === key).length;
    return result;
  }, {});

  const domainMastery = Object.keys(topicLabels).reduce((result, key) => {
    const topicAttempts = attempts.filter((attempt) => attempt.topic === key);
    const topicCorrect = topicAttempts.filter((attempt) => attempt.is_correct).length;

    result[key] =
      topicAttempts.length > 0
        ? getSmoothedRate(topicCorrect, topicAttempts.length)
        : 0;
    return result;
  }, {});

  const averageExamScore =
    exams.length > 0
      ? Math.round(
          exams.reduce((total, exam) => total + (exam.score || 0), 0) / exams.length,
        )
      : 0;
  const passedMockExams = exams.filter((exam) => (exam.score || 0) >= 80).length;
  const failedMockExams = Math.max(0, exams.length - passedMockExams);

  const stableDomainKeys = Object.keys(topicLabels).filter(
    (key) => domainAttemptCounts[key] >= MIN_DOMAIN_ATTEMPTS,
  );
  const stableDomainAverage =
    stableDomainKeys.length > 0
      ? Math.round(
          stableDomainKeys.reduce((total, key) => total + domainMastery[key], 0) /
            stableDomainKeys.length,
        )
      : null;

  let readinessWeightedTotal = 0;
  let readinessWeights = 0;

  if (totalQuestionsCompleted > 0) {
    readinessWeightedTotal += accuracyRate * 0.75;
    readinessWeights += 0.75;
  }

  if (stableDomainAverage !== null) {
    readinessWeightedTotal += stableDomainAverage * 0.1;
    readinessWeights += 0.1;
  }

  if (exams.length > 0) {
    readinessWeightedTotal += averageExamScore * 0.15;
    readinessWeights += 0.15;
  }

  const readinessBaseScore =
    readinessWeights > 0
      ? Math.min(100, Math.round(readinessWeightedTotal / readinessWeights))
      : 0;
  const bankCoverage = Math.min(1, totalQuestionsCompleted / TOTAL_PRACTICE_QUESTIONS);
  const bankAccuracy =
    TOTAL_PRACTICE_QUESTIONS > 0
      ? Number(((totalCorrect / TOTAL_PRACTICE_QUESTIONS) * 100).toFixed(1))
      : 0;
  const examCoverageBoost = Math.min(0.35, exams.length * 0.08);
  const readinessCeiling = Math.min(1, bankCoverage * 3 + examCoverageBoost);
  const readinessScore = Math.round(readinessBaseScore * readinessCeiling);

  const readinessConfidence =
    exams.length > 0 || totalQuestionsCompleted >= 150
      ? "high"
      : totalQuestionsCompleted >= 50
        ? "medium"
        : "low";

  const studyHours =
    Math.round(
      ((attempts.length * 1.5 +
        exams.reduce((total, exam) => total + (exam.time_taken_minutes || 0), 0)) /
        60) *
        10,
    ) / 10;

  const { streak, lastStudyDate } = formatUniqueStudyDays(attempts);
  const bankCoveragePercent = Math.round(bankCoverage * 100);
  const badges = buildAchievements({
    totalQuestionsCompleted,
    bankCoveragePercent,
    studyStreakDays: streak,
    totalMockExams: exams.length,
    passedMockExams,
    readinessScore,
  });

  // RBT exam-domain breakdown — maps from the existing topic
  // buckets (measurement/assessment/...) to official sections (A..F).
  const taskListBreakdown = computeTaskListSectionMastery(attempts);

  return {
    total_questions_completed: totalQuestionsCompleted,
    total_questions_available: TOTAL_PRACTICE_QUESTIONS,
    bank_coverage_percent: bankCoveragePercent,
    total_correct: totalCorrect,
    bank_accuracy: bankAccuracy,
    accuracy_rate: accuracyRate,
    raw_accuracy: totalAccuracy,
    recent_accuracy: recentAccuracy,
    study_streak_days: streak,
    last_study_date: lastStudyDate,
    study_hours: studyHours,
    readiness_score: readinessScore,
    readiness_confidence: readinessConfidence,
    badges,
    plan: user.plan || "free",
    domain_mastery: domainMastery,
    domain_attempt_counts: domainAttemptCounts,
    questions_today: practiceAttempts.filter(
      (attempt) => toDateStr(attempt.created_at) === new Date().toISOString().slice(0, 10),
    ).length,
    last_question_date: lastStudyDate,
    total_mock_exams: exams.length,
    passed_mock_exams: passedMockExams,
    failed_mock_exams: failedMockExams,
    average_mock_exam_score: averageExamScore,
    task_list_section_mastery: taskListBreakdown.mastery,
    task_list_section_attempts: taskListBreakdown.counts,
  };
}
