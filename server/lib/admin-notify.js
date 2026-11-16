const DEFAULT_ADMIN_EMAIL = "";
const DEFAULT_FROM_EMAIL = "RBT Genius <onboarding@resend.dev>";

function parseRecipients(value) {
  return String(value || DEFAULT_ADMIN_EMAIL)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildHtmlRows(fields) {
  return fields
    .filter((field) => field?.value !== undefined && field?.value !== null && field?.value !== "")
    .map(
      (field) => `
        <tr>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-weight:600;background:#f8fafc;">${escapeHtml(field.label)}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(field.value)}</td>
        </tr>`,
    )
    .join("");
}

async function sendAdminEmail({ subject, preview, fields }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[admin-notify] Skipped "${subject}" because RESEND_API_KEY is not configured.`);
    return { sent: false, reason: "missing_api_key" };
  }

  const to = parseRecipients(
    process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAILS,
  );
  if (!to.length) {
    console.warn(
      `[admin-notify] Skipped "${subject}" because neither ADMIN_NOTIFICATION_EMAIL nor ADMIN_EMAILS is configured.`,
    );
    return { sent: false, reason: "missing_recipient" };
  }
  const from = process.env.ADMIN_NOTIFICATION_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  const text = fields
    .filter((field) => field?.value !== undefined && field?.value !== null && field?.value !== "")
    .map((field) => `${field.label}: ${field.value}`)
    .join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
      <div style="max-width:680px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:20px 24px;background:#1e5eff;color:white;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;">RBT Genius</div>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.2;">${escapeHtml(subject)}</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 18px;color:#475569;">${escapeHtml(preview)}</p>
          <table style="width:100%;border-collapse:collapse;border-spacing:0;">
            ${buildHtmlRows(fields)}
          </table>
        </div>
      </div>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[admin-notify] ${subject} failed: ${response.status} ${body}`);
      return { sent: false, reason: "provider_error", status: response.status };
    }

    return response.json();
  } catch (error) {
    console.error(`[admin-notify] ${subject} failed:`, error);
    return {
      sent: false,
      reason: "request_failed",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function sendUserEmail({ to, subject, preview, bodyHtml }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) { console.warn('[notify] Skipped because RESEND_API_KEY not set'); return { sent: false }; }
  const from = process.env.NOTIFICATION_FROM_EMAIL || process.env.ADMIN_NOTIFICATION_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html: bodyHtml, text: preview }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[notify] email failed', r.status, body);
      return { sent: false, status: r.status };
    }
    const data = await r.json().catch(() => ({}));
    return { sent: true, id: data.id || null };
  } catch (e) { console.error('[notify] email error', e); return { sent: false }; }
}

