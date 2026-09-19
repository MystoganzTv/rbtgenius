import assert from "node:assert/strict";
import test from "node:test";
import { buildOwnerMetrics } from "../server/lib/owner-metrics.js";
import {
  attachRevenueCatComparison,
  resolveOwnerPeriod,
} from "../server/lib/owner-metrics-detail.js";

const now = new Date("2026-09-19T12:00:00.000Z");
const user = (id, fields = {}) => ({
  id,
  plan: "premium_monthly",
  created_at: "2026-09-01T12:00:00.000Z",
  ...fields,
});
const payment = (id, fields = {}) => ({
  id,
  user_id: id,
  status: "completed",
  provider: "stripe",
  currency: "USD",
  amount: 24,
  plan: "premium_monthly",
  payment_date: "2026-09-15T12:00:00.000Z",
  ...fields,
});
const build = (fields) => buildOwnerMetrics({ now, ...fields });

test("null, empty, undefined and invalid Stripe fee fields stay pending; real zero fees are valid", () => {
  for (const missing of [null, undefined, "", false, "invalid"]) {
    const metrics = build({
      payments: [payment("p", { stripe_fee: missing, stripe_net: missing })],
    });
    assert.equal(metrics.money.stripe.net, null);
    assert.equal(metrics.money.stripe.feeDataStatus, "setup");
    assert.equal(metrics.money.verifiedTakeHome, null);
  }
  const metrics = build({
    payments: [
      payment("p", {
        stripe_fee: 0,
        stripe_net: 24,
        stripe_settlement_currency: "USD",
      }),
    ],
  });
  assert.equal(metrics.money.stripe.feeDataStatus, "live");
  assert.equal(metrics.money.stripe.net, 24);
});

test("current paid members and MRR exclude trials, gifts, expired coverage, admins and one-time purchases", () => {
  const metrics = build({
    users: [
      user("monthly"),
      user("yearly", { plan: "premium_yearly" }),
      user("trial"),
      user("gift"),
      user("expired"),
      user("store"),
      user("admin", { role: "admin" }),
      user("canceled", { plan: "free" }),
    ],
    payments: [
      payment("monthly"),
      payment("yearly", { plan: "premium_yearly", amount: 120 }),
      payment("trial", {
        status: "trial",
        amount: 0,
        provider: "revenuecat",
        metadata: {
          period_type: "TRIAL",
          expiration_at: "2026-09-22T12:00:00.000Z",
        },
      }),
      payment("expired", { payment_date: "2026-07-01T12:00:00.000Z" }),
      payment("store", { metadata: { payment_type: "store_purchase" } }),
      payment("admin"),
      payment("canceled"),
    ],
  });
  assert.equal(metrics.subscriptions.trialing, 1);
  assert.equal(metrics.subscriptions.paid, 2);
  assert.equal(metrics.business.current.estimatedMrr, 34);
  assert.equal(metrics.business.current.monthly, 1);
  assert.equal(metrics.business.current.yearly, 1);
  assert.equal(metrics.business.current.unverifiedPremium, 3);
  assert.equal(metrics.customers.total, 7);
  assert.equal(metrics.business.comparisons.newPaid.current, 4);
});

test("UTC custom bounds include the entire end day, exclude future rows and compare equal elapsed time", () => {
  const metrics = build({
    options: { range: "custom", start: "2026-09-10", end: "2026-09-11" },
    payments: [
      payment("start", {
        payment_date: "2026-09-10T00:00:00.000Z",
        amount: 10,
      }),
      payment("end", { payment_date: "2026-09-11T23:59:59.999Z", amount: 20 }),
      payment("outside", { payment_date: "2026-09-12T00:00:00.000Z" }),
      payment("previous", {
        payment_date: "2026-09-08T00:00:00.000Z",
        amount: 15,
      }),
      payment("future", { payment_date: "2026-09-20T00:00:00.000Z" }),
    ],
  });
  assert.equal(metrics.money.customerGross, 30);
  assert.equal(metrics.money.transactions, 2);
  assert.equal(metrics.business.comparisons.gross.previous, 15);
  assert.equal(metrics.business.comparisons.gross.changePercent, 100);
  assert.equal(
    metrics.history.reduce((sum, row) => sum + row.total, 0),
    30,
  );
  assert.equal(
    metrics.transactions.rows.reduce((sum, row) => sum + row.gross, 0),
    30,
  );
  assert.equal(metrics.period.previous.start, "2026-09-08T00:00:00.000Z");
  const partial = resolveOwnerPeriod({ range: "month" }, now);
  assert.equal(
    Date.parse(partial.endExclusive) - Date.parse(partial.start),
    Date.parse(partial.previous.endExclusive) -
      Date.parse(partial.previous.start),
  );
});

