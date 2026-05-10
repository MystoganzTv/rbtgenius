import {
  OFFICIAL_CONCEPT_COUNT,
  TOTAL_PRACTICE_QUESTIONS,
} from "./questions/question-bank.js";

export const PLAN_IDS = {
  GUEST: "guest",
  FREE: "free",
  PREMIUM_MONTHLY: "premium_monthly",
  PREMIUM_YEARLY: "premium_yearly",
};

export const FREE_DAILY_PRACTICE_LIMIT = 15;
export const FREE_DAILY_TUTOR_LIMIT = 5;
export const FREE_FLASHCARD_LIMIT = 15;
// Premium gets a "soft cap" — high enough no real student notices, low enough
// to protect against scripted abuse running up the OpenAI bill.
export const PREMIUM_DAILY_TUTOR_LIMIT = 150;

export const PREMIUM_PLAN_IDS = [
  PLAN_IDS.PREMIUM_MONTHLY,
  PLAN_IDS.PREMIUM_YEARLY,
];

export const PLAN_LABELS = {
  [PLAN_IDS.GUEST]: "Guest",
  [PLAN_IDS.FREE]: "Free",
  [PLAN_IDS.PREMIUM_MONTHLY]: "Premium Monthly",
  [PLAN_IDS.PREMIUM_YEARLY]: "Premium Yearly",
};

export const PLAN_CATALOG = [
  {
    id: PLAN_IDS.FREE,
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Create an account and build steady progress with guided daily practice.",
    cta: "Start Free",
    popular: false,
    badge: null,
  },
  {
    id: PLAN_IDS.PREMIUM_MONTHLY,
    name: "Premium Monthly",
    price: "$19.99",
    period: "/month",
    description: "Unlimited prep with mock exams, analytics, and a full AI study coach.",
    cta: "Upgrade Monthly",
    popular: true,
    badge: "Most Popular",
  },
  {
    id: PLAN_IDS.PREMIUM_YEARLY,
    name: "Premium Yearly",
    price: "$215.89",
    period: "/year",
    description: "Best value for long-term prep with everything in Premium plus a 10% annual discount.",
    cta: "Upgrade Yearly",
    popular: false,
    badge: "Save 10%",
  },
];

export const ACCESS_COMPARISON = [
  {
    id: "access",
    label: "App access",
    guest: "Landing page and pricing",
    free: "Dashboard, practice, flashcards, AI tutor",
    premium: "Everything unlocked",
  },
  {
    id: "practice",
    label: "Practice questions",
    guest: "Preview only",
    free: `${FREE_DAILY_PRACTICE_LIMIT} answered per day`,
    premium: `Unlimited across ${TOTAL_PRACTICE_QUESTIONS} questions and ${OFFICIAL_CONCEPT_COUNT} concepts`,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    guest: "Preview only",
    free: `${FREE_FLASHCARD_LIMIT} cards per session`,
    premium: "Unlimited flashcard review",
  },
  {
    id: "ai_tutor",
    label: "AI tutor",
    guest: "Preview only",
    free: `${FREE_DAILY_TUTOR_LIMIT} messages per day`,
    premium: `${PREMIUM_DAILY_TUTOR_LIMIT} messages per day`,
  },
  {
    id: "mock_exams",
    label: "Mock exams",
    guest: "Not available",
    free: "Locked",
    premium: "Full 85-question mock exams",
  },
  {
    id: "analytics",
    label: "Analytics",
    guest: "Preview only",
    free: "Locked",
    premium: "Full readiness and performance analytics",
  },
  {
    id: "forty_hour_course",
    label: "40-hour course",
    guest: "Coming soon",
    free: "Coming soon",
    premium: "Coming soon",
  },
  {
    id: "billing",
    label: "Billing tools",
    guest: "Not needed",
    free: "Upgrade from pricing page",
    premium: "Stripe checkout and billing portal",
  },
];

function clampCount(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.floor(value);
}

export function normalizePlan(plan) {
  if (PREMIUM_PLAN_IDS.includes(plan)) {
    return plan;
  }

  if (plan === PLAN_IDS.GUEST) {
    return PLAN_IDS.GUEST;
  }

  return PLAN_IDS.FREE;
}

