// Regression guard for App Store Review Guideline 3.1.1 / 5.6.
//
// Version 1.1.4 was rejected under 5.6 because the iOS build contained a
// conditional path to an external (Stripe) payment flow: if RevenueCat
// offerings failed to load, the paywall fell back to hosted web checkout,
// "Restore" opened the web pricing page, and "Manage Subscription" opened the
// Stripe billing portal. All web-billing code now lives in webBilling.js,
// which Metro replaces with webBilling.ios.js on iOS.
//
// These tests fail if an external payment path ever leaks back into the files
// that reach the iOS bundle.

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// Endpoints and URLs that must never be reachable from an iOS build.
const EXTERNAL_PAYMENT_MARKERS = [
  '/api/billing/checkout',
  '/api/billing/portal',
  '/api/billing/confirm',
  '/pricing',
  'stripe',
  'Stripe',
];

test('the iOS billing module exposes no external payment path', () => {
  const ios = read('mobile/src/lib/webBilling.ios.js');

  for (const marker of EXTERNAL_PAYMENT_MARKERS) {
    assert.ok(
      !ios.includes(marker),
      `webBilling.ios.js must not reference "${marker}" — on iOS every purchase goes through In-App Purchase`,
    );
  }

  assert.match(ios, /WEB_BILLING_ENABLED = false/);
  assert.ok(
    ios.includes('https://apps.apple.com/account/subscriptions'),
    'iOS subscription management must point at Apple, as the App Store description states',
  );
});

test('the paywall never calls a payment endpoint directly', () => {
  const screen = read('mobile/src/screens/tabs/UpgradeScreen.jsx');

  for (const marker of ['/api/billing/checkout', '/api/billing/portal', '/api/billing/confirm', '/pricing']) {
    assert.ok(
      !screen.includes(marker),
      `UpgradeScreen must not reference "${marker}" — route it through the platform-split webBilling module`,
    );
  }

  // Every external hop is gated on the platform flag, never on a runtime
  // condition such as "offerings failed to load".
  for (const call of ['startCheckout', 'openPricingPage']) {
    assert.ok(screen.includes(call), `UpgradeScreen should import ${call} from webBilling`);
  }
  assert.ok(screen.includes('WEB_BILLING_ENABLED'), 'the paywall must branch on the platform flag');
});

test('web billing stays available on the platforms that allow it', () => {
  const web = read('mobile/src/lib/webBilling.js');
  assert.match(web, /WEB_BILLING_ENABLED = true/);
  assert.ok(web.includes('/api/billing/checkout'), 'Android/web keep hosted checkout');
});

test('iOS legal screens describe Apple billing, not Stripe', () => {
  const legal = read('mobile/src/lib/legalBilling.ios.js');
  assert.ok(!/stripe/i.test(legal), 'iOS legal copy must not mention Stripe');
  assert.ok(
    legal.includes('reportaproblem.apple.com'),
    'iOS refunds are handled by Apple and the policy must say so',
  );
});
