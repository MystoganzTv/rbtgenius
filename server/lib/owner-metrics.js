import { deriveSubscriptionLifecycle } from "./member-analytics.js";
import {
  buildBusinessDetail,
  inWindow,
  resolveOwnerPeriod,
  revenueHistory,
  timestamp,
} from "./owner-metrics-detail.js";

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
  const environment = String(
    payment?.metadata?.environment || "PRODUCTION",
  ).toUpperCase();
  return (
    payment?.status === "completed" &&
    environment !== "SANDBOX" &&
    String(payment?.metadata?.period_type || "").toUpperCase() !== "TRIAL"
  );
}

function paymentProvider(payment) {
  return String(
    payment?.provider || payment?.metadata?.provider || "",
  ).toLowerCase();
}

function paymentGrossUsd(payment) {
  const usd = payment?.metadata?.usd_price;
  if (usd !== null && usd !== undefined && usd !== "") return roundMoney(usd);
  const currency = String(
    payment?.currency || payment?.metadata?.currency || "USD",
  ).toUpperCase();
  return currency === "USD" ? roundMoney(payment?.amount) : 0;
}

function estimatedStoreProceeds(payment) {
  const rawTax = payment?.metadata?.tax_percentage;
  const rawCommission = payment?.metadata?.commission_percentage;
  if (rawTax === null || rawTax === undefined || rawTax === "") return null;
  if (
    rawCommission === null ||
    rawCommission === undefined ||
    rawCommission === ""
  )
    return null;
  const tax = Number(rawTax);
  const commission = Number(rawCommission);
  if (!Number.isFinite(tax) || !Number.isFinite(commission)) return null;
  if (tax < 0 || commission < 0 || tax + commission > 1) return null;
  return roundMoney(paymentGrossUsd(payment) * (1 - tax - commission));
}

function stripeFeeRecord(payment, currency = "USD") {
  if (
    [payment?.stripe_net, payment?.stripe_fee].some(
      (value) =>
        value === null ||
        value === undefined ||
        value === "" ||
        typeof value === "boolean",
    )
  )
    return null;
  const net = Number(payment?.stripe_net);
  const fee = Number(payment?.stripe_fee);
  if (!Number.isFinite(net) || !Number.isFinite(fee)) return null;
  const settlementCurrency = String(
    payment?.stripe_settlement_currency || currency,
  ).toUpperCase();
  // Balance transactions are settled in the account currency. Mixing
  // currencies would silently fake a take-home number, so we do not.
  if (settlementCurrency !== String(currency).toUpperCase()) return null;
  return { net: roundMoney(net), fee: roundMoney(fee) };
}

function summarizeStripeFees(stripePayments, currency = "USD") {
  let fees = 0;
  let net = 0;
  let coveredGross = 0;
  let covered = 0;

  for (const payment of stripePayments) {
    const record = stripeFeeRecord(payment, currency);
    if (!record) continue;
    covered += 1;
    fees += record.fee;
    net += record.net;
    coveredGross += paymentGrossUsd(payment);
  }

  const total = stripePayments.length;
  const gross = roundMoney(
    stripePayments.reduce((sum, payment) => sum + paymentGrossUsd(payment), 0),
  );
  const complete = total > 0 && covered === total;

  return {
    gross,
    transactions: total,
    fees: covered ? roundMoney(fees) : null,
    net: covered ? roundMoney(net) : null,
    coveredGross: roundMoney(coveredGross),
    uncoveredGross: roundMoney(gross - coveredGross),
    netCoverage: covered,
    netCoverageTotal: total,
    effectiveFeeRate:
      covered && coveredGross > 0
        ? Number(((fees / coveredGross) * 100).toFixed(2))
        : null,
    feeDataStatus: complete ? "live" : covered ? "partial" : "setup",
    source: covered ? "stripe_balance_transactions" : "setup",
  };
}

