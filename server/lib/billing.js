import Stripe from "stripe";
import {
  PLAN_IDS,
  PLAN_LABELS,
  isPremiumPlan,
  normalizePlan,
} from "../../shared/plan-access.js";
import { getStoreProductById, isStoreProductAvailable } from "../../src/lib/store-catalog.js";

const STRIPE_PRICE_ENV = {
  [PLAN_IDS.PREMIUM_MONTHLY]: "STRIPE_PRICE_PREMIUM_MONTHLY",
  [PLAN_IDS.PREMIUM_YEARLY]: "STRIPE_PRICE_PREMIUM_YEARLY",
};

const PLAN_AMOUNTS = {
  [PLAN_IDS.PREMIUM_MONTHLY]: 1999,
  [PLAN_IDS.PREMIUM_YEARLY]: 9999,
};

let stripeClient = null;

export function getStripeClient() {
  if (stripeClient) {
    return stripeClient;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeClient;
}

export function getPlanPriceId(plan) {
  const normalizedPlan = normalizePlan(plan);
  const envKey = STRIPE_PRICE_ENV[normalizedPlan];
  return envKey ? process.env[envKey] || null : null;
}

export function resolvePlanFromPriceId(priceId) {
  if (!priceId) return PLAN_IDS.FREE;
  const matchedPlan = Object.keys(STRIPE_PRICE_ENV).find(
    (plan) => getPlanPriceId(plan) === priceId,
  );

  return normalizePlan(matchedPlan || PLAN_IDS.FREE);
}

export function resolvePlanFromStripeData(metadata = null, priceId = null) {
  const metadataPlan = normalizePlan(metadata?.plan);
  if (isPremiumPlan(metadataPlan)) {
    return metadataPlan;
  }

  return resolvePlanFromPriceId(priceId);
}

export function getBillingConfig(user = null) {
  const stripe = getStripeClient();
  const hasStripeCustomer = Boolean(user?.stripe_customer_id);

  return {
    stripe_enabled: Boolean(stripe),
    checkout_enabled: {
      [PLAN_IDS.PREMIUM_MONTHLY]: Boolean(stripe && getPlanPriceId(PLAN_IDS.PREMIUM_MONTHLY)),
      [PLAN_IDS.PREMIUM_YEARLY]: Boolean(stripe && getPlanPriceId(PLAN_IDS.PREMIUM_YEARLY)),
    },
    portal_enabled: user ? Boolean(stripe && hasStripeCustomer) : Boolean(stripe),
  };
}

function formatStripeSubscriptionSummary(subscription) {
  if (!subscription) {
    return null;
  }

  return {
    id: subscription.id,
    status: subscription.status || null,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_end: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    cancel_at: subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000).toISOString()
      : null,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };
}

function pickBestSubscription(subscriptions = []) {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return null;
  }

  const unique = subscriptions.filter(Boolean).reduce((accumulator, subscription) => {
    if (!accumulator.find((entry) => entry.id === subscription.id)) {
      accumulator.push(subscription);
    }
    return accumulator;
  }, []);

  const cancellationScheduled = unique.find((subscription) => subscription?.cancel_at_period_end);
  if (cancellationScheduled) {
    return cancellationScheduled;
  }

  const preferredStatuses = ['active', 'trialing', 'past_due', 'unpaid', 'canceled', 'incomplete'];
  for (const status of preferredStatuses) {
    const match = unique.find((subscription) => subscription?.status === status);
    if (match) {
      return match;
    }
  }

  return unique[0] || null;
}

export async function getStripeSubscriptionSummary(user = null) {
  if (!user?.stripe_subscription_id && !user?.stripe_customer_id) {
    return null;
  }

  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

  const candidates = [];

  if (user?.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
      if (subscription) {
        candidates.push(subscription);
      }
    } catch (error) {
      console.warn('[billing] Unable to retrieve Stripe subscription by id:', error?.message || error);
    }
  }

  if (user?.stripe_customer_id) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'all',
        limit: 10,
      });
      candidates.push(...(subscriptions?.data || []));
    } catch (error) {
      console.warn('[billing] Unable to list Stripe subscriptions by customer:', error?.message || error);
    }
  }

  return formatStripeSubscriptionSummary(pickBestSubscription(candidates));
}

function ensureStripeReady(plan) {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new Error("Stripe is not configured yet.");
  }

  if (plan && !getPlanPriceId(plan)) {
    throw new Error(`Stripe price is missing for ${PLAN_LABELS[plan] || plan}.`);
  }

  return stripe;
}

function getWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function isStripeWebhookConfigured() {
  return Boolean(getStripeClient() && getWebhookSecret());
}

export function constructStripeWebhookEvent(payload, signature) {
  const stripe = ensureStripeReady();
  const secret = getWebhookSecret();

  if (!secret) {
    throw new Error("Stripe webhook secret is not configured yet.");
  }

  if (!signature) {
    throw new Error("Stripe signature header is missing.");
  }

  return stripe.webhooks.constructEvent(payload, signature, secret);
}

export function buildAbsoluteUrl(origin, pathname, params = {}) {
  const url = new URL(pathname, origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  // Stripe requires this exact literal token in success_url to substitute the session ID.
  return url.toString().replaceAll("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");
}

export function buildReturnUrl(baseUrl, params = {}) {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  // Stripe requires this exact literal token in success_url to substitute the session ID.
  return url.toString().replaceAll("%7BCHECKOUT_SESSION_ID%7D", "{CHECKOUT_SESSION_ID}");
}

export async function createStripeCheckoutSession({
  plan,
  user,
  origin,
  successPath = "/profile",
  cancelPath = "/pricing",
  successUrl = null,
  cancelUrl = null,
}) {
  const normalizedPlan = normalizePlan(plan);
  if (!isPremiumPlan(normalizedPlan)) {
    throw new Error("Only premium plans can use checkout.");
  }

  const stripe = ensureStripeReady(normalizedPlan);
  const lineItem =
    normalizedPlan === PLAN_IDS.PREMIUM_YEARLY
      ? {
          price_data: {
            currency: "usd",
            unit_amount: PLAN_AMOUNTS[PLAN_IDS.PREMIUM_YEARLY],
            recurring: {
              interval: "year",
              interval_count: 1,
            },
            product_data: {
              name: "RBTGenius Pro Annual",
              description: "Annual access to the complete RBT exam prep study system.",
            },
          },
          quantity: 1,
        }
      : {
          price: getPlanPriceId(normalizedPlan),
          quantity: 1,
        };
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    success_url: successUrl
      ? buildReturnUrl(successUrl, {
          checkout: "success",
          session_id: "{CHECKOUT_SESSION_ID}",
        })
      : buildAbsoluteUrl(origin, successPath, {
          checkout: "success",
          session_id: "{CHECKOUT_SESSION_ID}",
        }),
    cancel_url: cancelUrl
      ? buildReturnUrl(cancelUrl, {
          checkout: "cancelled",
        })
      : buildAbsoluteUrl(origin, cancelPath, {
          checkout: "cancelled",
        }),
    client_reference_id: user.id,
    line_items: [lineItem],
    allow_promotion_codes: true,
    metadata: {
      user_id: user.id,
      plan: normalizedPlan,
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        plan: normalizedPlan,
      },
    },
    ...(user.stripe_customer_id
      ? { customer: user.stripe_customer_id }
      : { customer_email: user.email }),
  });

  return {
    id: session.id,
    url: session.url,
  };
}

function resolveCheckoutPlan(session) {
  const fromMetadata = normalizePlan(session?.metadata?.plan);
  if (isPremiumPlan(fromMetadata)) {
    return fromMetadata;
  }

  const matchingEntry = Object.entries(STRIPE_PRICE_ENV).find(
    ([plan]) => getPlanPriceId(plan) === session?.line_items?.data?.[0]?.price?.id,
  );

  return normalizePlan(matchingEntry?.[0] || PLAN_IDS.FREE);
}

export async function confirmStripeCheckoutSession(sessionId) {
  const stripe = ensureStripeReady();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.mode !== "subscription") {
    throw new Error("This checkout session is not a subscription checkout.");
  }

  if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) {
    throw new Error("This checkout session has not completed yet.");
  }

  const normalizedPlan = resolveCheckoutPlan(session);
  if (!isPremiumPlan(normalizedPlan)) {
    throw new Error("Unable to determine the premium plan for this checkout.");
  }

  return {
    invoice_id: typeof session.invoice === "string" ? session.invoice : session.invoice?.id || null,
    payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
    session_id: session.id,
    plan: normalizedPlan,
    status: session.status,
    payment_status: session.payment_status,
    amount_total: session.amount_total ?? PLAN_AMOUNTS[normalizedPlan],
    currency: session.currency || "usd",
    customer_id:
      typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    subscription_id:
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null,
    customer_email: session.customer_details?.email || session.customer_email || null,
    client_reference_id: session.client_reference_id || null,
    completed_at: new Date(
      (session.created || Math.floor(Date.now() / 1000)) * 1000,
    ).toISOString(),
  };
}

