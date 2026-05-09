import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const REVENUECAT_API_KEY = 'appl_fKgYufvLyPKZGTjOdEoAtsNwjnU';

export async function initRevenueCat(userId) {
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  if (userId) { try { await Purchases.logIn(userId); } catch {} }
}
export async function getOfferings() {
  try { const o = await Purchases.getOfferings(); return o.current ?? null; }
  catch (e) { console.warn('[RC]', e); return null; }
}
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: customerInfo.entitlements.active['pro'] !== undefined, customerInfo };
  } catch (e) {
    if (e.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e.message };
  }
}
export async function restorePurchases() {
  try { const ci = await Purchases.restorePurchases(); return ci.entitlements.active['pro'] !== undefined; }
  catch { return false; }
}
export async function checkProStatus() {
  try { const ci = await Purchases.getCustomerInfo(); return ci.entitlements.active['pro'] !== undefined; }
  catch { return false; }
}