function stripeSourceDescriptor(stripe) {
  if (stripe.feeDataStatus === "live") {
    return {
      status: "live",
      label: `Gross and processor fees live · ${stripe.netCoverage} of ${stripe.netCoverageTotal} charges reconciled`,
    };
  }

  if (stripe.feeDataStatus === "partial") {
    return {
      status: "partial",
      label: `Processor fees reconciled for ${stripe.netCoverage} of ${stripe.netCoverageTotal} charges`,
    };
  }

  return {
    status: stripe.transactions ? "partial" : "setup",
    label: stripe.transactions
      ? "Gross payments live; processor fees not reconciled yet"
      : "Connected · no production charges recorded yet",
  };
}

export function buildOwnerMetrics({
  users = [],
  payments = [],
  attempts = [],
  exams = [],
  options = {},
  now = new Date(),
}) {
  const period = resolveOwnerPeriod(options, now, [
    ...payments.map(paymentDate),
    ...users.map((user) => user.created_at),
  ]);
  const completedPayments = payments.filter(
    (payment) =>
      isCompletedProductionPayment(payment) &&
      ["stripe", "revenuecat"].includes(paymentProvider(payment)),
  );
  const productionPayments = completedPayments.filter(
    (payment) =>
      paymentGrossUsd(payment) > 0 &&
      timestamp(paymentDate(payment)) <= now.getTime(),
  );
  const selectedPayments = productionPayments.filter((payment) =>
    inWindow(paymentDate(payment), period),
  );
  // Administrative access and internal accounts do not count toward conversion.
  const members = users.filter((user) => user.role !== "admin");
  const thirtyDaysAgo = now.getTime() - 30 * DAY_MS;
  const recentPayments = productionPayments.filter((payment) => {
    const occurredAt = new Date(paymentDate(payment) || 0).getTime();
    return Number.isFinite(occurredAt) && occurredAt >= thirtyDaysAgo;
  });
  const stripePayments = selectedPayments.filter(
    (payment) => paymentProvider(payment) === "stripe",
  );
  const applePayments = selectedPayments.filter(
    (payment) => paymentProvider(payment) === "revenuecat",
  );
  const appleWithProceeds = applePayments
    .map((payment) => ({ payment, proceeds: estimatedStoreProceeds(payment) }))
    .filter((entry) => entry.proceeds !== null);

  const paymentsByUser = new Map();
  for (const payment of payments.filter(
    (payment) =>
      timestamp(paymentDate(payment)) <= now.getTime() &&
      (payment.status !== "completed" || paymentGrossUsd(payment) > 0),
  )) {
    const current = paymentsByUser.get(payment.user_id) || [];
    current.push(payment);
    paymentsByUser.set(payment.user_id, current);
  }
  const lifecycles = members.map((user) =>
    deriveSubscriptionLifecycle(user, paymentsByUser.get(user.id) || [], now),
  );
  const premiumUsers = members.filter(
    (user) => user.plan && user.plan !== "free",
  );
  const active30 = members.filter((user) => {
    const lastActive = user.last_login || user.token_issued_at;
    const timestamp = new Date(lastActive || 0).getTime();
    return (
      Number.isFinite(timestamp) &&
      timestamp >= thirtyDaysAgo &&
      timestamp <= now.getTime()
    );
  });
  const business = buildBusinessDetail({
    users: members,
    productionPayments,
    allPayments: payments.filter(
      (payment) =>
        payment.status !== "sandbox" &&
        String(payment.metadata?.environment || "").toUpperCase() !== "SANDBOX",
    ),
    lifecycles,
    period,
    now,
    attempts,
    exams,
    amountOf: paymentGrossUsd,
  });
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(selectedPayments.length / pageSize));
  const page = Math.min(
    pageCount,
    Math.max(1, Math.trunc(Number(options.page)) || 1),
  );
  const transactions = [...selectedPayments]
    .sort((a, b) => timestamp(paymentDate(b)) - timestamp(paymentDate(a)))
    .slice((page - 1) * pageSize, page * pageSize)
    .map((payment) => {
      const provider = paymentProvider(payment);
      const fees = provider === "stripe" ? stripeFeeRecord(payment) : null;
      const proceeds =
        provider === "revenuecat" ? estimatedStoreProceeds(payment) : null;
      return {
        id: payment.id,
        date: paymentDate(payment),
        provider,
        plan: payment.plan || payment.metadata?.plan || null,
        gross: paymentGrossUsd(payment),
        fees: fees?.fee ?? null,
        net: fees?.net ?? proceeds,
        status: fees
          ? "reconciled"
          : proceeds !== null
            ? "estimated"
            : "pending",
      };
    });
  const stripeSummary = summarizeStripeFees(stripePayments, "USD");
  const stripeGross = stripeSummary.gross;
  const appleGross = roundMoney(
    applePayments.reduce((sum, payment) => sum + paymentGrossUsd(payment), 0),
  );
  const appleEstimatedProceeds = roundMoney(
    appleWithProceeds.reduce((sum, entry) => sum + entry.proceeds, 0),
  );

  return {
    generatedAt: now.toISOString(),
    period,
    business,
    transactions: {
      rows: transactions,
      page,
      pageSize,
      total: selectedPayments.length,
      pageCount,
    },
    quality: {
      excludedPayments: completedPayments.filter(
        (payment) =>
          paymentGrossUsd(payment) <= 0 ||
          !Number.isFinite(timestamp(paymentDate(payment))) ||
          timestamp(paymentDate(payment)) > now.getTime(),
      ).length,
    },
    money: {
      customerGross: roundMoney(stripeGross + appleGross),
      customerGross30d: roundMoney(
        recentPayments.reduce(
          (sum, payment) => sum + paymentGrossUsd(payment),
          0,
        ),
      ),
      transactions: selectedPayments.length,
      transactions30d: recentPayments.length,
      stripe: stripeSummary,
      apple: {
        gross: appleGross,
        transactions: applePayments.length,
        estimatedProceeds: appleEstimatedProceeds,
        proceedsCoverage: appleWithProceeds.length,
        proceedsCoverageTotal: applePayments.length,
        source: appleWithProceeds.length ? "revenuecat_webhooks" : "setup",
      },
      // Only a number we can defend: every Stripe charge reconciled and no
      // iOS revenue waiting on Apple's final financial report.
      verifiedTakeHome:
        stripeSummary.feeDataStatus === "live" && applePayments.length === 0
          ? stripeSummary.net
          : null,
      verifiedTakeHomeBlockers: [
        ...(stripeSummary.feeDataStatus === "live"
          ? []
          : [
              stripeSummary.transactions
                ? "stripe_fees_pending"
                : "stripe_no_charges",
            ]),
        ...(applePayments.length ? ["apple_final_payout_pending"] : []),
      ],
      currency: "USD",
    },
    customers: {
      total: members.length,
      active30d: active30.length,
      premium: premiumUsers.length,
      free: Math.max(0, members.length - premiumUsers.length),
      paidConversionRate: members.length
        ? Number(((business.current.paid / members.length) * 100).toFixed(1))
        : 0,
    },
    subscriptions: {
      trialing: lifecycles.filter(
        (lifecycle) => lifecycle.status === "trialing",
      ).length,
      convertedFromTrial: lifecycles.filter(
        (lifecycle) => lifecycle.status === "converted",
      ).length,
      paid: business.current.paid,
      renewals: business.renewals,
      monthly: business.current.monthly,
      yearly: business.current.yearly,
    },
    history: revenueHistory(selectedPayments, period, paymentGrossUsd),
    sources: {
      database: {
        status: "live",
        label: "Members, activity and recorded payments",
      },
      stripe: stripeSourceDescriptor(stripeSummary),
      revenueCat: {
        status:
          appleWithProceeds.length === applePayments.length &&
          applePayments.length
            ? "live"
            : "partial",
        label: appleWithProceeds.length
          ? `${appleWithProceeds.length} of ${applePayments.length} iOS transactions include estimated proceeds`
          : "Gross purchases live; proceeds API not connected",
      },
      appStore: {
        status: "setup",
        label: "App Store analytics is unavailable in this environment",
      },
      appleFinancials: {
        status: "setup",
        label: "Final Apple financial payout not connected",
      },
    },
  };
}