export async function createStripePortalSession({
  customerId,
  origin,
  returnPath = "/profile?billing=return",
  returnUrl = null,
}) {
  if (!customerId) {
    throw new Error("No Stripe customer is linked to this account yet.");
  }

  const stripe = ensureStripeReady();
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || buildAbsoluteUrl(origin, returnPath),
  });

  return {
    url: portal.url,
  };
}


export async function createStripeStoreCheckoutSession({
  productId,
  user = null,
  origin,
  successPath = "/store",
  cancelPath = "/store",
  successUrl = null,
  cancelUrl = null,
}) {
  const product = getStoreProductById(productId);
  if (!product) {
    throw new Error("Store product not found.");
  }

  if (!isStoreProductAvailable(product)) {
    throw new Error("This product is currently out of stock. We will reopen checkout after restock.");
  }

  const stripe = ensureStripeReady();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: successUrl
      ? buildReturnUrl(successUrl, {
          store: "success",
          session_id: "{CHECKOUT_SESSION_ID}",
        })
      : buildAbsoluteUrl(origin, successPath, {
          store: "success",
          session_id: "{CHECKOUT_SESSION_ID}",
        }),
    cancel_url: cancelUrl
      ? buildReturnUrl(cancelUrl, { store: "cancelled" })
      : buildAbsoluteUrl(origin, cancelPath, { store: "cancelled" }),
    client_reference_id: user?.id || undefined,
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    shipping_address_collection: { allowed_countries: ["US"] },
    allow_promotion_codes: true,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: product.price_cents,
          product_data: {
            name: product.name,
            description: product.checkout_description || product.summary,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      payment_type: "store_purchase",
      product_id: product.id,
      product_name: product.name,
      product_category: product.category,
      product_format: product.format,
      user_id: user?.id || "",
      user_email: user?.email || "",
    },
    ...(user?.stripe_customer_id
      ? { customer: user.stripe_customer_id }
      : user?.email
      ? { customer_email: user.email }
      : {}),
  });

  return {
    id: session.id,
    url: session.url,
  };
}

export async function confirmStripeStoreCheckoutSession(sessionId) {
  const stripe = ensureStripeReady();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "payment") {
    throw new Error("This checkout session is not a store purchase.");
  }

  if (session.status !== "complete" || !["paid", "no_payment_required"].includes(session.payment_status)) {
    throw new Error("This checkout session has not completed yet.");
  }

  if (session.metadata?.payment_type !== "store_purchase") {
    throw new Error("This checkout session is not a store order.");
  }

  return {
    invoice_id: typeof session.invoice === "string" ? session.invoice : session.invoice?.id || null,
    payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
    session_id: session.id,
    status: session.status,
    payment_status: session.payment_status,
    amount_total: session.amount_total ?? 0,
    currency: session.currency || "usd",
    customer_id:
      typeof session.customer === "string" ? session.customer : session.customer?.id || null,
    customer_email: session.customer_details?.email || session.customer_email || null,
    client_reference_id: session.client_reference_id || null,
    metadata: session.metadata || {},
    completed_at: new Date(
      (session.created || Math.floor(Date.now() / 1000)) * 1000,
    ).toISOString(),
  };
}

function centsToAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  return Number((number / 100).toFixed(2));
}

function firstDefined(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "") || null;
}

async function retrieveWithOptionalExpand(retrieve, id, expand) {
  try {
    return await retrieve(id, { expand });
  } catch (error) {
    if (error?.type === "StripeInvalidRequestError") {
      try {
        return await retrieve(id);
      } catch {
        return null;
      }
    }

    return null;
  }
}

async function resolveChargeIdFromPaymentIntent(stripe, paymentIntentId) {
  if (!paymentIntentId) {
    return null;
  }

  const intent = await retrieveWithOptionalExpand(
    (id, options) => stripe.paymentIntents.retrieve(id, options),
    paymentIntentId,
    ["latest_charge"],
  );

  return getObjectId(intent?.latest_charge) || getObjectId(intent?.charges?.data?.[0]) || null;
}