export async function sendVerificationEmail(user, verificationToken, origin = 'https://www.rbtgenius.com') {
  const link = `${origin}/api/auth/verify-email?token=${verificationToken}`;
  return sendUserEmail({
    to: user.email,
    subject: 'Verify your RBT Genius email',
    preview: `Click the link to verify your email: ${link}`,
    bodyHtml: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
      <div style="max-width:560px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:20px 24px;background:#1e5eff;color:white;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;">RBT Genius</div>
          <h1 style="margin:8px 0 0;font-size:22px;">Verify your email</h1>
        </div>
        <div style="padding:28px 24px;">
          <p style="margin:0 0 20px;color:#475569;">Hi ${escapeHtml(user.full_name || user.email)}, please click the button below to verify your email address and activate your account.</p>
          <a href="${link}" style="display:inline-block;padding:12px 28px;background:#1e5eff;color:white;border-radius:10px;text-decoration:none;font-weight:600;">Verify Email</a>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </div>
    </div>`,
  });
}

function paymentPlanLabel(plan) {
  if (plan === 'premium_yearly') return 'Premium Yearly';
  if (plan === 'premium_monthly') return 'Premium Monthly';
  return 'Premium';
}

export async function sendPaymentConfirmation({ user, payment }) {
  if (!user?.email || !payment) {
    return { sent: false, reason: 'missing_recipient_or_payment' };
  }

  const currency = String(
    payment.currency || payment.metadata?.currency || 'USD',
  ).toUpperCase();
  const amount = Number(payment.amount || 0).toFixed(2);
  const provider =
    payment.provider_label ||
    payment.metadata?.provider_label ||
    payment.provider ||
    'Billing provider';
  const transactionId =
    payment.metadata?.transaction_id ||
    payment.metadata?.stripe_invoice_id ||
    payment.id;
  const paymentDate = new Date(
    payment.payment_date || payment.created_at || Date.now(),
  ).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });
  const plan = paymentPlanLabel(payment.plan || payment.metadata?.plan);
  const isApple = String(provider).toLowerCase().includes('apple');
  const officialReceiptNote = isApple
    ? 'Apple processed this purchase. This message confirms your RBT Genius access; your official App Store receipt and purchase history are available from Apple.'
    : 'This message confirms the payment recorded for your RBT Genius account.';

  return sendUserEmail({
    to: user.email,
    subject: 'Payment confirmation — RBT Genius',
    preview: `${plan}: ${currency} ${amount}. ${officialReceiptNote}`,
    bodyHtml: `<div style="font-family:Inter,Arial,sans-serif;padding:24px;background:#f8fafc;color:#0f172a;">
      <div style="max-width:600px;margin:0 auto;background:white;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;">
        <div style="padding:22px 26px;background:#1e5eff;color:white;">
          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;opacity:.8;">RBT Genius</div>
          <h1 style="margin:8px 0 0;font-size:24px;">Payment confirmed</h1>
        </div>
        <div style="padding:28px 26px;">
          <p style="margin:0 0 22px;color:#475569;">Hi ${escapeHtml(user.full_name || user.email)}, your RBT Genius payment was recorded successfully.</p>
          <table style="width:100%;border-collapse:collapse;border-spacing:0;">
            ${buildHtmlRows([
              { label: 'Plan', value: plan },
              { label: 'Amount', value: `${currency} ${amount}` },
              { label: 'Payment date', value: paymentDate },
              { label: 'Processed by', value: provider },
              { label: 'Transaction', value: transactionId },
            ])}
          </table>
          <p style="margin:22px 0 0;color:#64748b;font-size:13px;line-height:1.55;">${escapeHtml(officialReceiptNote)}</p>
          ${isApple ? '<p style="margin:14px 0 0;"><a href="https://reportaproblem.apple.com/" style="color:#1e5eff;">View Apple purchase history</a></p>' : ''}
        </div>
      </div>
    </div>`,
  });
}

export async function notifyNewMember(user, details = {}) {
  const plan = memberPlanLabel(user?.plan);
  const authProvider = String(
    user?.auth_provider || details.authProvider || "unknown",
  );
  const source = details.source || "app";
  const name = user?.full_name || user?.email || "A new member";

  const emailResult = await sendAdminEmail({
    subject: "New member joined RBT Genius",
    preview: `${name} accessed RBT Genius for the first time with the ${plan} plan.`,
    fields: [
      { label: "Full name", value: user.full_name },
      { label: "Email", value: user.email },
      { label: "Role", value: user.role || "student" },
      { label: "Plan", value: plan },
      { label: "Auth provider", value: authProvider },
      { label: "First access", value: user.created_at || new Date().toISOString() },
      { label: "Source", value: source },
      { label: "User ID", value: user.id },
    ],
  });

  const pushResult = await sendAdminPush(details.pushTokens, {
    title: "New RBT Genius member",
    body: `${name} joined with ${plan} via ${authProvider}.`,
    data: {
      type: "admin_new_member",
      user_id: user?.id ?? null,
      plan: user?.plan || "free",
      auth_provider: authProvider,
    },
  });

  return { email: emailResult, push: pushResult };
}

// ── Subscription lifecycle notifications ─────────────────────────────────────
// One entry point for every billing event, on every channel (Stripe/web and
// RevenueCat/iOS). Previously only Stripe checkouts notified anyone, so iOS
// subscriptions — the main revenue channel — were completely silent.

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function memberPlanLabel(plan) {
  if (plan === "premium_yearly") return "Premium Yearly";
  if (plan === "premium_monthly") return "Premium Monthly";
  return "Free";
}

const SUBSCRIPTION_EVENTS = {
  started: {
    subject: "New paid subscription",
    preview: "A member just started a paid subscription.",
    push: (name, plan) => ({ title: "New subscription", body: `${name} subscribed to ${plan}.` }),
  },
  renewed: {
    subject: "Subscription renewed",
    preview: "A recurring subscription payment went through.",
    push: (name, plan) => ({ title: "Subscription renewed", body: `${name} renewed ${plan}.` }),
  },
  cancelled: {
    subject: "Subscription ended",
    preview: "A member's subscription was cancelled or expired.",
    push: (name) => ({ title: "Subscription ended", body: `${name} is no longer premium.` }),
  },
  payment_failed: {
    subject: "Subscription payment failed",
    preview: "A renewal payment failed. The provider will usually retry.",
    push: (name) => ({ title: "Payment failed", body: `Renewal failed for ${name}.` }),
  },
  billing_expired: {
    subject: "Premium access ended — payment not recovered",
    preview: "The store ended Premium access after a billing failure. This is not a voluntary cancellation.",
    push: (name) => ({ title: "Premium payment unresolved", body: `${name} lost Premium access after a billing failure.` }),
  },
};

// Fire-and-forget Expo push to the admins' phones. Never throws — a push
// failure must not break a billing webhook.
function maskPushToken(token) {
  const value = String(token || "");
  if (value.length <= 12) return "[redacted]";
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export async function sendAdminPush(pushTokens, { title, body, data = {} }) {
  const tokens = [...new Set((pushTokens || []).filter(Boolean))];
  if (!tokens.length) return { sent: false, reason: "no_tokens" };
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(
        tokens.map((to) => ({ to, title, body, sound: "default", priority: "high", data })),
      ),
    });
    if (!response.ok) {
      console.error(`[admin-notify] push failed: ${response.status}`);
      return { sent: false, reason: "provider_error" };
    }

    // Expo returns HTTP 200 even when individual messages fail — the real
    // outcome is per-ticket in the body. Without reading it, a token that is
    // no longer valid (DeviceNotRegistered) fails completely silently, which
    // is exactly how one admin can stop receiving pushes unnoticed.
    const responseBody = await response.json().catch(() => null);
    const tickets = Array.isArray(responseBody?.data) ? responseBody.data : null;
    if (!tickets || tickets.length !== tokens.length) {
      console.error(
        `[admin-notify] Expo returned an invalid ticket response: expected ${tokens.length}, received ${tickets?.length ?? 0}`,
      );
      return {
        sent: false,
        count: 0,
        failed: tokens.length,
        reason: "invalid_provider_response",
      };
    }

    const failures = [];
    tickets.forEach((ticket, index) => {
      if (ticket?.status !== "ok") {
        failures.push({
          token: tokens[index],
          error: ticket?.details?.error || ticket?.message || "unknown",
          message: ticket?.message || null,
        });
      }
    });

    if (failures.length) {
      for (const failure of failures) {
        console.error(
          `[admin-notify] push rejected for ${maskPushToken(failure.token)}: ${failure.error}${failure.message ? ` (${failure.message})` : ""}`,
        );
      }
    }

    return {
      sent: failures.length < tokens.length,
      count: tokens.length - failures.length,
      failed: failures.length,
      failures,
    };
  } catch (error) {
    console.error("[admin-notify] push error:", error);
    return { sent: false, reason: "request_failed" };
  }
}

/**
 * Notify the admins about a billing event by email and (optionally) push.
 *
 * @param {'started'|'renewed'|'cancelled'|'payment_failed'} kind
 * @param {object} user      The affected member.
 * @param {string} plan      Plan id at the time of the event.
 * @param {'stripe'|'revenuecat'} source  Which billing channel fired this.
 * @param {object} details   Extra rows to show in the email body.
 * @param {string[]} pushTokens  Admin device tokens (see db.getAdminPushTokens).
 */
export async function notifySubscriptionEvent({
  kind,
  user,
  plan,
  source,
  details = {},
  pushTokens = [],
}) {
  const config = SUBSCRIPTION_EVENTS[kind];
  if (!config) {
    console.warn(`[admin-notify] unknown subscription event kind "${kind}"`);
    return { sent: false, reason: "unknown_kind" };
  }

  const name = user?.full_name || user?.email || "A member";
  const planLabel = plan || user?.plan || "unknown";

  const emailResult = await sendAdminEmail({
    subject: config.subject,
    preview: config.preview,
    fields: [
      { label: "Full name", value: user?.full_name },
      { label: "Email", value: user?.email },
      { label: "Plan", value: planLabel },
      { label: "Channel", value: source === "revenuecat" ? "iOS (RevenueCat)" : "Web (Stripe)" },
      { label: "Event", value: kind },
      ...Object.entries(details).map(([label, value]) => ({ label, value })),
      { label: "User ID", value: user?.id },
      { label: "Occurred at", value: new Date().toISOString() },
    ],
  });

  const pushCopy = config.push(name, planLabel);
  const pushResult = await sendAdminPush(pushTokens, {
    ...pushCopy,
    data: { type: "admin_subscription", kind, user_id: user?.id ?? null },
  });

  return { email: emailResult, push: pushResult };
}

export async function notifyNewSubscription({ user, plan, checkout }) {
  return sendAdminEmail({
    subject: "New premium subscription",
    preview: "A member completed a premium subscription checkout in RBT Genius.",
    fields: [
      { label: "Full name", value: user?.full_name },
      { label: "Email", value: user?.email || checkout?.customer_email || checkout?.customer_details?.email },
      { label: "Plan", value: plan || user?.plan },
      { label: "Amount", value: checkout?.amount_total ? `${Number(checkout.amount_total) / 100} ${String(checkout.currency || "usd").toUpperCase()}` : "" },
      { label: "Payment status", value: checkout?.payment_status || checkout?.status },
      { label: "Completed at", value: checkout?.completed_at || new Date((checkout?.created || Math.floor(Date.now() / 1000)) * 1000).toISOString() },
      { label: "Stripe session", value: checkout?.id || checkout?.session_id },
      { label: "Stripe customer", value: checkout?.customer || checkout?.customer_id },
      { label: "Stripe subscription", value: checkout?.subscription || checkout?.subscription_id },
      { label: "User ID", value: user?.id },
    ],
  });
}
