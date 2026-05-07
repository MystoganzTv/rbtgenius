import { getAllPushTokens } from '../lib/db.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const MESSAGES = [
  { title: '🎯 Time to practice!',        body: 'Keep your streak and boost your readiness score today.' },
  { title: '📚 RBT Genius is waiting',    body: 'A few minutes of practice makes a real difference.' },
  { title: "🔥 Don't break your streak!", body: 'Practice now and keep moving toward your certification.' },
  { title: '✅ Study session pending',     body: 'Your RBT exam is coming — a quick practice helps a lot.' },
];

function pickMessage() {
  return MESSAGES[new Date().getDay() % MESSAGES.length];
}

export default async function handler(req) {
  // Vercel cron jobs call with GET and include a secret header
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const tokens = await getAllPushTokens();
  if (tokens.length === 0) return new Response(JSON.stringify({ sent: 0 }), { status: 200 });

  const msg = pickMessage();
  const BATCH = 100;
  let sent = 0;

  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH).map(({ token }) => ({
      to: token,
      title: msg.title,
      body: msg.body,
      sound: 'default',
      data: { screen: 'Practice' },
    }));

    try {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
      sent += batch.length;
    } catch { /* continue with next batch */ }
  }

  return new Response(JSON.stringify({ sent }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