test("invalid dates, reversed ranges and future starts are rejected; leap days are supported", () => {
  for (const options of [
    { range: "bad" },
    { range: "custom", start: "2026-02-30", end: "2026-03-01" },
    { range: "custom", start: "2026-09-12", end: "2026-09-10" },
    { range: "custom", start: "2027-01-01", end: "2027-01-02" },
  ]) {
    assert.throws(() => resolveOwnerPeriod(options, now), RangeError);
  }
  assert.equal(
    resolveOwnerPeriod(
      { range: "custom", start: "2024-02-29", end: "2024-02-29" },
      now,
    ).start,
    "2024-02-29T00:00:00.000Z",
  );
});

test("zero comparison baselines and empty eligible cohorts return null instead of misleading percentages", () => {
  const metrics = build({ options: { range: "7d" }, payments: [payment("p")] });
  assert.equal(metrics.business.comparisons.gross.changePercent, null);
  assert.equal(metrics.business.trialConversion.rate, null);
  assert.equal(metrics.business.engagement.activation.rate, null);
  assert.equal(metrics.business.engagement.weekTwo.rate, null);
  assert.equal(build({}).money.customerGross, 0);
});

test("unknown non-USD gross is excluded; explicit converted USD and partial fees retain coverage", () => {
  const metrics = build({
    payments: [
      payment("eur", { currency: "EUR" }),
      payment("converted", {
        currency: "EUR",
        provider: "revenuecat",
        metadata: { usd_price: 30 },
      }),
      payment("usd", { stripe_fee: 1, stripe_net: 23 }),
      payment("pending", { stripe_fee: null, stripe_net: null }),
      payment("invalid-date", { payment_date: "bad" }),
    ],
  });
  assert.equal(metrics.money.customerGross, 78);
  assert.equal(metrics.quality.excludedPayments, 2);
  assert.equal(metrics.money.stripe.netCoverage, 1);
  assert.equal(metrics.money.stripe.uncoveredGross, 24);
  assert.equal(metrics.money.stripe.feeDataStatus, "partial");
});

test("RevenueCat aggregate is a cross-check and cannot change ledger totals, series or verification", () => {
  const metrics = build({
    payments: [payment("ios", { provider: "revenuecat" })],
  });
  const before = structuredClone({
    money: metrics.money,
    history: metrics.history,
    transactions: metrics.transactions,
  });
  attachRevenueCatComparison(metrics, {
    gross: { value: 200 },
    proceeds: { value: 170 },
  });
  assert.deepEqual(
    {
      money: metrics.money,
      history: metrics.history,
      transactions: metrics.transactions,
    },
    before,
  );
  assert.equal(metrics.revenueCatComparison.difference, 176);
});

test("trial cohorts exclude pending trials from denominator and track conversions after the selected period", () => {
  const metrics = build({
    options: { range: "custom", start: "2026-09-01", end: "2026-09-18" },
    users: [
      user("converted"),
      user("ended", { plan: "free" }),
      user("pending"),
    ],
    payments: [
      ...["converted", "ended"].map((id) =>
        payment(id, {
          provider: "revenuecat",
          status: "trial",
          amount: 0,
          payment_date: "2026-09-01T12:00:00.000Z",
          metadata: {
            period_type: "TRIAL",
            expiration_at: "2026-09-08T12:00:00.000Z",
          },
        }),
      ),
      payment("pending", {
        provider: "revenuecat",
        status: "trial",
        amount: 0,
        metadata: {
          period_type: "TRIAL",
          expiration_at: "2026-09-22T12:00:00.000Z",
        },
      }),
      payment("converted", {
        provider: "revenuecat",
        payment_date: "2026-09-19T10:00:00.000Z",
      }),
    ],
  });
  assert.equal(metrics.business.trialConversion.eligible, 2);
  assert.equal(metrics.business.trialConversion.converted, 1);
  assert.equal(metrics.business.trialConversion.rate, 50);
  assert.equal(metrics.business.trialConversion.cohorts[0].pending, 1);
});

