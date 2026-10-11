import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareStripeEvent, processStripeEvent } from '../server/lib/stripe-webhook.js';
import { syncConfirmedCheckout, findUserForBilling } from '../server/lib/stripe-sync.js';

const user = { id: 'u1', email: 'eric@example.com', plan: 'free', stripe_customer_id: null, stripe_subscription_id: null };
const checkout = { id: 'cs_1', mode: 'subscription', customer: 'cus_1', subscription: 'sub_1', invoice: 'in_1',
  client_reference_id: 'u1', metadata: { plan: 'premium_monthly', user_id: 'u1' },
  payment_status: 'paid', status: 'complete', amount_total: 1999, currency: 'usd', created: 1789415800 };
const invoice = { id: 'in_1', customer: 'cus_1', customer_email: 'eric@example.com', billing_reason: 'subscription_create',
  parent: { subscription_details: { subscription: 'sub_1', metadata: { plan: 'premium_monthly', user_id: 'u1' } } },
  amount_paid: 1999, currency: 'usd', created: 1789415800 };
const event = (type, object, id = `${type}_${object.id}`) => ({ id, type, data: { object } });

function fixture() {
  let state = { users: [structuredClone(user)], payments: [], events: [] };
  let queue = Promise.resolve();
  let fail = null;
  const db = {
    withStripeBillingTransaction(work) {
      const run = queue.then(async () => {
        const before = structuredClone(state);
        try { return await work(); } catch (err) { state = before; throw err; }
      });
      queue = run.catch(() => {});
      return run;
    },
    async hasStripeEvent(id) { return state.events.includes(id); },
    async saveStripeEvent(id) { if (fail === 'event') throw Error('event write failed'); state.events.push(id); },
    async getUserById(id) { return state.users.find(u => u.id === id) || null; },
    async getUserByStripeCustomerId(id) { return state.users.find(u => u.stripe_customer_id === id) || null; },
    async getUserByStripeSubscriptionId(id) { return state.users.find(u => u.stripe_subscription_id === id) || null; },
    async getUserByEmail(email) { return state.users.find(u => u.email === email) || null; },
    async getPaymentsByUser(id) { return state.payments.filter(p => p.user_id === id); },
    async updateUser(id, patch) { state.users = state.users.map(u => u.id === id ? { ...u, ...patch } : u); },
    async createPayment(payment) {
      if (fail === 'payment') throw Error('payment write failed');
      const existing = state.payments.find(p => p.id === payment.id);
      state.payments = [...state.payments.filter(p => p.id !== payment.id), payment];
      return { inserted: !existing, payment };
    },
  };
  return { db, state: () => state, fail: value => { fail = value; }, run: e => processStripeEvent(e, { db }) };
}

for (const first of ['checkout', 'invoice']) test(`first payment activates Premium once when ${first} arrives first`, async () => {
  const f = fixture();
  const events = [event('checkout.session.completed', checkout), event('invoice.paid', invoice)];
  if (first === 'invoice') events.reverse();
  const results = [];
  for (const e of events) results.push(await f.run(e));
  assert.equal(f.state().users[0].plan, 'premium_monthly');
  assert.equal(f.state().users[0].stripe_subscription_id, 'sub_1');
  assert.equal(f.state().payments.length, 1);
  assert.equal(f.state().payments[0].amount, 19.99);
  assert.equal(f.state().payments[0].stripe_session_id, 'cs_1');
  assert.equal(results.filter(r => r.inserted).length, 1);
  assert.equal((await f.run(events[0])).duplicate, true);
});

test('concurrent checkout, invoice and browser confirmation do not duplicate payments', async () => {
  const f = fixture();
  const result = await Promise.all([
    f.run(event('checkout.session.completed', checkout)), f.run(event('invoice.paid', invoice)),
    f.run(event('checkout.session.completed', checkout, 'checkout_confirm_cs_1')),
  ]);
  assert.equal(f.state().payments.length, 1);
  assert.equal(result.filter(r => r.inserted).length, 1);
});

for (const failure of ['payment', 'event']) test(`${failure} failure rolls back and permits a successful retry`, async () => {
  const f = fixture(); f.fail(failure);
  const e = event('checkout.session.completed', checkout);
  await assert.rejects(f.run(e), /write failed/);
  assert.equal(f.state().users[0].plan, 'free');
  assert.equal(f.state().payments.length, 0);
  assert.equal(f.state().events.length, 0);
  f.fail(null); await f.run(e);
  assert.equal(f.state().users[0].plan, 'premium_monthly');
});

