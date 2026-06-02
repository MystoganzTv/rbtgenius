import { getPushTokensWithUserStats } from '../lib/db.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE    = 100;

// Human-readable domain names for push notification copy
const DOMAIN_LABELS = {
  measurement:          'Measurement',
  assessment:           'Assessment',
  skill_acquisition:    'Skill Acquisition',
  behavior_reduction:   'Behavior Reduction',
  documentation:        'Documentation',
  professional_conduct: 'Ethics',
};

// ── Message builders ────────────────────────────────────────────────────────

/**
 * Build a personalized push message for one user.
 * Priority:
 *   1. User hasn't studied in ≥2 days  → "You haven't practiced in N days"
 *   2. User has a weak domain (≥5 attempts, <70%)  → mention it
 *   3. User is doing well but could improve  → encouraging message
 *   4. Fallback generic
 */
function buildMessage(stats) {
  if (!stats) return genericMessage();

  const { domains, lastAt } = stats;

  // 1. Days without practice
  const daysSince = lastAt
    ? Math.floor((Date.now() - lastAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysSince !== null && daysSince >= 2) {
    if (daysSince >= 7) {
      return {
        title: '👋 We miss you!',
        body: `It's been ${daysSince} days since your last session. Jump back in — your exam prep is waiting.`,
        data: { screen: 'Practice' },
      };
    }
    return {
      title: `🔥 ${daysSince} days without practice`,
      body: 'A quick 5-minute session keeps your readiness score on track.',
      data: { screen: 'Practice' },
    };
  }

  // 2. Weakest domain (≥5 attempts, lowest %)
  const qualified = Object.entries(domains)
    .filter(([, v]) => v.pct !== null)   // needs ≥5 attempts
    .sort(([, a], [, b]) => a.pct - b.pct);

  const weakest = qualified[0];
  if (weakest) {
    const [domainKey, { pct }] = weakest;
    const label = DOMAIN_LABELS[domainKey] ?? domainKey;

    if (pct < 50) {
      return {
        title: `📉 ${label} needs work`,
        body: `You're at ${pct}% in ${label}. Focus on it today to close the gap before exam day.`,
        data: { screen: 'Practice', initialTopic: domainKey },
      };
    }
    if (pct < 70) {
      return {
        title: `📊 Strengthen ${label}`,
        body: `${pct}% in ${label} — a focused session today could push you past 70%.`,
        data: { screen: 'Practice', initialTopic: domainKey },
      };
    }
  }

  // 3. Doing well — encourage consistency
  const best = qualified[qualified.length - 1];
  if (best && best[1].pct >= 80) {
    return {
      title: '✅ Keep the momentum!',
      body: `Your ${DOMAIN_LABELS[best[0]] ?? best[0]} is at ${best[1].pct}%. Keep it sharp with a quick review.`,
      data: { screen: 'Practice' },
    };
  }

  return genericMessage();
}

function genericMessage() {
  const options = [
    { title: '🎯 Time to practice!',        body: 'A few minutes today keeps your readiness score climbing.' },
    { title: '📚 RBT Genius is waiting',    body: 'Keep moving toward your certification — practice now.' },
    { title: "🔥 Don't break your streak!", body: 'Every session counts. Open the app and stay consistent.' },
    { title: '✅ Study session pending',     body: 'Your RBT exam prep continues — pick up where you left off.' },
  ];
  return { ...options[new Date().getDay() % options.length], data: { screen: 'Practice' } };
}

// ── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Fetch all push tokens enriched with per-user domain stats
  const users = await getPushTokensWithUserStats();
  if (!users.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  // Build one personalized payload per user
  const payloads = users.map(({ token, stats }) => ({
    to:    token,
    sound: 'default',
    ...buildMessage(stats),
  }));

  let sent = 0;
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    try {
      await fetch(EXPO_PUSH_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body:    JSON.stringify(batch),
      });
      sent += batch.length;
    } catch { /* continue — don't let one failed batch kill the rest */ }
  }

  return new Response(
    JSON.stringify({ sent, total: users.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}
