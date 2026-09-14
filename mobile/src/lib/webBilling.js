// Web billing (Stripe) — Android and web only.
//
// Metro resolves `webBilling.ios.js` for iOS builds, so nothing in this file
// — no endpoint, no URL, no string — is compiled into the iOS bundle. That
// separation is deliberate: App Store Review Guideline 3.1.1 requires every
// purchase of digital content on iOS to go through In-App Purchase, and
// shipping a binary that *contains* an alternative payment path (even one
// behind a runtime condition) is what got version 1.1.4 rejected under
// guideline 5.6. Do not import Stripe endpoints anywhere outside this module.

import { Linking } from 'react-native';

const API_BASE = 'https://www.rbtgenius.com';

export const WEB_BILLING_ENABLED = true;

const APP_RETURN_SCHEME = 'exp+rbt-genius';
const APP_RETURN_HOST = 'billing';

function buildAppReturnUrl(params = {}) {
  const url = new URL(`${APP_RETURN_SCHEME}://${APP_RETURN_HOST}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

/** Opens hosted checkout in the system browser. Returns true if it opened. */
export async function startCheckout({ token, plan }) {
  const res = await fetch(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      plan,
      success_url: buildAppReturnUrl(),
      cancel_url: buildAppReturnUrl(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.url) return false;
  await Linking.openURL(data.url);
  return true;
}

/** Opens the self-serve billing portal. Returns true if it opened. */
export async function openManageSubscription({ token }) {
  const res = await fetch(`${API_BASE}/api/billing/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ return_url: buildAppReturnUrl({ portal: 'return' }) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.url) return false;
  await Linking.openURL(data.url);
  return true;
}

export async function openPricingPage() {
  await Linking.openURL(`${API_BASE}/pricing`);
  return true;
}

/**
 * Parses a deep link coming back from the browser.
 * Returns { kind: 'portal-return' | 'cancelled' | 'success', sessionId? } or null.
 */
export function parseBillingReturn(incomingUrl) {
  if (!incomingUrl) return null;

  let parsed;
  try {
    parsed = new URL(incomingUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== `${APP_RETURN_SCHEME}:` || parsed.hostname !== APP_RETURN_HOST) {
    return null;
  }

  if (parsed.searchParams.get('portal') === 'return') return { kind: 'portal-return' };

  const checkoutState = parsed.searchParams.get('checkout');
  if (checkoutState === 'cancelled') return { kind: 'cancelled' };

  const sessionId = parsed.searchParams.get('session_id');
  if (checkoutState === 'success' && sessionId) return { kind: 'success', sessionId };

  return null;
}

export async function confirmCheckoutSession({ token, sessionId }) {
  const res = await fetch(`${API_BASE}/api/billing/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ session_id: sessionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Unable to confirm checkout');
  return data;
}