export function isPremiumPlan(plan) {
  return PREMIUM_PLAN_IDS.includes(normalizePlan(plan));
}

export function getPlanLabel(plan) {
  return PLAN_LABELS[normalizePlan(plan)] || PLAN_LABELS[PLAN_IDS.FREE];
}

export function countTutorMessagesToday(conversations = [], todayKey = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(conversations)) {
    return 0;
  }

  return conversations.reduce((total, conversation) => {
    const messages = Array.isArray(conversation?.messages) ? conversation.messages : [];
    return (
      total +
      messages.filter(
        (message) =>
          message?.role === "user" &&
          typeof message?.created_at === "string" &&
          message.created_at.slice(0, 10) === todayKey,
      ).length
    );
  }, 0);
}

export function getEntitlements(plan, usage = {}) {
  const normalizedPlan = normalizePlan(plan);
  const premium = isPremiumPlan(normalizedPlan);
  const practiceQuestionsToday = clampCount(usage.practiceQuestionsToday);
  const tutorMessagesToday = clampCount(usage.tutorMessagesToday);
  const practiceDailyLimit =
    normalizedPlan === PLAN_IDS.GUEST
      ? 0
      : premium
        ? null
        : FREE_DAILY_PRACTICE_LIMIT;
  const aiTutorDailyLimit =
    normalizedPlan === PLAN_IDS.GUEST
      ? 0
      : premium
        ? PREMIUM_DAILY_TUTOR_LIMIT
        : FREE_DAILY_TUTOR_LIMIT;

  return {
    plan: normalizedPlan,
    label: getPlanLabel(normalizedPlan),
    is_guest: normalizedPlan === PLAN_IDS.GUEST,
    is_premium: premium,
    can_access_dashboard: normalizedPlan !== PLAN_IDS.GUEST,
    can_access_practice: normalizedPlan !== PLAN_IDS.GUEST,
    can_access_flashcards: normalizedPlan !== PLAN_IDS.GUEST,
    can_access_ai_tutor: normalizedPlan !== PLAN_IDS.GUEST,
    can_access_mock_exams: premium,
    can_access_analytics: premium,
    can_upgrade: normalizedPlan !== PLAN_IDS.GUEST && !premium,
    can_manage_billing: premium,
    practice_daily_limit: practiceDailyLimit,
    ai_tutor_daily_limit: aiTutorDailyLimit,
    usage: {
      practice_questions_today: practiceQuestionsToday,
      practice_questions_remaining:
        practiceDailyLimit === null
          ? null
          : Math.max(0, practiceDailyLimit - practiceQuestionsToday),
      tutor_messages_today: tutorMessagesToday,
      tutor_messages_remaining:
        aiTutorDailyLimit === null
          ? null
          : Math.max(0, aiTutorDailyLimit - tutorMessagesToday),
    },
  };
}

export function getGateCopy(feature) {
  switch (feature) {
    case "mock_exams":
      return {
        title: "Premium mock exams",
        description:
          "Mock exams are reserved for Premium members so they can practice under full exam conditions.",
      };
    case "analytics":
      return {
        title: "Premium analytics",
        description:
          "Analytics unlocks deeper trends, readiness tracking, and richer performance breakdowns for Premium members.",
      };
    case "practice_limit":
      return {
        title: "Daily practice limit reached",
        description:
          "Free accounts can answer a limited number of practice questions per day. Upgrade to keep going without a cap.",
      };
    case "ai_tutor_limit":
      return {
        title: "Daily AI tutor limit reached",
        description:
          "This plan includes a daily AI tutor allowance. Upgrade for more room if you need it.",
      };
    case "flashcards_limit":
      return {
        title: "Free flashcard limit reached",
        description:
          "Free accounts can review a smaller flashcard set. Upgrade to unlock the full flashcard bank.",
      };
    default:
      return {
        title: "Premium feature",
        description:
          "Upgrade to Premium to unlock the full study experience across the app.",
      };
  }
}
