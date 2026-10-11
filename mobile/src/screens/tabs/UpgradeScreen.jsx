import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Animated, ActivityIndicator, Linking, Pressable,
  ScrollView, StyleSheet, Text, View, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { CommonActions } from '@react-navigation/native';
import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import {
  WEB_BILLING_ENABLED,
  startCheckout,
  openManageSubscription,
  openPricingPage,
  parseBillingReturn,
  confirmCheckoutSession,
} from '../../lib/webBilling';

// API propia (no es pago): sincroniza la entitlement de RevenueCat con el
// backend. No confundir con los endpoints de billing web, que viven en
// webBilling.js y no existen en el bundle de iOS.
const API_BASE = 'https://www.rbtgenius.com';

let rcAvailable = false, getOfferings, getTrialEligibility, purchasePackage, restorePurchases;
try {
  const rc = require('../../services/RevenueCatService');
  getOfferings = rc.getOfferings; purchasePackage = rc.purchasePackage;
  getTrialEligibility = rc.getTrialEligibility;
  restorePurchases = rc.restorePurchases; rcAvailable = true;
} catch { rcAvailable = false; }


function hasSevenDayFreeTrial(product) {
  const intro = product?.introPrice;
  if (!intro || Number(intro.price) !== 0) return false;

  return intro.period === 'P1W' || (
    intro.periodUnit === 'WEEK'
    && Number(intro.periodNumberOfUnits) === 1
    && Number(intro.cycles) === 1
  );
}


