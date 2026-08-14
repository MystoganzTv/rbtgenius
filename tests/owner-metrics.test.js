import assert from 'node:assert/strict';
import test from 'node:test';

import { buildOwnerMetrics } from '../server/lib/owner-metrics.js';

const now = new Date('2026-08-14T12:00:00.000Z');

test('owner metrics separate customer gross from estimated Apple proceeds', () => {
  const metrics = buildOwnerMetrics({
    now,
    users: [
      { id: 'u1', plan: 'premium_yearly', created_at: '2026-08-01T12:00:00.000Z' },
      { id: 'u2', plan: 'free', created_at: '2026-01-01T12:00:00.000Z' },
    ],
    payments: [
      {
        id: 'stripe-1',
        user_id: 'u1',
        status: 'completed',
        amount: 99.99,
        provider: 'stripe',
        payment_date: '2026-08-02T12:00:00.000Z',
      },
      {
        id: 'apple-1',
        user_id: 'u1',
        status: 'completed',
        amount: 19.99,
        provider: 'revenuecat',
        payment_date: '2026-08-03T12:00:00.000Z',
        metadata: {
          provider: 'revenuecat',
          usd_price: 19.99,
          environment: 'PRODUCTION',
          tax_percentage: 0.05,
          commission_percentage: 0.15,
        },
      },
    ],
  });

  assert.equal(metrics.money.customerGross, 119.98);
  assert.equal(metrics.money.apple.estimatedProceeds, 15.99);
  assert.equal(metrics.money.stripe.net, null);
  assert.equal(metrics.money.verifiedTakeHome, null);
  assert.equal(metrics.customers.paidConversionRate, 50);
});

test('owner metrics exclude sandbox and trial activity from revenue', () => {
  const metrics = buildOwnerMetrics({
    now,
    users: [{ id: 'u1', plan: 'premium_monthly' }],
    payments: [
      { id: 'sandbox', user_id: 'u1', status: 'sandbox', amount: 99, provider: 'revenuecat' },
      { id: 'trial', user_id: 'u1', status: 'trial', amount: 0, provider: 'revenuecat' },
    ],
  });

  assert.equal(metrics.money.customerGross, 0);
  assert.equal(metrics.money.transactions, 0);
});

test('missing RevenueCat financial percentages never imply full proceeds', () => {
  const metrics = buildOwnerMetrics({
    now,
    users: [{ id: 'u1', plan: 'premium_monthly' }],
    payments: [{
      id: 'apple-without-financials',
      user_id: 'u1',
      status: 'completed',
      amount: 19.99,
      provider: 'revenuecat',
      payment_date: '2026-08-03T12:00:00.000Z',
      metadata: {
        provider: 'revenuecat',
        tax_percentage: null,
        commission_percentage: null,
      },
    }],
  });

  assert.equal(metrics.money.apple.gross, 19.99);
  assert.equal(metrics.money.apple.estimatedProceeds, 0);
  assert.equal(metrics.money.apple.proceedsCoverage, 0);
  assert.equal(metrics.money.apple.source, 'setup');
});

test('legacy zero-dollar or unknown-provider records do not inflate transaction counts', () => {
  const metrics = buildOwnerMetrics({
    now,
    users: [{ id: 'u1', plan: 'free' }],
    payments: [
      { id: 'legacy', user_id: 'u1', status: 'completed', amount: 0 },
      { id: 'manual', user_id: 'u1', status: 'completed', amount: 25, provider: 'manual' },
      { id: 'stripe', user_id: 'u1', status: 'completed', amount: 19.99, provider: 'stripe' },
    ],
  });

  assert.equal(metrics.money.transactions, 1);
  assert.equal(metrics.money.customerGross, 19.99);
});
