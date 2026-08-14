import { deriveSubscriptionLifecycle } from './member-analytics.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function roundMoney(value) {
  return Number(asNumber(value).toFixed(2));
}

function paymentDate(payment) {
  return payment?.payment_date || payment?.created_at || null;
}

function isCompletedProductionPayment(payment) {
  const environment = String(payment?.metadata?.environment || 'PRODUCTION').toUpperCase();
  return payment?.status === 'completed' && environment !== 'SANDBOX';
}

function paymentProvider(payment) {
  return String(payment?.provider || payment?.metadata?.provider || '').toLowerCase();
}

function paymentGrossUsd(payment) {
  return roundMoney(payment?.metadata?.usd_price ?? payment?.amount ?? 0);
}

function estimatedStoreProceeds(payment) {
  const rawTax = payment?.metadata?.tax_percentage;
  const rawCommission = payment?.metadata?.commission_percentage;
  if (rawTax === null || rawTax === undefined || rawTax === '') return null;
  if (rawCommission === null || rawCommission === undefined || rawCommission === '') return null;
  const tax = Number(rawTax);
  const commission = Number(rawCommission);
  if (!Number.isFinite(tax) || !Number.isFinite(commission)) return null;
  if (tax < 0 || commission < 0 || tax + commission > 1) return null;
  return roundMoney(paymentGrossUsd(payment) * (1 - tax - commission));
}

function monthKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
  }).format(date);
}

function monthLabel(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    year: '2-digit',
  }).format(date);
}

function buildRevenueHistory(payments, now, months = 6) {
  const buckets = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    buckets.push({ key: monthKey(date), label: monthLabel(date), stripe: 0, apple: 0 });
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const payment of payments) {
    const occurredAt = new Date(paymentDate(payment) || 0);
    if (!Number.isFinite(occurredAt.getTime())) continue;
    const bucket = byKey.get(monthKey(occurredAt));
    if (!bucket) continue;
    const provider = paymentProvider(payment);
    const amount = paymentGrossUsd(payment);
    if (provider === 'stripe') bucket.stripe += amount;
    if (provider === 'revenuecat') bucket.apple += amount;
  }

  return buckets.map((bucket) => ({
    ...bucket,
    stripe: roundMoney(bucket.stripe),
    apple: roundMoney(bucket.apple),
    total: roundMoney(bucket.stripe + bucket.apple),
  }));
}

export function buildOwnerMetrics({ users = [], payments = [], now = new Date() }) {
  const productionPayments = payments.filter((payment) => {
    if (!isCompletedProductionPayment(payment)) return false;
    if (!['stripe', 'revenuecat'].includes(paymentProvider(payment))) return false;
    return paymentGrossUsd(payment) > 0;
  });
  const thirtyDaysAgo = now.getTime() - 30 * DAY_MS;
  const recentPayments = productionPayments.filter((payment) => {
    const occurredAt = new Date(paymentDate(payment) || 0).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= thirtyDaysAgo;
  });
  const stripePayments = productionPayments.filter(
    (payment) => paymentProvider(payment) === 'stripe',
  );
  const applePayments = productionPayments.filter(
    (payment) => paymentProvider(payment) === 'revenuecat',
  );
  const appleWithProceeds = applePayments
    .map((payment) => ({ payment, proceeds: estimatedStoreProceeds(payment) }))
    .filter((entry) => entry.proceeds !== null);

  const paymentsByUser = new Map();
  for (const payment of payments) {
    const current = paymentsByUser.get(payment.user_id) || [];
    current.push(payment);
    paymentsByUser.set(payment.user_id, current);
  }
  const lifecycles = users.map((user) =>
    deriveSubscriptionLifecycle(user, paymentsByUser.get(user.id) || [], now),
  );
  const premiumUsers = users.filter((user) => user.plan && user.plan !== 'free');
  const active30 = users.filter((user) => {
    const lastActive = user.last_login || user.token_issued_at || user.created_at;
    const timestamp = new Date(lastActive || 0).getTime();
    return Number.isFinite(timestamp) && timestamp >= thirtyDaysAgo;
  });
  const renewals = productionPayments.filter(
    (payment) =>
      String(payment?.metadata?.revenuecat_event_type || '').toUpperCase() === 'RENEWAL' ||
      payment?.metadata?.reason === 'subscription_renewal',
  ).length;

  const stripeGross = roundMoney(
    stripePayments.reduce((sum, payment) => sum + paymentGrossUsd(payment), 0),
  );
  const appleGross = roundMoney(
    applePayments.reduce((sum, payment) => sum + paymentGrossUsd(payment), 0),
  );
  const appleEstimatedProceeds = roundMoney(
    appleWithProceeds.reduce((sum, entry) => sum + entry.proceeds, 0),
  );

  return {
    generatedAt: now.toISOString(),
    money: {
      customerGross: roundMoney(stripeGross + appleGross),
      customerGross30d: roundMoney(
        recentPayments.reduce((sum, payment) => sum + paymentGrossUsd(payment), 0),
      ),
      transactions: productionPayments.length,
      transactions30d: recentPayments.length,
      stripe: {
        gross: stripeGross,
        transactions: stripePayments.length,
        net: null,
        feeDataStatus: 'setup',
      },
      apple: {
        gross: appleGross,
        transactions: applePayments.length,
        estimatedProceeds: appleEstimatedProceeds,
        proceedsCoverage: appleWithProceeds.length,
        proceedsCoverageTotal: applePayments.length,
        source: appleWithProceeds.length ? 'revenuecat_webhooks' : 'setup',
      },
      verifiedTakeHome: null,
      currency: 'USD',
    },
    customers: {
      total: users.length,
      active30d: active30.length,
      premium: premiumUsers.length,
      free: Math.max(0, users.length - premiumUsers.length),
      paidConversionRate: users.length
        ? Number(((premiumUsers.length / users.length) * 100).toFixed(1))
        : 0,
    },
    subscriptions: {
      trialing: lifecycles.filter((lifecycle) => lifecycle.status === 'trialing').length,
      convertedFromTrial: lifecycles.filter((lifecycle) => lifecycle.status === 'converted').length,
      paid: premiumUsers.length,
      renewals,
      monthly: premiumUsers.filter((user) => user.plan === 'premium_monthly').length,
      yearly: premiumUsers.filter((user) => user.plan === 'premium_yearly').length,
    },
    history: buildRevenueHistory(productionPayments, now),
    sources: {
      database: { status: 'live', label: 'Members, activity and recorded payments' },
      stripe: { status: 'partial', label: 'Gross payments live; processor fees not connected' },
      revenueCat: {
        status: appleWithProceeds.length === applePayments.length && applePayments.length
          ? 'live'
          : 'partial',
        label: appleWithProceeds.length
          ? `${appleWithProceeds.length} of ${applePayments.length} iOS transactions include estimated proceeds`
          : 'Gross purchases live; proceeds API not connected',
      },
      appStore: { status: 'setup', label: 'Final Apple financial payout not connected' },
    },
  };
}