export default function UpgradeScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme  = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user, token, refreshSession } = useAuth();
  const { t } = useTranslation();
  const s = styles(theme);

  const FEATURES = [
    { icon: '∞',  label: t('upgrade.feat_1_label'), sub: t('upgrade.feat_1_sub') },
    { icon: '🃏', label: t('upgrade.feat_2_label'), sub: t('upgrade.feat_2_sub') },
    { icon: '📋', label: t('upgrade.feat_3_label'), sub: t('upgrade.feat_3_sub') },
  ];

  const FALLBACK = [
    { id: 'premium_monthly', label: t('upgrade.monthly'), price: '$19.99', period: '/mo', badge: t('upgrade.recommended'), savings: null,              desc: t('upgrade.cancel_anytime'), isMonthly: true },
    { id: 'premium_yearly',  label: t('upgrade.yearly'),  price: '$99.99', period: '/yr', badge: null,                     savings: t('upgrade.save_58'), desc: t('upgrade.equiv_monthly', { price: '$8.33' }), isMonthly: false },
  ];
  const [planId,          setPlanId]          = useState('premium_monthly');
  const [loading,         setLoading]         = useState(false);
  const [accessPending, setAccessPending] = useState(false);
  const [offering,        setOffering]        = useState(null);
  const [trialEligibility, setTrialEligibility] = useState({});
  const [offeringsLoading, setOfferingsLoading] = useState(rcAvailable);
  const [offeringsFailed, setOfferingsFailed] = useState(!rcAvailable);
  const [offeringsAttempt, setOfferingsAttempt] = useState(0);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const handlingReturnRef = useRef(false);

  // Fetch offerings with retry (up to 3 attempts, 2s apart)
  useEffect(() => {
    if (!rcAvailable) return;
    let cancelled = false;
    setOfferingsLoading(true);
    setOfferingsFailed(false);

    const fetchWithRetry = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const o = await getOfferings();
          if (cancelled) return;
          if (o && (o.availablePackages?.length ?? 0) > 0) {
            const trialProductIds = o.availablePackages
              .filter(pkg => hasSevenDayFreeTrial(pkg.product))
              .map(pkg => pkg.product.identifier);
            const eligibility = trialProductIds.length > 0
              ? await getTrialEligibility(trialProductIds)
              : {};
            if (cancelled) return;
            setOffering(o);
            setTrialEligibility(eligibility);
            setOfferingsLoading(false);
            return;
          }
        } catch { /* retry */ }
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
      }
      if (!cancelled) {
        setOfferingsLoading(false);
        setOfferingsFailed(true);
      }
    };

    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();

    fetchWithRetry();
    return () => { cancelled = true; };
  }, [offeringsAttempt]);

  const useRC = rcAvailable && !offeringsLoading && offering !== null;
  const plans = useRC
    ? (offering?.availablePackages ?? []).map(pkg => {
        const monthly = pkg.packageType === 'MONTHLY';
        // Precio REAL cobrado, con su período correcto (Apple 3.1.2(c)).
        const currency = pkg.product.priceString.replace(/[\d.,\s]/g, '') || '$';
        const perMonth = `${currency}${(pkg.product.price / 12).toFixed(2)}`;
        const hasTrial = (
          monthly
          && hasSevenDayFreeTrial(pkg.product)
          && trialEligibility[pkg.product.identifier] === true
        );
        return {
          id: pkg.identifier,
          label: monthly ? t('upgrade.monthly') : t('upgrade.yearly'),
          price: pkg.product.priceString, period: monthly ? '/mo' : '/yr',
          badge: hasTrial
            ? t('upgrade.trial_badge')
            : monthly
              ? t('upgrade.recommended')
              : null,
          savings: !monthly ? t('upgrade.save_58') : null,
          desc: hasTrial
            ? t('upgrade.trial_then_price', {
                price: pkg.product.priceString,
                period: monthly ? '/mo' : '/yr',
              })
            : monthly
              ? t('upgrade.cancel_anytime')
              : t('upgrade.equiv_monthly', { price: perMonth }),
          isMonthly: monthly,
          hasTrial,
          _pkg: pkg,
        };
      })
    : FALLBACK;
  const defaultPlan = plans.find(p => p.isMonthly) ?? plans[0];
  const selectedPlanId = plans.some(p => p.id === planId) ? planId : defaultPlan?.id;
  const sel = plans.find(p => p.id === selectedPlanId) ?? defaultPlan;

  const handleBillingReturn = useCallback(async (incomingUrl) => {
    const ret = parseBillingReturn(incomingUrl);
    if (!ret) return false;

    if (ret.kind === 'portal-return') {
      setLoading(false);
      await refreshSession?.().catch(() => null);
      navigation.goBack?.();
      return true;
    }

    if (ret.kind === 'cancelled') {
      setLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(t('upgrade.checkout_canceled'), t('upgrade.checkout_canceled_body'));
      navigation.goBack?.();
      return true;
    }

    if (handlingReturnRef.current) return true;
    handlingReturnRef.current = true;
    setLoading(true);
    try {
      await confirmCheckoutSession({ token, sessionId: ret.sessionId });
      await refreshSession?.().catch(() => null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('upgrade.welcome_pro'), t('upgrade.subscription_active'));
      navigation.goBack?.();
    } catch (error) {
      Alert.alert(t('common.error'), error?.message || t('upgrade.error'));
    } finally {
      handlingReturnRef.current = false;
      setLoading(false);
    }
    return true;
  }, [navigation, refreshSession, token, t]);

  useEffect(() => {
    // Solo Android/web vuelven de un checkout alojado. En iOS no existe flujo
    // de pago externo, asi que no se registra ningun handler de deep link.
    if (!WEB_BILLING_ENABLED) return undefined;

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleBillingReturn(url).catch(() => {});
    });

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleBillingReturn(initialUrl).catch(() => {});
      }
    }).catch(() => {});

    return () => subscription.remove();
  }, [handleBillingReturn]);

  const handleManageSubscription = async () => {
    // iOS: ajustes de suscripcion de Apple (es lo que dice la ficha del App
    // Store). Android/web: portal de facturacion self-serve.
    if (!WEB_BILLING_ENABLED) {
      await openManageSubscription().catch(() => {
        Alert.alert(t('common.error'), t('upgrade.error'));
      });
      return;
    }

    if (!token) return;

    setLoading(true);
    try {
      const opened = await openManageSubscription({ token });
      if (!opened) {
        Alert.alert(t('common.error'), t('upgrade.error'));
        setLoading(false);
      }
    } catch {
      setLoading(false);
      Alert.alert(t('common.error'), t('common.network_error'));
    }
  };

  // Tell the backend to re-check RevenueCat and flip the plan to premium
  // synchronously (the webhook is async and may lag). Then refresh the session
  // so gated features unlock immediately.
  const syncRevenueCatPlan = useCallback(async (requirePremium = false) => {
    if (!token) throw new Error('Not signed in');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${API_BASE}/api/billing/revenuecat-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Subscription sync failed');
      const access = await response.json();
      if (requirePremium && access.is_premium !== true) throw new Error('Subscription is still pending');
      const refreshedUser = await refreshSession?.({ signal: controller.signal });
      if (requirePremium && !refreshedUser?.isPremium) throw new Error('Account refresh failed');
    } finally {
      clearTimeout(timeout);
    }
  }, [token, refreshSession]);

  const showPendingAccess = () => {
    setAccessPending(true);
    Alert.alert(t('upgrade.sync_pending_title'), t('upgrade.sync_pending_body'));
  };

  const handleRetryAccess = async () => {
    setLoading(true);
    try {
      await syncRevenueCatPlan(true);
      setAccessPending(false);
      Alert.alert(t('upgrade.welcome_pro'), t('upgrade.subscription_active'));
      navigation.goBack?.();
    } catch { showPendingAccess(); }
    finally { setLoading(false); }
  };

  // On open, if the user already has an active RevenueCat entitlement but the
  // backend doesn't know yet (e.g. purchased on another device / before sync),
  // reconcile so the paywall flips to the "You're Pro" state automatically.
  useEffect(() => {
    if (!rcAvailable || !token || user?.isPremium) return;
    syncRevenueCatPlan().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpgrade = async () => {
    if (!token) { Alert.alert(t('upgrade.not_signed_in'), t('upgrade.sign_in_first')); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (useRC) {
        const pkg = plans.find(p => p.id === selectedPlanId)?._pkg;
        if (!pkg) { Alert.alert(t('common.error'), t('upgrade.error')); return; }
        const r = await purchasePackage(pkg);
        // No cerrar el paywall en cancelación: tras el modal de login de Apple,
        // StoreKit suele reportar el primer intento como "userCancelled" aunque
        // el usuario sí quería comprar. Nos quedamos para que pueda reintentar.
        if (r.cancelled) { return; }
        if (r.success) {
          try { await syncRevenueCatPlan(true); }
          catch { showPendingAccess(); return; }
          setAccessPending(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            sel?.hasTrial ? t('upgrade.trial_welcome') : t('upgrade.welcome_pro'),
            sel?.hasTrial ? t('upgrade.trial_started') : t('upgrade.features_unlocked'),
          );
          navigation.goBack?.();
        } else Alert.alert(t('common.error'), r.error ?? t('upgrade.purchase_failed'));
      } else if (WEB_BILLING_ENABLED) {
        const opened = await startCheckout({ token, plan: selectedPlanId });
        if (!opened) Alert.alert(t('common.error'), t('upgrade.error'));
      } else {
        // iOS con StoreKit no disponible: mostrar el error y dejar reintentar.
        // Nunca sacar la compra fuera de In-App Purchase.
        Alert.alert(t('upgrade.unavailable_title'), t('upgrade.unavailable'));
      }
    } catch { Alert.alert(t('common.error'), t('common.network_error')); }
    finally  { setLoading(false); }
  };

  const handleRestore = async () => {
    // Restoring existing purchases does not require a loaded product catalog.
    if (!rcAvailable) {
      if (WEB_BILLING_ENABLED) { void openPricingPage(); return; }
      Alert.alert(t('upgrade.unavailable_title'), t('upgrade.unavailable'));
      return;
    }
    setLoading(true);
    try {
      const ok = await restorePurchases();
      if (ok) {
        try { await syncRevenueCatPlan(true); }
        catch { showPendingAccess(); return; }
        setAccessPending(false);
        Alert.alert(t('upgrade.restored'), t('upgrade.pro_restored'));
        navigation.goBack?.();
      } else Alert.alert(t('upgrade.nothing_found'), t('upgrade.no_subscription'));
    } catch {
      Alert.alert(t('upgrade.unavailable_title'), t('upgrade.restore_failed'));
    } finally { setLoading(false); }
  };

  // Resetea el stack del tab More a MoreHome y elimina Upgrade de la pila.
  // Evita que al volver al tab More reaparezca el paywall.
  const closeScreen = useCallback(() => {
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'MoreHome' }] }),
    );
  }, [navigation]);

  const isPro = user?.isPremium ?? false;
  if (isPro) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Pressable onPress={closeScreen} style={s.closeBtn}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={s.closeTxt}>✕</Text>
      </Pressable>
      <ScrollView contentContainerStyle={s.proWrap}>
        <Text style={s.proEmoji}>🎉</Text>
        <Text style={s.proTitle}>{t('upgrade.pro_you_are')}</Text>
        <Text style={s.proSub}>{t('upgrade.pro_sub')}</Text>
        <Pressable style={s.manageBtn} onPress={handleManageSubscription}>
          <Text style={s.manageTxt}>{t('upgrade.manage_subscription')}</Text>
        </Pressable>
        <Pressable onPress={handleRestore} style={s.restore} disabled={loading}>
          {loading
            ? <ActivityIndicator color={theme.primary} />
            : <Text style={s.restoreTxt}>{t('upgrade.restore')}</Text>}
        </Pressable>
        {accessPending && <Pressable onPress={handleRetryAccess} disabled={loading} style={s.restore}>
          <Text style={s.restoreTxt}>{t('upgrade.retry_access')}</Text>
        </Pressable>}
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top','bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero */}
        <Animated.View style={[s.hero, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <View style={s.crown}><Text style={s.crownEmoji}>👑</Text></View>
          <Text style={s.heroTitle}>{t('upgrade.hero_title')}</Text>
          <Text style={s.heroSub}>{t('upgrade.hero_sub')}</Text>
          <View style={s.proof}><Text style={s.proofTxt}>{t('upgrade.proof')}</Text></View>
        </Animated.View>

        {/* Features */}
        <View style={s.card}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[s.fRow, i < FEATURES.length - 1 && s.fBorder]}>
              <View style={s.fIcon}><Text style={s.fIconTxt}>{f.icon}</Text></View>
              <View style={s.fCopy}>
                <Text style={s.fLabel}>{f.label}</Text>
                <Text style={s.fSub}>{f.sub}</Text>
              </View>
              <Text style={s.check}>✓</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={s.planRow}>
          {plans.map(plan => {
            const active = selectedPlanId === plan.id;
            return (
              <Pressable key={plan.id}
                style={[s.plan, active && s.planActive]}
                onPress={() => { setPlanId(plan.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}>
                {plan.badge && (
                  <View style={s.planBadge}><Text style={s.planBadgeTxt}>{plan.badge}</Text></View>
                )}
                <Text style={[s.planLabel, plan.badge && { marginTop: 20 }, active && { color: theme.primary }]}>
                  {plan.label}
                </Text>
                <Text style={[s.planPrice, active && { color: theme.primary }]}>{plan.price}</Text>
                <Text style={[s.planPeriod, active && { color: theme.primary }]}>{plan.period}</Text>
                {plan.savings && (
                  <View style={s.savePill}><Text style={s.saveTxt}>{plan.savings}</Text></View>
                )}
                <Text style={s.planDesc}>{plan.desc}</Text>
                {active && <View style={s.activeDot} />}
              </Pressable>
            );
          })}
        </View>

        {/* Offerings unavailable banner */}
        {offeringsFailed && !useRC && (
          <View style={s.unavailableBanner}>
            <Text style={s.unavailableTxt}>{t('upgrade.unavailable')}</Text>
            {rcAvailable && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setOfferingsAttempt(attempt => attempt + 1)}
                style={s.restore}>
                <Text style={s.restoreTxt}>{t('common.retry')}</Text>
              </Pressable>
            )}
          </View>
        )}

        {accessPending && <Text style={s.trustTxt}>{t('upgrade.sync_pending_body')}</Text>}

        {/* Retry an already purchased entitlement without purchasing again. */}
        <Pressable
          style={[s.cta, (loading || offeringsLoading) && { opacity: 0.72 }]}
          onPress={accessPending ? handleRetryAccess : handleUpgrade}
          disabled={loading || (!accessPending && (offeringsLoading || (!WEB_BILLING_ENABLED && !useRC)))}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : accessPending
              ? <Text style={s.ctaTxt}>{t('upgrade.retry_access')}</Text>
            : offeringsLoading
              ? <><Text style={s.ctaTxt}>{t('upgrade.products_loading')}</Text><ActivityIndicator color="rgba(255,255,255,0.7)" size="small" /></>
              : <>
                  <Text style={s.ctaTxt}>
                    {sel?.hasTrial
                      ? t('upgrade.trial_cta')
                      : t('upgrade.start_pro', { price: sel?.price, period: sel?.period })}
                  </Text>
                  <Text style={s.ctaSub}>{sel?.desc}</Text>
                </>}
        </Pressable>

        {/* Trust + restore */}
        <View style={s.trust}>
          <Text style={s.trustTxt}>🔒 {t('upgrade.cancel_anytime')}</Text>
          <Text style={s.trustDot}>·</Text>
          <Text style={s.trustTxt}>{t('upgrade.instant_access')}</Text>
        </View>
        <Pressable onPress={handleRestore} style={s.restore} disabled={loading}>
          <Text style={s.restoreTxt}>{t('upgrade.restore')}</Text>
        </Pressable>

        {/* Escape hatch — vuelve a MoreHome sin comprar */}
        <Pressable onPress={closeScreen} style={s.maybeLater}>
          <Text style={s.maybeLaterTxt}>{t('upgrade.maybe_later')}</Text>
        </Pressable>

        {/* Legal links — required by Apple 3.1.2 */}
        <View style={s.legalLinks}>
          <Text style={s.legalLinksTxt}>{t('upgrade.legal_links')} </Text>
          <Pressable onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
            <Text style={s.legalLink}>{t('upgrade.terms_link')}</Text>
          </Pressable>
          <Text style={s.legalLinksTxt}> {t('upgrade.and')} </Text>
          <Pressable onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
            <Text style={s.legalLink}>{t('upgrade.privacy_link')}</Text>
          </Pressable>
        </View>

        <Text style={s.legal}>
          {useRC && sel?.hasTrial
            ? t('upgrade.trial_legal_rc', { price: sel.price, period: sel.period })
            : useRC
              ? t('upgrade.legal_rc')
              : WEB_BILLING_ENABLED
                ? t('upgrade.legal_stripe')
                : t('upgrade.legal_rc')}
        </Text>
      </ScrollView>

      {/* Botón cerrar — renderizado DESPUÉS del ScrollView para que reciba los toques
          (si va antes, el ScrollView intercepta el tap y el ✕ queda muerto) */}
      <Pressable onPress={closeScreen} style={s.closeBtn}
        hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <Text style={s.closeTxt}>✕</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe:        { flex: 1, backgroundColor: theme.background },
  scroll:      { paddingBottom: 48, gap: 14 },
  closeBtn:    { position: 'absolute', top: 52, right: 18, zIndex: 20, width: 32, height: 32, borderRadius: 16, backgroundColor: alpha(theme.muted, 0.15), alignItems: 'center', justifyContent: 'center' },
  closeTxt:    { color: theme.muted, fontSize: 14, fontWeight: '700' },

  hero:        { alignItems: 'center', paddingTop: 60, paddingBottom: 28, paddingHorizontal: 24, gap: 10, backgroundColor: alpha(theme.primary, 0.04) },
  crown:       { width: 88, height: 88, borderRadius: 28, backgroundColor: alpha(theme.primary, 0.12), alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: alpha(theme.primary, 0.25), marginBottom: 4 },
  crownEmoji:  { fontSize: 42 },
  heroTitle:   { color: theme.text, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  heroSub:     { color: theme.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  proof:       { backgroundColor: alpha('#059669', 0.1), borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: alpha('#059669', 0.2) },
  proofTxt:    { color: '#059669', fontSize: 13, fontWeight: '700' },

  card:        { marginHorizontal: 16, backgroundColor: theme.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  fRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  fBorder:     { borderBottomWidth: 1, borderBottomColor: alpha(theme.border, 0.5) },
  fIcon:       { width: 42, height: 42, borderRadius: 13, backgroundColor: alpha(theme.primary, 0.1), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fIconTxt:    { fontSize: 20 },
  fCopy:       { flex: 1, gap: 2 },
  fLabel:      { color: theme.text, fontSize: 14, fontWeight: '700' },
  fSub:        { color: theme.muted, fontSize: 12, lineHeight: 16 },
  check:       { color: '#059669', fontSize: 17, fontWeight: '900' },

  planRow:     { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  plan:        { flex: 1, borderRadius: 20, borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.surface, padding: 14, alignItems: 'center', gap: 4, position: 'relative', overflow: 'hidden', minHeight: 148 },
  planActive:  { borderColor: theme.primary, backgroundColor: alpha(theme.primary, 0.05) },
  planBadge:   { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: theme.primary, paddingVertical: 4, alignItems: 'center' },
  planBadgeTxt:{ color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  planLabel:   { color: theme.muted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  planPrice:   { color: theme.text, fontSize: 28, fontWeight: '900', lineHeight: 32 },
  planPeriod:  { color: theme.muted, fontSize: 12, fontWeight: '600', marginTop: -2 },
  savePill:    { backgroundColor: alpha('#059669', 0.12), borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  saveTxt:     { color: '#059669', fontSize: 10, fontWeight: '800' },
  planDesc:    { color: theme.muted, fontSize: 10, textAlign: 'center', lineHeight: 13 },
  activeDot:   { position: 'absolute', bottom: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary },

  unavailableBanner: { marginHorizontal: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: alpha('#D97706', 0.1), borderWidth: 1, borderColor: alpha('#D97706', 0.25) },
  unavailableTxt: { color: '#D97706', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  cta:         { marginHorizontal: 16, borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 3, backgroundColor: theme.primary, shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 20 },
  ctaTxt:      { color: '#fff', fontSize: 17, fontWeight: '900' },
  ctaSub:      { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

  trust:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  trustTxt:    { color: theme.muted, fontSize: 12, fontWeight: '600' },
  trustDot:    { color: theme.muted, fontSize: 12 },
  restore:     { alignItems: 'center', paddingVertical: 2 },
  restoreTxt:  { color: theme.primary, fontSize: 13, fontWeight: '600' },
  maybeLater:  { alignItems: 'center', paddingVertical: 8 },
  maybeLaterTxt: { color: theme.muted, fontSize: 14, fontWeight: '700' },
  legalLinks:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  legalLinksTxt: { color: theme.muted, fontSize: 11 },
  legalLink:   { color: theme.primary, fontSize: 11, fontWeight: '600', textDecorationLine: 'underline' },
  legal:       { color: theme.muted, fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: 28 },

  proWrap:     { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  proEmoji:    { fontSize: 64 },
  proTitle:    { color: theme.text, fontSize: 28, fontWeight: '900' },
  proSub:      { color: theme.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  manageBtn:   { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 },
  manageTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },
});
