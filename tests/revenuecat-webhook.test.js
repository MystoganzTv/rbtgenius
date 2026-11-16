import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../mobile/package.json', import.meta.url));
const babel = require('@babel/core');
const filename = new URL('../api/index.js', import.meta.url);
const source = readFileSync(filename, 'utf8');
const imports = babel.parseSync(source, { babelrc: false, configFile: false }).program.body
  .filter(n => n.type === 'ImportDeclaration').map(n => n.source.value);
const modules = {};
for (const id of imports) if (id !== './lib/db.js') {
  modules[id] = { __esModule: true, ...await import(id.startsWith('.') ? new URL(id, filename).href : id) };
}
const { code } = babel.transformSync(source, { babelrc: false, configFile: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')] });

function fixture({ subscriber = null, apiError = false, writeError = false, stripe = false, plan = 'premium_monthly' } = {}) {
  let user = { id: 'member', plan, stripe_subscription_id: stripe ? 'sub_web' : null };
  const notifications = [], payments = new Map();
  const db = {
    getUserById: async () => user,
    updateUser: async (_, patch) => {
      if (writeError) throw new Error('Database unavailable');
      user = { ...user, ...patch }; return user;
    },
    getAdminPushTokens: async () => [],
    createPayment: async payment => {
      const inserted = !payments.has(payment.id);
      payments.set(payment.id, payment); return { inserted };
    },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (id === './lib/db.js') return db;
    if (id === '../server/lib/revenuecat.js') return {
      ...modules[id], verifyWebhookAuth: () => true,
      fetchRevenueCatSubscriber: async () => { if (apiError) throw new Error('Provider unavailable'); return subscriber; },
    };
    if (id === '../server/lib/admin-notify.js') return { ...modules[id],
      notifySubscriptionEvent: async event => { notifications.push(event); return {}; },
      sendPaymentConfirmation: async () => ({ sent: true }),
    };
    return modules[id];
  }, module, module.exports);
  return {
    user: () => user, notifications, payments,
    post: event => module.exports.default(new Request('https://test.local/api/billing/revenuecat-webhook', {
      method: 'POST', body: JSON.stringify({ event: { app_user_id: 'member', environment: 'PRODUCTION',
        product_id: 'com.rbtgenius.monthly', ...event } }),
    })),
  };
}

test('trial billing failure then expiration reports no grace and billing-driven loss of access', async () => {
  const f = fixture();
  assert.equal((await f.post({ type: 'BILLING_ISSUE', period_type: 'TRIAL', grace_period_expiration_at_ms: null })).status, 200);
  assert.equal(f.user().plan, 'premium_monthly');
  assert.match(f.notifications[0].details.Note, /No active store grace period/);
  assert.equal((await f.post({ type: 'EXPIRATION', expiration_reason: 'BILLING_ERROR' })).status, 200);
  assert.equal(f.user().plan, 'free');
  assert.equal(f.notifications[1].kind, 'billing_expired');
});

test('delayed expiration cannot remove access after recovery or during store grace', async () => {
  for (const inGrace of [false, true]) {
    const future = new Date(Date.now() + 86400000).toISOString();
    const f = fixture({ subscriber: {
      entitlements: { pro: { product_identifier: 'com.rbtgenius.monthly', expires_date: inGrace ? '2020-01-01' : future } },
      subscriptions: { 'com.rbtgenius.monthly': { grace_period_expires_date: inGrace ? future : null } },
    } });
    assert.equal((await f.post({ type: 'EXPIRATION' })).status, 200);
    assert.equal(f.user().plan, 'premium_monthly');
    assert.equal(f.notifications.length, 0);
  }
});

test('provider and database failures request retries without silently losing the event', async () => {
  for (const options of [{ apiError: true }, { writeError: true }]) {
    const f = fixture(options);
    assert.equal((await f.post({ type: 'EXPIRATION' })).status, 500);
    assert.equal(f.user().plan, 'premium_monthly');
  }
});

test('successful retry of payment restores Premium and records the renewal only once', async () => {
  const f = fixture({ plan: 'free' });
  const event = { type: 'RENEWAL', transaction_id: 'recovered', price: 19.99, period_type: 'NORMAL' };
  assert.equal((await f.post(event)).status, 200);
  assert.equal((await f.post(event)).status, 200);
  assert.equal(f.user().plan, 'premium_monthly');
  assert.equal(f.payments.size, 1);
  assert.equal(f.notifications.length, 1);
  assert.equal(f.notifications[0].kind, 'renewed');
});

test('RevenueCat expiration never removes an active Stripe subscription', async () => {
  const f = fixture({ stripe: true, apiError: true });
  assert.equal((await f.post({ type: 'EXPIRATION' })).status, 200);
  assert.equal(f.user().plan, 'premium_monthly');
});