async function resolveChargeIdFromInvoice(stripe, invoiceId) {
  if (!invoiceId) {
    return null;
  }

  const invoice = await retrieveWithOptionalExpand(
    (id, options) => stripe.invoices.retrieve(id, options),
    invoiceId,
    ["payments.data.payment.payment_intent"],
  );

  if (!invoice) {
    return null;
  }

  const directCharge = getObjectId(invoice.charge);
  if (directCharge) {
    return directCharge;
  }

  const payments = invoice.payments?.data || [];
  for (const entry of payments) {
    const payment = entry?.payment || entry;
    const chargeId = getObjectId(payment?.charge);
    if (chargeId) {
      return chargeId;
    }

    const intent = payment?.payment_intent;
    const resolved =
      getObjectId(intent?.latest_charge) ||
      (await resolveChargeIdFromPaymentIntent(stripe, getObjectId(intent)));
    if (resolved) {
      return resolved;
    }
  }

  return resolveChargeIdFromPaymentIntent(stripe, getObjectId(invoice.payment_intent));
}

async function resolveChargeIdFromSession(stripe, sessionId) {
  if (!sessionId) {
    return null;
  }

  const session = await retrieveWithOptionalExpand(
    (id, options) => stripe.checkout.sessions.retrieve(id, options),
    sessionId,
    ["payment_intent"],
  );

  if (!session) {
    return null;
  }

  const intent = session.payment_intent;
  return (
    getObjectId(intent?.latest_charge) ||
    (await resolveChargeIdFromPaymentIntent(stripe, getObjectId(intent))) ||
    (await resolveChargeIdFromInvoice(stripe, getObjectId(session.invoice)))
  );
}

/**
 * Resolves the real Stripe processing fee for one recorded payment.
 * Returns null when Stripe is not configured, when the charge cannot be
 * resolved, or when the balance transaction is not available yet.
 */
export async function fetchStripePaymentFees({
  chargeId = null,
  paymentIntentId = null,
  invoiceId = null,
  sessionId = null,
} = {}) {
  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

  const resolvedChargeId =
    chargeId ||
    (await resolveChargeIdFromPaymentIntent(stripe, paymentIntentId)) ||
    (await resolveChargeIdFromInvoice(stripe, invoiceId)) ||
    (await resolveChargeIdFromSession(stripe, sessionId));

  if (!resolvedChargeId) {
    return null;
  }

  const charge = await retrieveWithOptionalExpand(
    (id, options) => stripe.charges.retrieve(id, options),
    resolvedChargeId,
    ["balance_transaction"],
  );

  if (!charge) {
    return null;
  }

  let balanceTransaction = charge.balance_transaction;
  if (typeof balanceTransaction === "string") {
    try {
      balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransaction);
    } catch {
      balanceTransaction = null;
    }
  }

  if (!balanceTransaction) {
    return null;
  }

  const fee = centsToAmount(balanceTransaction.fee);
  const net = centsToAmount(balanceTransaction.net);
  if (fee === null || net === null) {
    return null;
  }

  return {
    charge_id: charge.id,
    balance_transaction_id: balanceTransaction.id,
    fee,
    net,
    gross: centsToAmount(balanceTransaction.amount),
    refunded: centsToAmount(charge.amount_refunded) || 0,
    settlement_currency: normalizeCurrency(balanceTransaction.currency),
    available_on: balanceTransaction.available_on
      ? new Date(balanceTransaction.available_on * 1000).toISOString()
      : null,
    reconciled_at: new Date().toISOString(),
    source: "stripe_balance_transaction",
  };
}

export function paymentNeedsFeeReconciliation(payment) {
  if (!payment) {
    return false;
  }

  const provider = String(payment.provider || payment.metadata?.provider || "").toLowerCase();
  if (provider !== "stripe") {
    return false;
  }

  if (payment.status !== "completed") {
    return false;
  }

  return [payment.stripe_net, payment.stripe_fee].some(
    value => value === null || value === undefined || value === '' ||
      typeof value === 'boolean' || !Number.isFinite(Number(value)),
  );
}

export function stripeFeeLookupKeys(payment) {
  return {
    chargeId: firstDefined(payment?.stripe_charge_id),
    paymentIntentId: firstDefined(payment?.stripe_payment_intent_id),
    invoiceId: firstDefined(payment?.stripe_invoice_id),
    sessionId: firstDefined(payment?.stripe_session_id),
  };
}