test('unmatched paid events remain retryable instead of disappearing', async () => {
  const f = fixture();
  const e = event('checkout.session.completed', { ...checkout, client_reference_id: 'missing', metadata: { plan: 'premium_monthly' } });
  await assert.rejects(f.run(e), /could not be matched/);
  assert.equal(f.state().events.length, 0);
});

test('unknown plan remains retryable', async () => {
  const f = fixture();
  await assert.rejects(f.run(event('checkout.session.completed', { ...checkout, metadata: {} })), /resolve paid Stripe plan/);
  assert.equal(f.state().events.length, 0);
});

test('unpaid completed Checkout waits for async success', async () => {
  const f = fixture();
  await f.run(event('checkout.session.completed', { ...checkout, payment_status: 'unpaid' }));
  assert.equal(f.state().users[0].plan, 'free');
  assert.equal(f.state().payments.length, 0);
  await f.run(event('checkout.session.async_payment_succeeded', checkout));
  assert.equal(f.state().users[0].plan, 'premium_monthly');
});

test('zero paid invoice does not invent revenue from amount_due', async () => {
  const f = fixture();
  await f.run(event('invoice.paid', { ...invoice, amount_paid: 0, amount_due: 1999 }));
  assert.equal(f.state().payments[0].amount, 0);
});

test('subscription metadata can link an account without Checkout', async () => {
  const f = fixture();
  await f.run(event('customer.subscription.created', { id: 'sub_1', object: 'subscription', customer: 'cus_1', status: 'active', metadata: checkout.metadata }));
  assert.equal(f.state().users[0].stripe_customer_id, 'cus_1');
  assert.equal(f.state().users[0].plan, 'premium_monthly');
});

test('enrichment recovers invoice metadata and customer email from Stripe', async () => {
  const prepared = await prepareStripeEvent(event('invoice.paid', { ...invoice, customer_email: null, parent: { subscription_details: { subscription: 'sub_1' } } }), {
    subscriptions: { retrieve: async id => ({ id, status: 'active', metadata: checkout.metadata }) },
    customers: { retrieve: async id => ({ id, email: user.email }) },
  });
  assert.equal(prepared.data.object.parent.subscription_details.metadata.user_id, 'u1');
  const f = fixture(); await f.run(prepared);
  assert.equal(f.state().users[0].plan, 'premium_monthly');
});

test('late invoice records money but cannot reactivate a canceled subscription', async () => {
  const f = fixture();
  await f.run({ ...event('invoice.paid', invoice), currentSubscription: { id: 'sub_1', status: 'canceled' } });
  assert.equal(f.state().users[0].plan, 'free');
  assert.equal(f.state().users[0].stripe_subscription_id, null);
  assert.equal(f.state().payments.length, 1);
});

test('an unrelated invoice and empty emails cannot assign access', async () => {
  const f = fixture();
  await f.run(event('invoice.paid', { ...invoice, parent: null, subscription: null }));
  assert.equal(f.state().payments.length, 0);
  assert.equal(findUserForBilling({ users: [{ id: 'empty' }] }), null);
  assert.equal(syncConfirmedCheckout({ users: [user], payments: [] }, { ...checkout, payment_status: 'unpaid' }).users[0].plan, 'free');
});

test('both public webhook URLs reject invalid signatures before any database write', async () => {
  const { default: mainHandler } = await import('../api/index.js');
  const { default: legacyHandler } = await import('../api/stripe/webhook.js');
  assert.equal(legacyHandler, mainHandler);
  for (const path of ['/api/stripe/webhook', '/api/billing/webhook']) {
    const res = await legacyHandler(new Request(`https://www.rbtgenius.com${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 'invalid' }, body: '{}',
    }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).message, 'Invalid Stripe webhook signature');
  }
});

test('Stripe return URLs preserve the literal session placeholder for web and mobile', async () => {
  const { buildAbsoluteUrl, buildReturnUrl } = await import('../server/lib/billing.js');
  const params = { checkout: 'success', session_id: '{CHECKOUT_SESSION_ID}' };
  assert.equal(buildAbsoluteUrl('https://www.rbtgenius.com', '/profile', params),
    'https://www.rbtgenius.com/profile?checkout=success&session_id={CHECKOUT_SESSION_ID}');
  assert.equal(buildReturnUrl('rbtgenius://checkout?source=mobile', params),
    'rbtgenius://checkout?source=mobile&checkout=success&session_id={CHECKOUT_SESSION_ID}');
  assert.equal(buildReturnUrl('https://www.rbtgenius.com/profile', { query: 'a&b c' }),
    'https://www.rbtgenius.com/profile?query=a%26b+c');
});