test("activation and week-two retention use mature signup cohorts and actual study, not logins", () => {
  const metrics = build({
    options: { range: "30d" },
    users: [
      user("study"),
      user("login", { last_login: now.toISOString() }),
      user("recent", { created_at: "2026-09-18T12:00:00.000Z" }),
      user("old", { created_at: "2026-01-01T12:00:00.000Z" }),
    ],
    attempts: [
      { user_id: "study", created_at: "2026-09-02T12:00:00.000Z" },
      { user_id: "study", created_at: "2026-09-08T12:00:00.000Z" },
      { user_id: "recent", created_at: "2026-09-18T15:00:00.000Z" },
    ],
    exams: [
      {
        user_id: "login",
        created_at: "2026-09-02T12:00:00.000Z",
        status: "in_progress",
      },
    ],
  });
  assert.deepEqual(metrics.business.engagement.activation, {
    eligible: 2,
    count: 1,
    rate: 50,
  });
  assert.deepEqual(metrics.business.engagement.weekTwo, {
    eligible: 2,
    count: 1,
    rate: 50,
  });
});

test("first-time subscribers are not counted again when they renew; paid period end clamps month boundaries", () => {
  const metrics = build({
    options: { range: "month" },
    users: [user("renewed")],
    payments: [
      payment("first", {
        user_id: "renewed",
        stripe_subscription_id: "sub-1",
        payment_date: "2026-08-15T12:00:00.000Z",
      }),
      payment("second", {
        user_id: "renewed",
        stripe_subscription_id: "sub-1",
      }),
    ],
  });
  assert.equal(metrics.business.comparisons.newPaid.current, 0);
  assert.equal(metrics.business.renewals, 1);
  const expired = buildOwnerMetrics({
    now: new Date("2026-03-01T12:00:00.000Z"),
    users: [user("jan")],
    payments: [payment("jan", { payment_date: "2026-01-31T12:00:00.000Z" })],
  });
  assert.equal(expired.business.current.paid, 0);
});

test("transaction pagination is bounded and stable without changing totals", () => {
  const payments = Array.from({ length: 30 }, (_, index) =>
    payment(`p-${index}`, {
      payment_date: new Date(Date.UTC(2026, 8, 1, 0, index)).toISOString(),
    }),
  );
  const metrics = build({ payments, options: { page: 999 } });
  assert.equal(metrics.transactions.page, 2);
  assert.equal(metrics.transactions.rows.length, 5);
  assert.equal(metrics.money.customerGross, 720);
  assert.equal(metrics.transactions.rows[0].id, "p-4");
});

test("missing normalized Stripe fee data is queued for reconciliation instead of remaining pending forever", async () => {
  const { paymentNeedsFeeReconciliation } = await import(
    "../server/lib/billing.js"
  );
  assert.equal(
    paymentNeedsFeeReconciliation(
      payment("p", { stripe_net: null, stripe_fee: null }),
    ),
    true,
  );
  assert.equal(
    paymentNeedsFeeReconciliation(
      payment("p", { stripe_net: 23, stripe_fee: null }),
    ),
    true,
  );
  assert.equal(
    paymentNeedsFeeReconciliation(
      payment("p", { stripe_net: 24, stripe_fee: 0 }),
    ),
    false,
  );
});

test("sandbox trial metadata cannot hide a real paying subscriber or add revenue", () => {
  const metrics = build({
    users: [user("member")],
    payments: [
      payment("paid", { user_id: "member" }),
      payment("sandbox", {
        user_id: "member",
        status: "sandbox",
        payment_date: "2026-09-18T12:00:00.000Z",
        metadata: {
          period_type: "TRIAL",
          expiration_at: "2026-09-25T12:00:00.000Z",
        },
      }),
      payment("legacy-trial", {
        user_id: "other",
        status: "completed",
        metadata: { period_type: "TRIAL" },
      }),
    ],
  });
  assert.equal(metrics.subscriptions.paid, 1);
  assert.equal(metrics.money.customerGross, 24);
});
