/**
 * RevenueCatService.js
 *
 * SETUP REQUERIDO (una sola vez):
 * 1. Crea cuenta en https://www.revenuecat.com (plan gratuito hasta $2.5k MRR)
 * 2. En RevenueCat dashboard → New Project → iOS → "com.rbtgenius.app"
 * 3. En App Store Connect → crea los productos In-App Purchase:
 *      - com.rbtgenius.monthly  → $19.99/mes,  tipo Auto-Renewable Subscription
 *      - com.rbtgenius.yearly   → $215.89/año, tipo Auto-Renewable Subscription
 * 4. En RevenueCat → Products → agrega los dos productos
 * 5. En RevenueCat → Offerings → crea "default" con un Package "pro"
 *    y asígnale ambos productos
 * 6. Copia tu API Key pública de iOS desde RevenueCat → API Keys
 *    y pégala en REVENUECAT_API_KEY abajo
 * 7. En tu terminal (mobile/): npx expo install react-native-purchases
 *
 * SIN estos pasos el módulo no funcionará — las compras nativas
 * requieren productos registrados en App Store Connect.
 */

import Purchases, { LOG_LEVEL } from 'react-native-purchases';

// ← Pega aquí tu API Key pública de iOS de RevenueCat
const REVENUECAT_API_KEY = 'test_VmZJOLIZBusywtVqSStncuBZEFi';

export async function initRevenueCat(userId) {
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  await Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  if (userId) {
    try {
      await Purchases.logIn(userId);
    } catch {}
  }
}

/**
 * Retorna el offering "default" con sus packages.
 * Cada package tiene .product.priceString, .packageType ('MONTHLY' | 'ANNUAL')
 */
export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch (e) {
    console.warn('[RevenueCat] getOfferings error:', e);
    return null;
  }
}

/**
 * Compra un Package. Retorna { success, customerInfo, error? }
 */
export async function purchasePackage(pkg) {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPro = customerInfo.entitlements.active['pro'] !== undefined;
    return { success: isPro, customerInfo };
  } catch (e) {
    if (e.userCancelled) return { success: false, cancelled: true };
    return { success: false, error: e.message };
  }
}

/**
 * Restaura compras anteriores. Retorna isPro boolean.
 */
export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}

/**
 * Chequea si el usuario actual tiene entitlement "pro" activo.
 */
export async function checkProStatus() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['pro'] !== undefined;
  } catch {
    return false;
  }
}
