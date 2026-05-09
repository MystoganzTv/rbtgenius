const DEFAULT_ADMIN_EMAIL = "enrique.padron853@gmail.com";
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

  const to = parseRecipients(process.env.ADMIN_NOTIFICATION_EMAIL);
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
    if (!r.ok) { console.error('[notify] email failed', r.status); return { sent: false }; }
    return { sent: true };
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

export async function notifyNewMember(user, details = {}) {
  return sendAdminEmail({
    subject: "New member created",
    preview: "A new member account was created in RBT Genius.",
    fields: [
      { label: "Full name", value: user.full_name },
      { label: "Email", value: user.email },
      { label: "Role", value: user.role || "student" },
      { label: "Plan", value: user.plan || "free" },
      { label: "Auth provider", value: user.auth_provider || details.authProvider || "unknown" },
      { label: "Created at", value: user.created_at },
      { label: "Source", value: details.source || "app" },
      { label: "User ID", value: user.id },
    ],
  });
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
