import { TOTAL_PRACTICE_QUESTIONS, topicLabels } from "./questions/question-bank.js";
import { TASK_LIST_SECTIONS } from "./questions/task-list.js";

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

  // Use Number() to handle postgres.js returning NUMERIC as string (avoids string concatenation in reduce)
  const averageExamScore =
    exams.length > 0
      ? Math.min(100, Math.round(
          exams.reduce((total, exam) => total + Number(exam.score || 0), 0) / exams.length,
        ))
      : 0;

  // Most recent exam score (exams sorted by created_at DESC from DB)
  const mostRecentExamScore = exams.length > 0 ? Math.min(100, Number(exams[0]?.score || 0)) : 0;

  // If the most recent exam is significantly below average, pull readiness down.
  // This prevents old good exams from hiding a recent decline.
  const recentDecline = exams.length >= 2 && (averageExamScore - mostRecentExamScore) > 20;
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

  const bankCoverage = Math.min(1, totalQuestionsCompleted / TOTAL_PRACTICE_QUESTIONS);
  const bankAccuracy =
    TOTAL_PRACTICE_QUESTIONS > 0
      ? Number(((totalCorrect / TOTAL_PRACTICE_QUESTIONS) * 100).toFixed(1))
      : 0;

  // ── Readiness score ───────────────────────────────────────────────────────
  const practiceScore = totalQuestionsCompleted > 0
    ? Math.min(100, Math.round(accuracyRate * Math.min(1, bankCoverage * 3)))
    : 0;

  let rawReadiness;
  if (exams.length === 0) {
    rawReadiness = Math.min(40, practiceScore);
  } else if (exams.length === 1) {
    rawReadiness = Math.round(mostRecentExamScore * 0.70 + practiceScore * 0.30);
  } else if (exams.length === 2) {
    rawReadiness = Math.round(averageExamScore * 0.75 + practiceScore * 0.25);
  } else if (recentDecline) {
    // Recent exam was significantly worse — blend average with recent score (50/50)
    // to avoid hiding a real performance drop behind old good exams
    const blendedScore = Math.round((averageExamScore + mostRecentExamScore) / 2);
    rawReadiness = Math.round(blendedScore * 0.80 + practiceScore * 0.20);
  } else {
    rawReadiness = Math.round(averageExamScore * 0.80 + practiceScore * 0.20);
  }

  // Domain safety caps
  const ethicsMastery = domainMastery["professional_conduct"] || 0;
  const measurementMastery = domainMastery["measurement"] || 0;
  const behaviorReductionMastery = domainMastery["behavior_reduction"] || 0;

  let readinessCappedBy = null;
  if (ethicsMastery < 75 && domainAttemptCounts["professional_conduct"] >= 5) {
    readinessCappedBy = "Ethics & Professional Conduct below 75%";
  } else if (measurementMastery < 70 && domainAttemptCounts["measurement"] >= 5) {
    readinessCappedBy = "Measurement below 70%";
  } else if (behaviorReductionMastery < 70 && domainAttemptCounts["behavior_reduction"] >= 5) {
    readinessCappedBy = "Behavior Reduction below 70%";
  }

  const readinessScore = readinessCappedBy
    ? Math.min(rawReadiness, 78)
    : Math.min(100, rawReadiness);

  const readinessLabel =
    readinessScore >= 85 ? "Strong Pass Probability"
    : readinessScore >= 70 ? "Likely Exam Ready"
    : readinessScore >= 50 ? "Needs Reinforcement"
    : "At Risk";

  const readinessConfidence =
    exams.length >= 2 ? "high"
    : exams.length === 1 ? "medium"
    : totalQuestionsCompleted >= 50 ? "medium"
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
    readiness_label: readinessLabel,
    readiness_confidence: readinessConfidence,
    readiness_capped_by: readinessCappedBy,
    readiness_recent_decline: recentDecline,
    most_recent_exam_score: mostRecentExamScore,
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
    average_mock_exam_score: Math.min(100, averageExamScore),
    task_list_section_mastery: taskListBreakdown.mastery,
    task_list_section_attempts: taskListBreakdown.counts,
  };
}
