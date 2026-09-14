// Billing paragraphs for the in-app legal screens — iOS build.
// On iOS every subscription is sold through Apple In-App Purchase: Apple
// bills the customer, Apple holds the payment data, and Apple decides
// refunds. These texts say exactly that, so the legal screens match what
// actually happens to an iOS user's money.

export const BILLING_PRIVACY_SECTION = {
  h: '3. Billing and payment data',
  b: 'Subscriptions bought in this app are processed by Apple through In-App Purchase. RBT Genius never receives or stores your payment details. We store only the subscription status Apple reports back to us — the product purchased, whether it is active, and when it renews or expires — so we can unlock premium features on your account.',
};

export const REFUND_SECTIONS = [
  { h: '1. Subscription purchases', b: 'Premium access is sold as a monthly or yearly auto-renewing subscription and is charged to your Apple ID at confirmation of purchase. The subscription renews automatically unless auto-renew is turned off at least 24 hours before the end of the current period. You can manage or cancel it at any time in Settings > your name > Subscriptions.' },
  { h: '2. Refund requests', b: 'Refunds for purchases made in this app are handled by Apple, not by RBT Genius. We cannot issue, approve, or deny a refund for an App Store purchase. Request one at reportaproblem.apple.com using the Apple ID that made the purchase.' },
  { h: '3. What we can help with', b: 'If premium features did not unlock after a purchase, or your subscription status looks wrong in the app, that is ours to fix. Email info@rbtgenius.com with the email on your account and we will sort out the entitlement.' },
  { h: '4. Cancelling', b: 'Cancelling stops the next renewal; premium access stays available until the end of the period you already paid for. Cancelling does not by itself trigger a refund for the current period.' },
];
