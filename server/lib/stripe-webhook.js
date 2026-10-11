import { isPremiumPlan } from '../../shared/plan-access.js';
import { resolvePlanFromStripeData } from './billing.js';
import { applyInvoicePaid, getInvoiceSubscriptionId, syncConfirmedCheckout } from './stripe-sync.js';

const objectId = value => typeof value === 'string' ? value : value?.id || null;
const checkoutTypes = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

// Retrieve missing linkage from Stripe, never from client-supplied account data.
// Fetch the current subscription so a late invoice cannot reactivate a cancelled one.
export async function prepareStripeEvent(event, stripe) {
  if (!checkoutTypes.has(event.type) && !["invoice.paid", "invoice.payment_failed", "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) return event;
  let object = { ...event.data.object };
  const subscriptionId = event.type.startsWith('customer.subscription.')
    ? object.id : getInvoiceSubscriptionId(object) || objectId(object.subscription);
  let subscription = null;
  if (subscriptionId) subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (checkoutTypes.has(event.type) && object.mode === 'subscription') {
    object.metadata = { ...subscription?.metadata, ...object.metadata };
  }
  if (event.type.startsWith('invoice.') && subscription) {
    const details = object.parent?.subscription_details || object.subscription_details || {};
    object.parent = { ...object.parent, subscription_details: {
      ...details, subscription: subscription.id,
      metadata: { ...subscription.metadata, ...details.metadata },
    } };
  }
  if (event.type.startsWith('customer.subscription.') && subscription) object = subscription;
  let email = object.customer_details?.email || object.customer_email;
  if (!email && object.customer) {
    const customer = typeof object.customer === 'object' && object.customer.email
      ? object.customer : await stripe.customers.retrieve(objectId(object.customer));
    email = customer.deleted ? null : customer.email;
  }
  return { ...event, data: { ...event.data, object: { ...object, customer_email: email } }, currentSubscription: subscription };
}

async function resolveUser(db, object) {
  const metadata = object.parent?.subscription_details?.metadata || object.subscription_details?.metadata || object.metadata;
  const userId = object.client_reference_id || metadata?.user_id;
  const customerId = objectId(object.customer);
  const subscriptionId = getInvoiceSubscriptionId(object) || objectId(object.subscription) || (object.object === 'subscription' ? object.id : null);
  let user = userId ? await db.getUserById(userId) : null;
  if (!user && customerId) user = await db.getUserByStripeCustomerId(customerId);
  if (!user && subscriptionId) user = await db.getUserByStripeSubscriptionId(subscriptionId);
  const email = object.customer_details?.email || object.customer_email;
  if (!user && email) user = await db.getUserByEmail(String(email).trim().toLowerCase());
  if (!user) throw new Error(`Stripe account could not be matched for ${object.id}`);
  if (user.stripe_customer_id && customerId && user.stripe_customer_id !== customerId) {
    throw new Error(`Conflicting Stripe customer for ${object.id}`);
  }
  return user;
}

// Database adapter supplies an atomic transaction and a cross-request lock.
// Failures propagate to the HTTP handler (500), leaving the event retryable.
export async function processStripeEvent(event, { db, recordStorePurchase }) {
  return db.withStripeBillingTransaction(async () => {
    if (await db.hasStripeEvent(event.id)) return { received: true, duplicate: true };
    const object = event.data?.object || {};
    let result = { received: true };
    if (checkoutTypes.has(event.type)) {
      if (['paid', 'no_payment_required'].includes(object.payment_status)) {
        if (object.metadata?.payment_type === 'store_purchase') {
          const user = await recordStorePurchase({
            session_id: object.id, status: object.status, payment_status: object.payment_status,
            amount_total: object.amount_total, currency: object.currency,
            customer_id: objectId(object.customer), customer_email: object.customer_details?.email || object.customer_email,
            client_reference_id: object.client_reference_id, metadata: object.metadata,
            completed_at: new Date((object.created || Date.now() / 1000) * 1000).toISOString(),
          });
          if (!user) throw new Error(`Stripe store purchase could not be matched for ${object.id}`);
        } else if (object.mode === 'subscription') {
          result = await savePaidObject(event, object, db, false);
        }
      }
    } else if (event.type === 'invoice.paid' && getInvoiceSubscriptionId(object)) {
      result = await savePaidObject(event, object, db, true);
    } else if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      const user = await resolveUser(db, object);
      const plan = resolvePlanFromStripeData(object.metadata, object.items?.data?.[0]?.price?.id);
      const canceled = ['canceled', 'unpaid', 'incomplete_expired'].includes(object.status);
      const patch = { stripe_customer_id: objectId(object.customer), stripe_subscription_id: canceled ? null : object.id };
      // Do not revoke a different subscription when an older one is deleted.
      if (canceled && user.stripe_subscription_id && user.stripe_subscription_id !== object.id) {
        result = { received: true, ignored: true };
      } else {
        if (canceled) patch.plan = 'free';
        else if (['active', 'trialing'].includes(object.status)) {
          if (!isPremiumPlan(plan)) throw new Error(`Unknown Stripe plan for ${object.id}`);
          patch.plan = plan;
        }
        await db.updateUser(user.id, patch);
        result = { received: true, user: { ...user, ...patch }, action: canceled ? 'cancelled' : null };
      }
    } else if (event.type === 'invoice.payment_failed' && getInvoiceSubscriptionId(object)) {
      result = { received: true, user: await resolveUser(db, object), action: 'payment_failed' };
    }
    await db.saveStripeEvent(event.id);
    return result;
  });
}

async function savePaidObject(event, object, db, invoice) {
  const user = await resolveUser(db, object);
  const payments = await db.getPaymentsByUser(user.id);
  const current = { users: [user], payments };
  const next = invoice ? applyInvoicePaid(current, object) : syncConfirmedCheckout(current, object);
  if (next === current) throw new Error(`Unable to resolve paid Stripe plan for ${object.id}`);
  const nextUser = next.users[0];
  const subscription = event.currentSubscription;
  if (subscription && !['active', 'trialing', 'past_due'].includes(subscription.status)) nextUser.plan = user.plan;
  await db.updateUser(user.id, {
    plan: nextUser.plan, stripe_customer_id: nextUser.stripe_customer_id,
    stripe_subscription_id: subscription && ['canceled', 'unpaid', 'incomplete_expired'].includes(subscription.status)
      ? null : nextUser.stripe_subscription_id,
  });
  const payment = next.payments.find(p => invoice ? p.stripe_invoice_id === object.id : p.stripe_session_id === object.id);
  const write = await db.createPayment(payment);
  return { received: true, user: nextUser, payment: write.payment, inserted: write.inserted,
    action: write.inserted ? (invoice && object.billing_reason === 'subscription_cycle' ? 'renewed' : 'started') : null };
}
