// iOS billing surface — In-App Purchase only.
//
// On iOS every purchase of digital content goes through StoreKit (via
// RevenueCat). This module is the iOS counterpart of `webBilling.js` and
// intentionally contains NO external payment endpoint, checkout URL or
// pricing-page link: App Store Review Guideline 3.1.1 forbids them, and a
// conditional fallback to one is what got version 1.1.4 rejected under
// guideline 5.6 ("features that appear to have been intentionally hidden
// during the review process").
//
// Keep it that way. If StoreKit is unavailable the paywall must surface an
// error and let the user retry — it must never route around Apple.

import { Linking } from 'react-native';

export const WEB_BILLING_ENABLED = false;

// Apple's own subscription management screen. Required by 3.1.2 and by the
// App Store description, which tells users to manage or cancel there.
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export async function startCheckout() {
  // No external purchase path exists on iOS.
  return false;
}

export async function openManageSubscription() {
  await Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
  return true;
}

export async function openPricingPage() {
  return false;
}

export function parseBillingReturn() {
  return null;
}

export async function confirmCheckoutSession() {
  return null;
}
