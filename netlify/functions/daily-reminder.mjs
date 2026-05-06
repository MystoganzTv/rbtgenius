/**
 * daily-reminder.mjs
 * Netlify Scheduled Function — corre todos los días a las 19:00 UTC (7pm)
 * Lee los pushTokens guardados en la DB y envía notificaciones vía Expo Push API.
 *
 * Docs: https://docs.netlify.com/functions/scheduled-functions/
 * Expo Push: https://docs.expo.dev/push-notifications/sending-notifications/
 */

import { getStore } from '@netlify/blobs';
import { buildSeedDb, normalizeDb } from '../../server/lib/seed.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const STORE_NAME    = 'rbt-genius-db';

const MESSAGES = [
  { title: '🎯 Time to practice!',       body: 'Keep your streak and boost your readiness score today.' },
  { title: '📚 RBT Genius is waiting',   body: 'A few minutes of practice makes a real difference.' },
  { title: '🔥 Don\'t break your streak!', body: 'Practice now and keep moving toward your certification.' },
  { title: '✅ Study session pending',    body: 'Your RBT exam is coming — a quick practice helps a lot.' },
];

async function readDb() {
  const store = getStore(STORE_NAME);
  const db    = await store.get('db', { type: 'json' });
  return db ? normalizeDb(db) : buildSeedDb();
}

// Pick a message based on the day of the week so users get variety
function pickMessage() {
  const dayIndex = new Date().getDay(); // 0=Sun … 6=Sat
  return MESSAGES[dayIndex % MESSAGES.length];
}

// Send to Expo in batches of 100 (Expo limit)
async function sendBatch(tokens, message) {
  const notifications = tokens.map(token => ({
    to:    token,
    sound: 'default',
    title: message.title,
    body:  message.body,
    data:  { screen: 'Practice' },
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(notifications),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Expo push failed: ${res.status} — ${text}`);
  }

  return await res.json();
}

export default async function handler() {
  try {
    const db         = await readDb();
    const pushTokens = db.pushTokens ?? {};
    const entries    = Object.values(pushTokens);

    if (entries.length === 0) {
      console.log('[daily-reminder] No push tokens registered — skipping.');
      return;
    }

    // Filter only valid Expo push tokens (ExponentPushToken[...] or exp format)
    const validTokens = entries
      .map(e => e.token)
      .filter(t => typeof t === 'string' && t.startsWith('ExponentPushToken'));

    if (validTokens.length === 0) {
      console.log('[daily-reminder] No valid Expo tokens found.');
      return;
    }

    const message = pickMessage();
    console.log(`[daily-reminder] Sending "${message.title}" to ${validTokens.length} devices`);

    // Batch in groups of 100
    const BATCH = 100;
    for (let i = 0; i < validTokens.length; i += BATCH) {
      const batch = validTokens.slice(i, i + BATCH);
      const result = await sendBatch(batch, message);
      console.log(`[daily-reminder] Batch ${Math.floor(i / BATCH) + 1}:`, JSON.stringify(result?.data?.slice(0, 3)));
    }

    console.log('[daily-reminder] Done ✅');
  } catch (err) {
    console.error('[daily-reminder] Error:', err.message);
    // Don't throw — Netlify marks function as failed if we throw,
    // which can trigger retries. Better to log and exit cleanly.
  }
}

// Required by Netlify Scheduled Functions
export const config = {
  schedule: '0 19 * * *', // Every day at 19:00 UTC (7pm)
};
