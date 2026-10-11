import { reconcileStripeFeesWith } from '../../server/lib/stripe-fees.js';
import * as db from './db.js';

/**
 * Production binding of the Stripe fee reconciliation against Supabase.
 * Never throws: the owner metrics stay honest (payments simply remain
 * "gross only") if Stripe or the database is unreachable.
 */
export async function reconcileStripeFees({ limit = 10, paymentIds = null } = {}) {
  return reconcileStripeFeesWith({
    limit,
    paymentIds,
    loadPayments: () => paymentIds ? db.getPaymentsByIds(paymentIds) : db.getAllPayments(),
    saveFees: (paymentId, fees) => db.saveStripePaymentFees(paymentId, fees),
  });
}
