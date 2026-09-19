const DAY = 86_400_000;
export const timestamp = (value) => (value ? Date.parse(value) : NaN);
const iso = (value) => new Date(value).toISOString();
const dateKey = (value) => iso(value).slice(0, 10);
const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const rate = (numerator, denominator) =>
  denominator ? round((numerator / denominator) * 100) : null;
export const inWindow = (value, window) => {
  const time = timestamp(value);
  return (
    time >= timestamp(window.start) && time < timestamp(window.endExclusive)
  );
};

function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || ""))
    throw new RangeError("Choose valid start and end dates.");
  const time = timestamp(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(time) || dateKey(time) !== value)
    throw new RangeError("Choose valid start and end dates.");
  return time;
}

// Every range uses UTC and half-open bounds. A partial day is compared with
// exactly the same elapsed duration, never a complete previous day/month.
export function resolveOwnerPeriod(options = {}, now = new Date(), dates = []) {
  const range = options.range || "all";
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  let start;
  let end = now.getTime() + 1;
  if (range === "7d" || range === "30d")
    start = today - (range === "7d" ? 6 : 29) * DAY;
  else if (range === "6m" || range === "12m")
    start = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() - (range === "6m" ? 5 : 11),
      1,
    );
  else if (range === "month")
    start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  else if (range === "custom") {
    start = parseDay(options.start);
    const requestedEnd = parseDay(options.end) + DAY;
    if (requestedEnd <= start)
      throw new RangeError("End date must be on or after start date.");
    end = Math.min(requestedEnd, end);
  } else if (range === "all") {
    const validDates = dates
      .map(timestamp)
      .filter((time) => Number.isFinite(time) && time <= now.getTime());
    start = validDates.length
      ? validDates.reduce((min, time) => Math.min(min, time), validDates[0])
      : today;
    start = Math.floor(start / DAY) * DAY;
  } else throw new RangeError("Unknown reporting period.");
  if (start >= end) throw new RangeError("Start date cannot be in the future.");
  return {
    range,
    start: iso(start),
    endExclusive: iso(end),
    timeZone: "UTC",
    previous:
      range === "all"
        ? null
        : { start: iso(start - (end - start)), endExclusive: iso(start) },
  };
}

export function revenueHistory(payments, period, amountOf) {
  const days = Math.ceil(
    (timestamp(period.endExclusive) - timestamp(period.start)) / DAY,
  );
  const daily = days <= 31;
  const buckets = new Map();
  const cursor = new Date(period.start);
  if (!daily) cursor.setUTCDate(1);
  while (cursor.getTime() < timestamp(period.endExclusive)) {
    const key = cursor.toISOString().slice(0, daily ? 10 : 7);
    buckets.set(key, {
      key,
      label: new Intl.DateTimeFormat("en-US", {
        timeZone: "UTC",
        month: "short",
        ...(daily ? { day: "numeric" } : { year: "2-digit" }),
      }).format(cursor),
      stripe: 0,
      apple: 0,
      total: 0,
      transactions: 0,
    });
    if (daily) cursor.setUTCDate(cursor.getUTCDate() + 1);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const payment of payments) {
    const date = payment.payment_date || payment.created_at;
    if (!inWindow(date, period)) continue;
    const bucket = buckets.get(
      new Date(date).toISOString().slice(0, daily ? 10 : 7),
    );
    if (!bucket) continue;
    const provider = String(
      payment.provider || payment.metadata?.provider || "",
    ).toLowerCase();
    bucket[provider === "stripe" ? "stripe" : "apple"] += amountOf(payment);
    bucket.transactions += 1;
  }
  return [...buckets.values()].map((bucket) => ({
    ...bucket,
    stripe: round(bucket.stripe),
    apple: round(bucket.apple),
    total: round(bucket.stripe + bucket.apple),
  }));
}

export const subscriptionPlan = (payment) =>
  payment.plan || payment.metadata?.plan;
export function isSubscriptionPayment(payment) {
  return (
    ["premium_monthly", "premium_yearly"].includes(subscriptionPlan(payment)) &&
    payment.metadata?.payment_type !== "store_purchase"
  );
}

function paidThrough(payment) {
  const explicit = timestamp(
    payment.metadata?.expiration_at || payment.metadata?.current_period_end,
  );
  if (Number.isFinite(explicit)) return { end: explicit, inferred: false };
  const start = timestamp(payment.payment_date || payment.created_at);
  if (!Number.isFinite(start)) return null;
  const date = new Date(start);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(
    date.getUTCMonth() +
      (subscriptionPlan(payment) === "premium_yearly" ? 12 : 1),
  );
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return { end: date.getTime(), inferred: true };
}

