import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildRevenueCatPayment,
  interpretWebhookEvent,
  resolvePlanFromRevenueCatEvent,
} from '../server/lib/revenuecat.js';

const yearlyPurchase = {
  id: 'B02D715C-5263-4411-AD3C-37E8920E4EFE',
  type: 'INITIAL_PURCHASE',
  app_user_id: 'user_1779228191783_nb7lz3',
  original_app_user_id: '$RCAnonymousID:72565f2536964cffad07a1f5f236cc0c',
  aliases: [
    'user_1779228191783_nb7lz3',
    '$RCAnonymousID:72565f2536964cffad07a1f5f236cc0c',
  ],
  product_id: 'com.rbtgenius.monthly',
  purchased_at_ms: 1785193869000,
  expiration_at_ms: 1816729869000,
  event_timestamp_ms: 1785193874637,
  price: 214.99,
  price_in_purchased_currency: 214.99,
  currency: 'USD',
  store: 'APP_STORE',
  environment: 'PRODUCTION',
  period_type: 'INTRO',
  transaction_id: '1570000025466494',
  original_transaction_id: '1570000025466494',
  renewal_number: 1,
};

test('RevenueCat duration wins over a misleading monthly product identifier', () => {
  assert.equal(
    resolvePlanFromRevenueCatEvent(yearlyPurchase),
    'premium_yearly',
  );
  assert.deepEqual(interpretWebhookEvent(yearlyPurchase), {
    action: 'upgrade',
    plan: 'premium_yearly',
    appUserIds: [
      'user_1779228191783_nb7lz3',
      '$RCAnonymousID:72565f2536964cffad07a1f5f236cc0c',
    ],
  });
});

test('RevenueCat purchase becomes an idempotent payment record with display metadata', () => {
  assert.deepEqual(
    buildRevenueCatPayment(
      yearlyPurchase,
      'user_1779228191783_nb7lz3',
      'premium_yearly',
    ),
    {
      id: 'pay_rc_1570000025466494',
      user_id: 'user_1779228191783_nb7lz3',
      status: 'completed',
      amount: 214.99,
      payment_date: '2026-07-27T23:11:09.000Z',
      created_at: '2026-07-27T23:11:09.000Z',
      plan: 'premium_yearly',
      currency: 'USD',
      provider: 'revenuecat',
      provider_label: 'Apple App Store',
      metadata: {
        plan: 'premium_yearly',
        currency: 'USD',
        usd_price: 214.99,
        provider: 'revenuecat',
        provider_label: 'Apple App Store',
        revenuecat_event_id: 'B02D715C-5263-4411-AD3C-37E8920E4EFE',
        revenuecat_event_type: 'INITIAL_PURCHASE',
        revenuecat_app_user_id: 'user_1779228191783_nb7lz3',
        transaction_id: '1570000025466494',
        original_transaction_id: '1570000025466494',
        product_id: 'com.rbtgenius.monthly',
        store: 'APP_STORE',
        environment: 'PRODUCTION',
        period_type: 'INTRO',
        renewal_number: 1,
        country_code: null,
        tax_percentage: null,
        commission_percentage: null,
        purchased_at: '2026-07-27T23:11:09.000Z',
        expiration_at: '2027-07-27T23:11:09.000Z',
        event_timestamp: '2026-07-27T23:11:14.637Z',
      },
    },
  );
});

test('RevenueCat stores tax and commission percentages needed for proceeds', () => {
  const payment = buildRevenueCatPayment(
    {
      ...yearlyPurchase,
      transaction_id: 'financial-fields-1',
      tax_percentage: 0.05,
      commission_percentage: 0.15,
    },
    'user-1',
    'premium_yearly',
  );

  assert.equal(payment.metadata.tax_percentage, 0.05);
  assert.equal(payment.metadata.commission_percentage, 0.15);
});

test('sandbox transactions remain visible without counting as completed revenue', () => {
  const payment = buildRevenueCatPayment(
    { ...yearlyPurchase, environment: 'SANDBOX', transaction_id: 'sandbox-1' },
    'user-1',
    'premium_yearly',
  );
  assert.equal(payment.status, 'sandbox');
});

test('free-trial starts grant access without counting as completed revenue', () => {
  const payment = buildRevenueCatPayment(
    {
      ...yearlyPurchase,
      period_type: 'TRIAL',
      price: 0,
      price_in_purchased_currency: 0,
      transaction_id: 'trial-1',
    },
    'user-1',
    'premium_monthly',
  );

  assert.equal(payment.status, 'trial');
  assert.equal(payment.amount, 0);
  assert.equal(payment.metadata.period_type, 'TRIAL');
});
