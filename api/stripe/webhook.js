import Stripe from 'stripe';
import * as db from '../lib/db.js';
import { resolvePlanFromPriceId } from '../../server/lib/billing.js';
import { applyStripeWebhookEvent, syncConfirmedCheckout } from '../../server/lib/stripe-sync.js';
import { findUserForBilling } from '../../server/lib/stripe-sync.js';
import { notifyNewSubscription } from '../../server/lib/admin-notify.js';

export const config = {
  api: { bodyParser: false },
};

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await readRawBody(req);
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeKey) {
    console.error('[stripe/webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  let event;
  try {
    const stripe = new Stripe(stripeKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log('[stripe/webhook] Event received:', event.type);

  try {
    if (await db.hasStripeEvent(event.id)) {
      console.log('[stripe/webhook] Duplicate event ignored:', event.id);
      return res.status(200).json({ received: true, duplicate: true });
    }
    await db.saveStripeEvent(event.id);

    if (event.type === 'checkout.session.completed') {
      const checkout = event.data?.object || {};
      const allUsers = await db.getAllUsers();
      const allPayments = await db.getAllPayments();
      const mockNext = applyStripeWebhookEvent({ users: allUsers, payments: allPayments }, event, createId);
      for (const u of mockNext.users) {
        const orig = allUsers.find(x => x.id === u.id);
        if (orig && (orig.plan !== u.plan || orig.stripe_customer_id !== u.stripe_customer_id))
          await db.updateUser(u.id, { plan: u.plan, stripe_customer_id: u.stripe_customer_id });
      }
      for (const p of mockNext.payments) {
        if (!allPayments.find(x => x.id === p.id)) await db.createPayment(p);
      }
      const user = findUserForBilling({ users: mockNext.users, payments: mockNext.payments }, {
        userId: checkout.client_reference_id,
        customerId: typeof checkout.customer === 'string' ? checkout.customer : checkout.customer?.id,
        email: checkout.customer_details?.email || checkout.customer_email,
      });
      if (user) await notifyNewSubscription({ user, plan: checkout.metadata?.plan || user.plan, checkout });
      console.log('[stripe/webhook] checkout.session.completed processed');
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data?.object || {};
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const user = await db.getUserByStripeCustomerId(customerId);
      if (user) {
        if (sub.status === 'active') {
          const priceId = sub.items?.data?.[0]?.price?.id;
          const plan = resolvePlanFromPriceId(priceId);
          if (plan && plan !== 'free') await db.updateUser(user.id, { plan });
        }
        if (sub.status === 'canceled' || sub.status === 'unpaid') {
          await db.updateUser(user.id, { plan: 'free' });
        }
        console.log(`[stripe/webhook] subscription.updated → ${user.email} status=${sub.status}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data?.object || {};
      const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
      const user = await db.getUserByStripeCustomerId(customerId);
      if (user) {
        await db.updateUser(user.id, { plan: 'free' });
        console.log(`[stripe/webhook] subscription.deleted → ${user.email} downgraded to free`);
      }
    }

    if (event.type === 'invoice.paid') {
      const invoice = event.data?.object || {};
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      const user = await db.getUserByStripeCustomerId(customerId);
      if (user && invoice.billing_reason === 'subscription_cycle') {
        const priceId = invoice.lines?.data?.[0]?.price?.id;
        const plan = resolvePlanFromPriceId(priceId);
        if (plan && plan !== 'free' && user.plan !== plan) await db.updateUser(user.id, { plan });
        await db.createPayment({
          id: createId('pay'),
          user_id: user.id,
          status: 'completed',
          amount: (invoice.amount_paid || 0) / 100,
          payment_date: new Date((invoice.created || Date.now() / 1000) * 1000).toISOString(),
          created_at: new Date().toISOString(),
          metadata: { invoice_id: invoice.id, reason: 'subscription_renewal' },
        });
        console.log(`[stripe/webhook] invoice.paid renewal recorded for ${user.email}`);
      }
    }
  } catch (err) {
    console.error('[stripe/webhook] Error handling event:', err.message);
    // Return 200 anyway so Stripe doesn't retry (event is saved as processed)
  }

  return res.status(200).json({ received: true });
}
