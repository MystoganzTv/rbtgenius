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
    (email && db.users.find((user) => normalizeEmail(user.email) === normalizeEmail(email))) ||
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
      ...Object.fromEntries(Object.entries(payment).filter(([key, value]) => key.startsWith("stripe_") && value && !nextPayment[key])),
      id: payment.id,
      created_at: payment.created_at || nextPayment.created_at,
    };
  });
}

export function syncConfirmedCheckout(current, checkout, createId) {
  if (!["paid", "no_payment_required"].includes(checkout.payment_status)) return current;
  const user = findUserForBilling(current, {
    userId: checkout.client_reference_id || checkout.metadata?.user_id,
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
    id: getObjectId(checkout.invoice) ? `pay_stripe_invoice_${getObjectId(checkout.invoice)}` : `pay_stripe_session_${checkout.id}`,
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
    stripe_payment_intent_id: getObjectId(checkout.payment_intent),
    stripe_charge_id: null,
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
      (payment) => payment.stripe_session_id === checkout.id ||
        (getObjectId(checkout.invoice) && payment.stripe_invoice_id === getObjectId(checkout.invoice)),
      nextPayment,
    ),
  };
}

export function getInvoiceSubscriptionId(invoice) {
  return getObjectId(invoice.parent?.subscription_details?.subscription || invoice.subscription);
}

export function applyInvoicePaid(current, invoice, createId) {
  if (!getInvoiceSubscriptionId(invoice)) return current;

  const user = findUserForBilling(current, {
    customerId: getObjectId(invoice.customer),
    subscriptionId: getInvoiceSubscriptionId(invoice),
    userId: invoice.parent?.subscription_details?.metadata?.user_id || invoice.subscription_details?.metadata?.user_id,
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
    id: `pay_stripe_invoice_${invoice.id}`,
    user_id: user.id,
    created_at: new Date().toISOString(),
    plan,
    amount: Number((((invoice.amount_paid ?? 0) / 100) || 0).toFixed(2)),
    currency: normalizeCurrency(invoice.currency),
    status: "completed",
    payment_date: new Date((invoice.status_transitions?.paid_at || invoice.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    provider: "stripe",
    provider_label: "Stripe",
    stripe_session_id: null,
    stripe_customer_id: getObjectId(invoice.customer),
    stripe_subscription_id: getInvoiceSubscriptionId(invoice),
    stripe_invoice_id: invoice.id,
    stripe_payment_intent_id: getObjectId(invoice.payment_intent),
    stripe_charge_id: getObjectId(invoice.charge),
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
              getInvoiceSubscriptionId(invoice) || entry.stripe_subscription_id || null,
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

function matchesStripePayment(payment, identifiers) {
  if (String(payment?.provider || "").toLowerCase() !== "stripe") {
    return false;
  }

  const { chargeId, paymentIntentId, invoiceId, sessionId } = identifiers;

  return Boolean(
    (chargeId && payment.stripe_charge_id === chargeId) ||
      (paymentIntentId && payment.stripe_payment_intent_id === paymentIntentId) ||
      (invoiceId && payment.stripe_invoice_id === invoiceId) ||
      (sessionId && payment.stripe_session_id === sessionId),
  );
}

/**
 * Links a Stripe charge to the payment we already recorded so the fee
 * reconciliation step knows which balance transaction to read.
 */
export function applyStripeChargeIdentifiers(current, charge) {
  const identifiers = {
    chargeId: charge?.id || null,
    paymentIntentId: getObjectId(charge?.payment_intent),
    invoiceId: getObjectId(charge?.invoice),
    sessionId: null,
  };

  if (!identifiers.chargeId) {
    return current;
  }

  let changed = false;
  const payments = (current.payments || []).map((payment) => {
    if (!matchesStripePayment(payment, identifiers)) {
      return payment;
    }

    if (
      payment.stripe_charge_id === identifiers.chargeId &&
      payment.stripe_payment_intent_id === identifiers.paymentIntentId
    ) {
      return payment;
    }

    changed = true;
    return {
      ...payment,
      stripe_charge_id: identifiers.chargeId,
      stripe_payment_intent_id:
        identifiers.paymentIntentId || payment.stripe_payment_intent_id || null,
      stripe_invoice_id: payment.stripe_invoice_id || identifiers.invoiceId || null,
    };
  });

  return changed ? { ...current, payments } : current;
}

/**
 * Stores the real processor fee for one payment. `fees` comes from
 * fetchStripePaymentFees() and is always expressed in the settlement currency.
 */
export function applyStripePaymentFees(current, paymentId, fees) {
  if (!paymentId || !fees || !Number.isFinite(Number(fees.net))) {
    return current;
  }

  let changed = false;
  const payments = (current.payments || []).map((payment) => {
    if (payment.id !== paymentId) {
      return payment;
    }

    changed = true;
    return {
      ...payment,
      stripe_charge_id: fees.charge_id || payment.stripe_charge_id || null,
      stripe_balance_transaction_id: fees.balance_transaction_id || null,
      stripe_fee: Number(fees.fee),
      stripe_net: Number(fees.net),
      stripe_settlement_currency: fees.settlement_currency || "USD",
      stripe_fee_available_on: fees.available_on || null,
      stripe_fee_source: fees.source || "stripe_balance_transaction",
      stripe_fee_reconciled_at: fees.reconciled_at || new Date().toISOString(),
    };
  });

  return changed ? { ...current, payments } : current;
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
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.completed":
      next = syncConfirmedCheckout(next, event.data?.object || {}, createId);
      break;
    case "invoice.paid":
      next = applyInvoicePaid(next, event.data?.object || {}, createId);
      break;
    case "charge.succeeded":
    case "charge.updated":
    case "charge.refunded":
      next = applyStripeChargeIdentifiers(next, event.data?.object || {});
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
