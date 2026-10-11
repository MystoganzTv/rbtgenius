import Purchases, { LOG_LEVEL } from 'react-native-purchases';

const REVENUECAT_API_KEY = 'appl_fKgYufvLyPKZGTjOdEoAtsNwjnU';
let isConfigured = false;
let currentAppUserId = null;
let requestedAppUserId = null;
let identityOperation = Promise.resolve();

export function initRevenueCat(userId) {
  requestedAppUserId = userId || null;
  // Serialize identity changes and do not allow a purchase while logIn is
  // pending. The server looks up this exact account ID to unlock access.
  identityOperation = identityOperation.catch(() => {}).then(async () => {
    if (!userId) throw new Error('Sign in before accessing purchases');
    if (currentAppUserId === userId) return;
    currentAppUserId = null;
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    if (!isConfigured) {
      await Purchases.configure({ apiKey: REVENUECAT_API_KEY, appUserID: userId });
      isConfigured = true;
    } else {
      await Purchases.logIn(userId);
    }
    currentAppUserId = userId;
  });
  return identityOperation;
}

export function resetRevenueCat() {
  requestedAppUserId = null;
  identityOperation = identityOperation.catch(() => {}).then(async () => {
    currentAppUserId = null;
    if (isConfigured) await Purchases.logOut();
  });
  return identityOperation;
}

async function ensureIdentified() {
  try { await identityOperation; }
  catch (error) {
    if (!requestedAppUserId) throw error;
    // A user-triggered retry may recover a failed login after reconnecting.
    await initRevenueCat(requestedAppUserId);
  }
  if (!currentAppUserId || currentAppUserId !== requestedAppUserId) {
    throw new Error('Purchase account is not ready. Please try again.');
  }
}

export async function getOfferings() {
  try { await ensureIdentified(); const o = await Purchases.getOfferings(); return o.current ?? null; }
  catch (e) { console.warn('[RC]', e); return null; }
}
export async function getTrialEligibility(productIdentifiers = []) {
  const identifiers = [...new Set(productIdentifiers.filter(Boolean))];
  if (identifiers.length === 0) return {};

  try {
    await ensureIdentified();
    const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(identifiers);
    const eligibleStatus =
      Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;

    return Object.fromEntries(
      identifiers.map(identifier => [
        identifier,
        eligibility?.[identifier]?.status === eligibleStatus,
      ]),
    );
  } catch (e) {
    // RevenueCat recommends showing standard terms when eligibility is unknown.
    console.warn('[RC trial eligibility]', e?.message || e);
    return Object.fromEntries(identifiers.map(identifier => [identifier, false]));
  }
}
export async function purchasePackage(pkg) {
  // Do not recover an identity failure with the previous user's entitlement.
  try { await ensureIdentified(); }
  catch (e) { return { success: false, error: e.message }; }
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return { success: customerInfo.entitlements.active['pro'] !== undefined, customerInfo };
  } catch (e) {
    console.warn('[RC purchase]', e.code, e.message, 'userCancelled:', e.userCancelled);
    if (e.userCancelled) return { success: false, cancelled: true };
    // The user may already own the subscription (e.g. sandbox "You're currently
    // subscribed", or PRODUCT_ALREADY_PURCHASED). That's not a failure — check
    // the current entitlement and treat an active 'pro' as success.
    try {
      const ci = await Purchases.getCustomerInfo();
      if (ci.entitlements.active['pro'] !== undefined) {
        return { success: true, customerInfo: ci, alreadyActive: true };
      }
    } catch { /* fall through */ }
    return { success: false, error: e.message };
  }
}
export async function restorePurchases() {
  await ensureIdentified();
  const ci = await Purchases.restorePurchases();
  return ci.entitlements.active['pro'] !== undefined;
}
export async function checkProStatus() {
  try { await ensureIdentified(); const ci = await Purchases.getCustomerInfo(); return ci.entitlements.active['pro'] !== undefined; }
  catch { return false; }
}