export function buildBusinessDetail({
  users,
  productionPayments,
  allPayments,
  lifecycles,
  period,
  now,
  attempts = [],
  exams = [],
  amountOf,
}) {
  const nowMs = now.getTime();
  const byUser = new Map();
  const memberIds = new Set(users.map((user) => user.id));
  for (const payment of productionPayments.filter(
    (payment) =>
      memberIds.has(payment.user_id) && isSubscriptionPayment(payment),
  )) {
    const rows = byUser.get(payment.user_id) || [];
    rows.push(payment);
    byUser.set(payment.user_id, rows);
  }
  for (const rows of byUser.values())
    rows.sort(
      (a, b) =>
        timestamp(a.payment_date || a.created_at) -
        timestamp(b.payment_date || b.created_at),
    );
  const latestTrials = new Map();
  for (const payment of allPayments) {
    if (
      payment.status !== "trial" &&
      String(payment.metadata?.period_type || "").toUpperCase() !== "TRIAL"
    )
      continue;
    const time = timestamp(payment.payment_date || payment.created_at);
    if (!Number.isFinite(time) || time > nowMs) continue;
    const previous = latestTrials.get(payment.user_id);
    if (
      !previous ||
      time > timestamp(previous.payment_date || previous.created_at)
    )
      latestTrials.set(payment.user_id, payment);
  }
  const current = [];
  let unverifiedPremium = 0;
  for (const user of users) {
    if (!["premium_monthly", "premium_yearly"].includes(user.plan)) continue;
    const payments = byUser.get(user.id) || [];
    const latest = payments.at(-1);
    const latestTrial = latestTrials.get(user.id);
    const trialEnd =
      latestTrial &&
      (timestamp(latestTrial.metadata?.expiration_at) ||
        timestamp(latestTrial.payment_date || latestTrial.created_at) +
          7 * DAY);
    if (
      latestTrial &&
      trialEnd > nowMs &&
      (!latest ||
        timestamp(latestTrial.payment_date || latestTrial.created_at) >
          timestamp(latest.payment_date || latest.created_at))
    )
      continue;
    const coverage = latest && paidThrough(latest);
    if (
      !latest ||
      subscriptionPlan(latest) !== user.plan ||
      !coverage ||
      coverage.end <= nowMs
    ) {
      unverifiedPremium += 1;
      continue;
    }
    current.push({ user, payment: latest, coverage });
  }
  const subscriptionPayments = [...byUser.values()].flat();
  const firstPayments = [...byUser.values()].map((rows) => rows[0]);
  const periodCount = (rows, window) =>
    rows.filter((row) => inWindow(row.payment_date || row.created_at, window))
      .length;
  const totals = (window) => ({
    gross: round(
      productionPayments
        .filter((row) => inWindow(row.payment_date || row.created_at, window))
        .reduce((sum, row) => sum + amountOf(row), 0),
    ),
    transactions: periodCount(productionPayments, window),
    newPaid: periodCount(firstPayments, window),
    newMembers: users.filter((user) => inWindow(user.created_at, window))
      .length,
  });
  const selected = totals(period);
  const previous = period.previous ? totals(period.previous) : null;
  const comparisons = Object.fromEntries(
    Object.entries(selected).map(([key, value]) => [
      key,
      {
        current: value,
        previous: previous?.[key] ?? null,
        changePercent: previous?.[key]
          ? round(((value - previous[key]) / previous[key]) * 100)
          : null,
      },
    ]),
  );
  const cohorts = new Map();
  for (const lifecycle of lifecycles) {
    if (!inWindow(lifecycle.trial_started_at, period)) continue;
    const key = lifecycle.trial_started_at.slice(0, 7);
    const cohort = cohorts.get(key) || {
      key,
      started: 0,
      eligible: 0,
      converted: 0,
      pending: 0,
    };
    cohort.started += 1;
    if (timestamp(lifecycle.trial_ends_at) <= nowMs) {
      cohort.eligible += 1;
      if (timestamp(lifecycle.converted_at) <= nowMs) cohort.converted += 1;
    } else cohort.pending += 1;
    cohorts.set(key, cohort);
  }
  const trialCohorts = [...cohorts.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((cohort) => ({
      ...cohort,
      conversionRate: rate(cohort.converted, cohort.eligible),
    }));
  const eligibleTrials = trialCohorts.reduce(
    (sum, cohort) => sum + cohort.eligible,
    0,
  );
  const convertedTrials = trialCohorts.reduce(
    (sum, cohort) => sum + cohort.converted,
    0,
  );
  const studyByUser = new Map();
  for (const row of [
    ...attempts,
    ...exams.filter((exam) => exam.status === "completed"),
  ]) {
    const time = timestamp(row.created_at);
    if (!Number.isFinite(time) || time > nowMs) continue;
    const times = studyByUser.get(row.user_id) || [];
    times.push(time);
    studyByUser.set(row.user_id, times);
  }
  let activationEligible = 0;
  let activated = 0;
  let retentionEligible = 0;
  let retained = 0;
  for (const user of users.filter((user) =>
    inWindow(user.created_at, period),
  )) {
    const joined = timestamp(user.created_at);
    const times = studyByUser.get(user.id) || [];
    if (joined + 7 * DAY <= nowMs) {
      activationEligible += 1;
      if (times.some((time) => time >= joined && time < joined + 7 * DAY))
        activated += 1;
    }
    if (joined + 14 * DAY <= nowMs) {
      retentionEligible += 1;
      if (
        times.some(
          (time) => time >= joined + 7 * DAY && time < joined + 14 * DAY,
        )
      )
        retained += 1;
    }
  }
  const renewalPayments = subscriptionPayments.filter((payment) => {
    if (
      String(payment.metadata?.revenuecat_event_type || "").toUpperCase() ===
        "RENEWAL" ||
      payment.metadata?.reason === "subscription_renewal"
    )
      return true;
    const subscriptionId =
      payment.stripe_subscription_id ||
      payment.metadata?.stripe_subscription_id;
    if (!subscriptionId) return false;
    return (byUser.get(payment.user_id) || []).some(
      (earlier) =>
        (earlier.stripe_subscription_id ||
          earlier.metadata?.stripe_subscription_id) === subscriptionId &&
        timestamp(earlier.payment_date || earlier.created_at) <
          timestamp(payment.payment_date || payment.created_at),
    );
  });
  return {
    comparisons,
    current: {
      asOf: now.toISOString(),
      paid: current.length,
      monthly: current.filter((entry) => entry.user.plan === "premium_monthly")
        .length,
      yearly: current.filter((entry) => entry.user.plan === "premium_yearly")
        .length,
      estimatedMrr:
        !current.length && unverifiedPremium
          ? null
          : round(
              current.reduce(
                (sum, entry) =>
                  sum +
                  amountOf(entry.payment) /
                    (entry.user.plan === "premium_yearly" ? 12 : 1),
                0,
              ),
            ),
      inferredPeriods: current.filter((entry) => entry.coverage.inferred)
        .length,
      unverifiedPremium,
      periodsEnding7d: current.filter(
        (entry) => entry.coverage.end <= nowMs + 7 * DAY,
      ).length,
    },
    renewals: periodCount(renewalPayments, period),
    trialConversion: {
      eligible: eligibleTrials,
      converted: convertedTrials,
      rate: rate(convertedTrials, eligibleTrials),
      cohorts: trialCohorts,
    },
    engagement: {
      activation: {
        eligible: activationEligible,
        count: activated,
        rate: rate(activated, activationEligible),
      },
      weekTwo: {
        eligible: retentionEligible,
        count: retained,
        rate: rate(retained, retentionEligible),
      },
    },
  };
}

// RevenueCat's aggregate is a separate cross-check. It must never replace the
// ledger total without also replacing its history, coverage and transactions.
export function attachRevenueCatComparison(metrics, revenueCat) {
  if (!revenueCat?.gross || !revenueCat?.proceeds) return;
  metrics.revenueCatComparison = {
    gross: round(revenueCat.gross.value),
    estimatedProceeds: round(revenueCat.proceeds.value),
    difference: round(revenueCat.gross.value - metrics.money.apple.gross),
    start: metrics.period.start.slice(0, 10),
    end: new Date(timestamp(metrics.period.endExclusive) - 1)
      .toISOString()
      .slice(0, 10),
  };
  metrics.sources.revenueCat = {
    status: "live",
    label:
      "RevenueCat daily report available as a separate cross-check; totals and chart use recorded payments.",
  };
}
