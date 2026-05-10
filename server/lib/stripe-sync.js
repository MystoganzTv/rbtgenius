import { PLAN_IDS, isPremiumPlan, normalizePlan } from "../../shared/plan-access.js";
import { resolvePlanFromPriceId } from "./billing.js";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeCurrency(value) {
  return String(value || "usd").toUpperCase();
}

function getObjectId(value) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id || null;
}

function resolveInvoicePriceId(invoice) {
  const firstLine = invoice?.lines?.data?.[0];
  return (
    firstLine?.price?.id ||
    firstLine?.pricing?.price_details?.price ||
    firstLine?.plan?.id ||
    null
  );
}

function resolveSubscriptionPriceId(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || null;
}

function resolveStripePlan({ metadata, priceId }) {
  const metadataPlan = normalizePlan(metadata?.plan);
  if (isPremiumPlan(metadataPlan)) {
    return metadataPlan;
  }

  const pricePlan = resolvePlanFromPriceId(priceId);
  return isPremiumPlan(pricePlan) ? pricePlan : PLAN_IDS.FREE;
}

export function findUserForBilling(db, lookup = {}) {
  const {
    userId = null,
    customerId = null,
    subscriptionId = null,
    email = null,
  } = lookup;

  return (
    db.users.find((user) => user.id === userId) ||
    db.users.find((user) => user.stripe_customer_id && user.stripe_customer_id === customerId) ||
    db.users.find(
      (user) => user.stripe_subscription_id && user.stripe_subscription_id === subscriptionId,
    ) ||
    db.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) ||
    null
  );
}

function upsertPayment(payments, match, nextPayment) {
  const index = payments.findIndex(match);
  if (index === -1) {
    return [nextPayment, ...payments];
  }

  return payments.map((payment, paymentIndex) => {
    if (paymentIndex !== index) {
      return payment;
    }

    return {
      ...payment,
      ...nextPayment,
      id: payment.id,
      created_at: payment.created_at || nextPayment.created_at,
    };
  });
}

export function syncConfirmedCheckout(current, checkout, createId) {
  const user = findUserForBilling(current, {
    userId: checkout.client_reference_id,
    customerId: getObjectId(checkout.customer),
    subscriptionId: getObjectId(checkout.subscription),
    email: checkout.customer_details?.email || checkout.customer_email,
  });

  if (!user) {
    return current;
  }

  const plan = resolveStripePlan({
    metadata: checkout.metadata,
    priceId: null,
  });

  if (!isPremiumPlan(plan)) {
    return current;
  }

  const nextPayment = {
    id: createId("payment"),
    user_id: user.id,
    created_at: new Date().toISOString(),
    plan,
    amount: Number((((checkout.amount_total || 0) / 100) || 0).toFixed(2)),
    currency: normalizeCurrency(checkout.currency),
    status: checkout.payment_status === "paid" ? "completed" : checkout.status || "complete",
    payment_date: new Date((checkout.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    provider: "stripe",
    provider_label: "Stripe",
    stripe_session_id: checkout.id,
    stripe_customer_id: getObjectId(checkout.customer),
    stripe_subscription_id: getObjectId(checkout.subscription),
    stripe_invoice_id: getObjectId(checkout.invoice),
  };

  return {
    ...current,
    users: current.users.map((entry) =>
      entry.id === user.id
        ? {
            ...entry,
            plan,
            stripe_customer_id: getObjectId(checkout.customer) || entry.stripe_customer_id || null,
            stripe_subscription_id:
              getObjectId(checkout.subscription) || entry.stripe_subscription_id || null,
          }
        : entry,
    ),
    payments: upsertPayment(
      current.payments,
      (payment) => payment.stripe_session_id === checkout.id,
      nextPayment,
    ),
  };
}

function applyInvoicePaid(current, invoice, createId) {
  if (invoice?.billing_reason === "subscription_create") {
    return current;
  }

  const user = findUserForBilling(current, {
    customerId: getObjectId(invoice.customer),
    subscriptionId: getObjectId(invoice.subscription),
    email: invoice.customer_email,
  });

  if (!user) {
    return current;
  }

  const plan = resolveStripePlan({
    metadata: invoice.parent?.subscription_details?.metadata || invoice.subscription_details?.metadata,
    priceId: resolveInvoicePriceId(invoice),
  });

  if (!isPremiumPlan(plan)) {
    return current;
  }

  const nextPayment = {
    id: createId("payment"),
    user_id: user.id,
    created_at: new Date().toISOString(),
    plan,
    amount: Number((((invoice.amount_paid || invoice.amount_due || 0) / 100) || 0).toFixed(2)),
    currency: normalizeCurrency(invoice.currency),
    status: "completed",
    payment_date: new Date((invoice.status_transitions?.paid_at || invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    provider: "stripe",
    provider_label: "Stripe",
    stripe_session_id: null,
    stripe_customer_id: getObjectId(invoice.customer),
    stripe_subscription_id: getObjectId(invoice.subscription),
    stripe_invoice_id: invoice.id,
  };

  return {
    ...current,
    users: current.users.map((entry) =>
      entry.id === user.id
        ? {
            ...entry,
            plan,
            stripe_customer_id: getObjectId(invoice.customer) || entry.stripe_customer_id || null,
            stripe_subscription_id:
              getObjectId(invoice.subscription) || entry.stripe_subscription_id || null,
          }
        : entry,
    ),
    payments: upsertPayment(
      current.payments,
      (payment) => payment.stripe_invoice_id === invoice.id,
      nextPayment,
    ),
  };
}

function applySubscriptionDeleted(current, subscription) {
  const user = findUserForBilling(current, {
    customerId: getObjectId(subscription.customer),
    subscriptionId: subscription.id,
  });

  if (!user) {
    return current;
  }

  return {
    ...current,
    users: current.users.map((entry) =>
      entry.id === user.id
        ? {
            ...entry,
            plan: PLAN_IDS.FREE,
            stripe_customer_id: getObjectId(subscription.customer) || entry.stripe_customer_id || null,
            stripe_subscription_id: null,
          }
        : entry,
    ),
  };
}

export function applyStripeWebhookEvent(current, event, createId) {
  if (!event?.id || current?.stripeEvents?.[event.id]) {
    return current;
  }

  let next = current;

  switch (event.type) {
    case "checkout.session.completed":
      next = syncConfirmedCheckout(next, event.data?.object || {}, createId);
      break;
    case "invoice.paid":
      next = applyInvoicePaid(next, event.data?.object || {}, createId);
      break;
    case "customer.subscription.deleted":
      next = applySubscriptionDeleted(next, event.data?.object || {});
      break;
    default:
      break;
  }

  return {
    ...next,
    stripeEvents: {
      ...(next.stripeEvents || {}),
      [event.id]: {
        type: event.type,
        processed_at: new Date().toISOString(),
      },
    },
  };
}
