// RevenueCat server helpers — bridge App Store / RevenueCat purchases into the
// app's plan model. The mobile app calls `Purchases.logIn(user.id)`, so the
// RevenueCat *app_user_id* is always our internal user id.
//
// Two entry points use this:
//   1. POST /api/billing/revenuecat-sync   — app-driven, synchronous check after
//      a purchase/restore (queries the RevenueCat REST API).
//   2. POST /api/billing/revenuecat-webhook — RevenueCat-driven, for renewals,
//      cancellations and expirations over time.
//
// The entitlement identifier in RevenueCat must be exactly `pro` (matches the
// mobile app's `entitlements.active['pro']`).

import { PLAN_IDS } from '../../shared/plan-access.js';

const RC_API_BASE = 'https://api.revenuecat.com/v1';
const RC_API_V2_BASE = 'https://api.revenuecat.com/v2';
const DEFAULT_RC_PROJECT_ID = 'bfdfc79b';
export const RC_ENTITLEMENT_ID = 'pro';

function optionalPercentage(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

// Map a RevenueCat / App Store product identifier to one of our plan ids.
// Robust to store suffixes (e.g. Google base-plan ":p1m") by substring match.
export function resolvePlanFromRevenueCatProduct(productId) {
  const id = String(productId || '').toLowerCase();
  if (!id) return null;
  if (id.includes('year') || id.includes('annual')) return PLAN_IDS.PREMIUM_YEARLY;
  if (id.includes('month')) return PLAN_IDS.PREMIUM_MONTHLY;
  return null;
}

// Store product identifiers are labels, not a reliable source of billing
// duration. The production App Store product was historically named
// `com.rbtgenius.monthly` even though Apple configured it as a one-year
// subscription. RevenueCat includes both timestamps, so prefer the actual
// purchased period and only fall back to the product identifier.
export function resolvePlanFromRevenueCatEvent(event) {
  const purchasedAt = Number(event?.purchased_at_ms);
  const expirationAt = Number(event?.expiration_at_ms);
  const durationMs = expirationAt - purchasedAt;

  if (Number.isFinite(durationMs) && durationMs > 0) {
    const durationDays = durationMs / (24 * 60 * 60 * 1000);
    if (durationDays >= 300) return PLAN_IDS.PREMIUM_YEARLY;
    if (durationDays <= 45) return PLAN_IDS.PREMIUM_MONTHLY;
  }

  return resolvePlanFromRevenueCatProduct(event?.product_id);
}

const PAYMENT_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'NON_RENEWING_PURCHASE',
]);

export function buildRevenueCatPayment(event, userId, plan = null) {
  if (!event || !userId || !PAYMENT_EVENT_TYPES.has(event.type)) return null;

  const amount = Number(
    event.price_in_purchased_currency ?? event.price ?? 0,
  );
  const usdPrice = Number(event.price ?? amount);
  const occurredAtMs = Number(event.purchased_at_ms ?? event.event_timestamp_ms);
  const occurredAt = Number.isFinite(occurredAtMs)
    ? new Date(occurredAtMs).toISOString()
    : new Date().toISOString();
  const transactionId = String(event.transaction_id || event.id || '').trim();
  if (!transactionId) return null;

  const resolvedPlan =
    plan || resolvePlanFromRevenueCatEvent(event) || PLAN_IDS.PREMIUM_MONTHLY;
  const currency = String(event.currency || 'USD').toUpperCase();
  const store = String(event.store || 'UNKNOWN').toUpperCase();
  const isTrial = String(event.period_type || '').toUpperCase() === 'TRIAL';

  return {
    id: `pay_rc_${transactionId}`,
    user_id: userId,
    status:
      event.environment !== 'PRODUCTION'
        ? 'sandbox'
        : isTrial
          ? 'trial'
          : 'completed',
    amount: Number.isFinite(amount) ? amount : 0,
    payment_date: occurredAt,
    created_at: occurredAt,
    plan: resolvedPlan,
    currency,
    provider: 'revenuecat',
    provider_label:
      store === 'APP_STORE' || store === 'MAC_APP_STORE'
        ? 'Apple App Store'
        : store === 'PLAY_STORE'
          ? 'Google Play'
          : 'RevenueCat',
    metadata: {
      plan: resolvedPlan,
      currency,
      usd_price: Number.isFinite(usdPrice) ? usdPrice : null,
      provider: 'revenuecat',
      provider_label:
        store === 'APP_STORE' || store === 'MAC_APP_STORE'
          ? 'Apple App Store'
          : store === 'PLAY_STORE'
            ? 'Google Play'
            : 'RevenueCat',
      revenuecat_event_id: event.id || null,
      revenuecat_event_type: event.type || null,
      revenuecat_app_user_id: event.app_user_id || userId,
      transaction_id: event.transaction_id || null,
      original_transaction_id: event.original_transaction_id || null,
      product_id: event.product_id || null,
      store,
      environment: event.environment || null,
      period_type: event.period_type || null,
      renewal_number: event.renewal_number ?? null,
      country_code: event.country_code || null,
      tax_percentage: optionalPercentage(event.tax_percentage),
      commission_percentage: optionalPercentage(event.commission_percentage),
      purchased_at: Number.isFinite(Number(event.purchased_at_ms))
        ? new Date(Number(event.purchased_at_ms)).toISOString()
        : occurredAt,
      expiration_at: Number.isFinite(Number(event.expiration_at_ms))
        ? new Date(Number(event.expiration_at_ms)).toISOString()
        : null,
      event_timestamp: Number.isFinite(Number(event.event_timestamp_ms))
        ? new Date(Number(event.event_timestamp_ms)).toISOString()
        : null,
    },
  };
}

