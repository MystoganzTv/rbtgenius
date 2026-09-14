// Billing paragraphs for the in-app legal screens — Android / web build.
// Metro resolves legalBilling.ios.js on iOS, where purchases are billed by
// Apple and refunds are handled by Apple, not by us. Keeping these texts
// per-platform stops the app from telling iOS users something that is not
// true of their purchase (which is how a legal screen becomes "misleading"
// under App Store Review Guideline 5.6).

export const BILLING_PRIVACY_SECTION = {
  h: '3. Billing and payment data',
  b: 'Subscription payments may be processed through Stripe. RBT Genius may store payment metadata such as plan, amount, currency, status, Stripe customer IDs, and Stripe session or subscription references. Full card data is not stored directly by RBT Genius.',
};

export const REFUND_SECTIONS = [
  { h: '1. Subscription purchases', b: 'Premium access may be sold as monthly or yearly recurring billing. By purchasing a premium subscription, you authorize recurring charges according to the plan selected during checkout.' },
  { h: '2. Refund requests', b: 'Refund requests are reviewed on a case-by-case basis. If you believe you were charged in error or experienced a billing problem, contact us as soon as possible so we can review the situation.' },
  { h: '3. Non-refundable situations', b: 'In general, partial usage of a billing period, missed cancellations, or access to premium content alone may not automatically qualify for a refund. However, we will still review legitimate cases fairly.' },
  { h: '4. How to request help', b: 'For billing support or refund review, email info@rbtgenius.com and include the email used on your account, the plan involved, and the date of the charge.' },
];