function isEntitlementActive(entitlement, nowMs = Date.now()) {
  if (!entitlement) return false;
  const expires = entitlement.expires_date;
  if (!expires) return true; // lifetime / non-expiring
  const expiresMs = Date.parse(expires);
  return Number.isFinite(expiresMs) ? expiresMs > nowMs : false;
}

// Given a RevenueCat REST `subscriber` object, return the premium plan id if the
// `pro` entitlement is currently active, otherwise null.
export function derivePlanFromSubscriber(subscriber, nowMs = Date.now()) {
  const ent = subscriber?.entitlements?.[RC_ENTITLEMENT_ID];
  if (!isEntitlementActive(ent, nowMs)) return null;
  return resolvePlanFromRevenueCatProduct(ent.product_identifier) || PLAN_IDS.PREMIUM_MONTHLY;
}

export function isRevenueCatConfigured() {
  return Boolean(process.env.REVENUECAT_SECRET_KEY);
}

export function isRevenueCatMetricsConfigured() {
  return Boolean(
    (process.env.REVENUECAT_V2_SECRET_KEY || process.env.REVENUECAT_SECRET_KEY) &&
    (process.env.REVENUECAT_PROJECT_ID || DEFAULT_RC_PROJECT_ID),
  );
}

async function fetchRevenueCatRevenueMetric({
  startDate,
  endDate,
  revenueType,
  fetchImpl = fetch,
}) {
  const key = process.env.REVENUECAT_V2_SECRET_KEY || process.env.REVENUECAT_SECRET_KEY;
  const projectId = process.env.REVENUECAT_PROJECT_ID || DEFAULT_RC_PROJECT_ID;
  if (!key || !projectId) return null;

  const url = new URL(
    `${RC_API_V2_BASE}/projects/${encodeURIComponent(projectId)}/metrics/revenue`,
  );
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('currency', 'USD');
  url.searchParams.set('revenue_type', revenueType);

  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(
      `RevenueCat metrics API ${response.status}: ${detail.slice(0, 160)}`,
    );
  }

  const payload = await response.json();
  return {
    value: Number(payload?.value || 0),
    currency: String(payload?.currency || 'USD').toUpperCase(),
    startDate: payload?.start_date || startDate,
    endDate: payload?.end_date || endDate,
    revenueType: payload?.revenue_type || revenueType,
  };
}

export async function fetchRevenueCatOwnerRevenue({
  startDate,
  endDate,
  fetchImpl = fetch,
}) {
  if (!isRevenueCatMetricsConfigured()) return null;

  const [gross, proceeds] = await Promise.all([
    fetchRevenueCatRevenueMetric({
      startDate,
      endDate,
      revenueType: 'revenue',
      fetchImpl,
    }),
    fetchRevenueCatRevenueMetric({
      startDate,
      endDate,
      revenueType: 'proceeds',
      fetchImpl,
    }),
  ]);

  return { gross, proceeds };
}

// Query the RevenueCat REST API for a subscriber. Returns the `subscriber`
// object or null. Throws only on configuration errors.
export async function fetchRevenueCatSubscriber(appUserId) {
  const key = process.env.REVENUECAT_SECRET_KEY;
  if (!key) throw new Error('REVENUECAT_SECRET_KEY is not configured');
  if (!appUserId) return null;

  const res = await fetch(`${RC_API_BASE}/subscribers/${encodeURIComponent(appUserId)}`, {
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  });

  if (res.status === 404) return null; // unknown subscriber = no purchases yet
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`RevenueCat API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  return data?.subscriber ?? null;
}

// Verify the Authorization header sent by RevenueCat webhooks. Configure the
// same value in RevenueCat → Project settings → Integrations → Webhooks.
export function verifyWebhookAuth(authorizationHeader) {
  const expected = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!expected) return false; // not configured → reject (fail closed)
  return authorizationHeader === expected || authorizationHeader === `Bearer ${expected}`;
}

// Webhook event types that mean the subscription is (still) active.
const ACTIVE_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'NON_RENEWING_PURCHASE',
]);

// Event types that mean access should end now.
const EXPIRE_EVENT_TYPES = new Set([
  'EXPIRATION',
  'SUBSCRIPTION_PAUSED',
]);

// Decide what a webhook event implies for our plan model.
// Returns { action: 'upgrade'|'downgrade'|'ignore', plan, appUserIds }
export function interpretWebhookEvent(event) {
  if (!event || !event.type) return { action: 'ignore' };

  const appUserIds = [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ].filter((value, index, values) => value && values.indexOf(value) === index);
  const type = event.type;

  // CANCELLATION = auto-renew turned off; user keeps access until expiry → ignore.
  // BILLING_ISSUE = grace period → ignore (don't punish on a transient failure).
  if (ACTIVE_EVENT_TYPES.has(type)) {
    const plan =
      resolvePlanFromRevenueCatEvent(event) || PLAN_IDS.PREMIUM_MONTHLY;
    return { action: 'upgrade', plan, appUserIds };
  }
  if (EXPIRE_EVENT_TYPES.has(type)) {
    return { action: 'downgrade', plan: PLAN_IDS.FREE, appUserIds };
  }
  return { action: 'ignore', appUserIds };
}
