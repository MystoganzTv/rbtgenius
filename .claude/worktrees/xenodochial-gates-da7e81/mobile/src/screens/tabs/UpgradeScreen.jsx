import { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';

import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

// RevenueCat — importado dinámicamente para no romper el build
// si el módulo no está instalado todavía
let rcAvailable = false;
let getOfferings, purchasePackage, restorePurchases;
try {
  const rc = require('../../services/RevenueCatService');
  getOfferings     = rc.getOfferings;
  purchasePackage  = rc.purchasePackage;
  restorePurchases = rc.restorePurchases;
  rcAvailable = true;
} catch {
  rcAvailable = false;
}

const API_BASE = 'https://rbtgenius.com';

const FALLBACK_PLANS = [
  { id: 'premium_monthly', name: 'Monthly',  price: '$19.99',  period: '/month', badge: null,       description: 'Billed monthly — cancel anytime' },
  { id: 'premium_yearly',  name: 'Yearly',   price: '$215.89', period: '/year',  badge: 'Save 10%', description: 'Best value — ~$18/mo billed annually' },
];

const FREE_FEATURES = [
  '15 practice questions per day',
  '15 flashcards per session',
  '5 AI tutor messages per day',
  'Basic progress tracking',
];

const PRO_FEATURES = [
  'Unlimited practice questions',
  'Unlimited flashcard sessions',
  '150 AI tutor messages per day',
  'Full 85-question mock exams',
  'Readiness score & analytics',
  'Domain performance breakdown',
];

export default function UpgradeScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user, token } = useAuth();
  const s = styles(theme);

  const [selectedPlanId, setSelectedPlanId] = useState('premium_yearly');
  const [loading, setLoading] = useState(false);
  const [offering, setOffering] = useState(null); // RevenueCat offering

  // Intenta cargar productos de RevenueCat
  useEffect(() => {
    if (!rcAvailable) return;
    getOfferings().then(o => { if (o) setOffering(o); }).catch(() => {});
  }, []);

  // Determina si usamos RC o fallback Stripe
  const useRC = rcAvailable && offering !== null;

  // Planes a mostrar
  const plans = useRC
    ? (offering?.availablePackages ?? []).map(pkg => ({
        id: pkg.identifier,
        name: pkg.packageType === 'MONTHLY' ? 'Monthly' : 'Yearly',
        price: pkg.product.priceString,
        period: pkg.packageType === 'MONTHLY' ? '/month' : '/year',
        badge: pkg.packageType === 'ANNUAL' ? 'Save 10%' : null,
        description: pkg.packageType === 'MONTHLY' ? 'Billed monthly — cancel anytime' : 'Best value — billed annually',
        _pkg: pkg,
      }))
    : FALLBACK_PLANS;

  const handleUpgrade = async () => {
    if (!token) { Alert.alert('Not signed in', 'Please sign in to upgrade.'); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (useRC) {
        // ── Compra nativa con RevenueCat (StoreKit) ──
        const selectedPkg = plans.find(p => p.id === selectedPlanId)?._pkg;
        if (!selectedPkg) { Alert.alert('Error', 'Plan not found.'); return; }
        const result = await purchasePackage(selectedPkg);
        if (result.cancelled) return;
        if (result.success) {
          Alert.alert('🎉 Welcome to Pro!', 'Your subscription is now active.');
          navigation.goBack?.();
        } else {
          Alert.alert('Error', result.error ?? 'Purchase failed. Try again.');
        }
      } else {
        // ── Fallback: abre checkout Stripe en browser ──
        const res = await fetch(`${API_BASE}/api/billing/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: selectedPlanId }),
        });
        const data = await res.json();
        if (data.url) {
          await Linking.openURL(data.url);
        } else {
          Alert.alert('Error', 'Could not start checkout. Please try again.');
        }
      }
    } catch {
      Alert.alert('Error', 'Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (useRC) {
      setLoading(true);
      const isPro = await restorePurchases().catch(() => false);
      setLoading(false);
      if (isPro) {
        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
        navigation.goBack?.();
      } else {
        Alert.alert('No subscription found', 'No active subscription found for this Apple ID.');
      }
    } else {
      Linking.openURL(`${API_BASE}/pricing`);
    }
  };

  const isPro = user?.plan === 'premium' || user?.plan === 'premium_monthly' || user?.plan === 'premium_yearly';
  const selectedPlan = plans.find(p => p.id === selectedPlanId) ?? plans[0];

  if (isPro) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          {navigation.canGoBack() && (
            <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
              <Text style={s.backBtnText}>← Back</Text>
            </Pressable>
          )}
          <Text style={s.screenTitle}>You're Pro</Text>
          <Text style={s.screenSub}>All features are unlocked</Text>
        </View>
        <View style={s.proAlready}>
          <Text style={s.proAlreadyEmoji}>🎉</Text>
          <Text style={s.proAlreadyTitle}>All set!</Text>
          <Text style={s.proAlreadySub}>
            You have full access to mock exams, analytics, unlimited practice, and the AI tutor.
          </Text>
          <Pressable style={s.manageBtn} onPress={() => Linking.openURL(`${API_BASE}/profile`)}>
            <Text style={s.manageBtnText}>Manage Subscription</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        {navigation.canGoBack() && (
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Text style={s.backBtnText}>← Back</Text>
          </Pressable>
        )}
        <Text style={s.screenTitle}>Upgrade to Pro</Text>
        <Text style={s.screenSub}>Unlock your full exam prep</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.heroCard}>
          <View style={s.crownWrap}>
            <Text style={s.crownEmoji}>👑</Text>
          </View>
          <Text style={s.heroTitle}>Everything you need to pass.</Text>
          <Text style={s.heroSub}>
            Upgrade to Pro and get unlimited access to all 1,100+ questions,
            mock exams, analytics, and AI coaching.
          </Text>
        </View>

        {/* Feature comparison */}
        <View style={s.compCard}>
          <View style={s.compCol}>
            <Text style={s.compHeader}>Free</Text>
            {FREE_FEATURES.map((f) => (
              <View key={f} style={s.compRow}>
                <Text style={s.compIcon}>○</Text>
                <Text style={s.compText}>{f}</Text>
              </View>
            ))}
          </View>
          <View style={[s.compDivider, { backgroundColor: alpha(theme.border, 0.8) }]} />
          <View style={s.compCol}>
            <Text style={[s.compHeader, { color: theme.gold }]}>Pro ✦</Text>
            {PRO_FEATURES.map((f) => (
              <View key={f} style={s.compRow}>
                <Text style={[s.compIcon, { color: theme.success }]}>✓</Text>
                <Text style={[s.compText, { color: theme.text, fontWeight: '600' }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Plan selector */}
        <Text style={s.planSectionLabel}>Choose a plan</Text>
        <View style={s.planRow}>
          {plans.map((plan) => {
            const selected = selectedPlanId === plan.id;
            return (
              <Pressable
                key={plan.id}
                style={[
                  s.planCard,
                  selected && { borderColor: theme.primary, backgroundColor: alpha(theme.primary, 0.07) },
                ]}
                onPress={() => {
                  setSelectedPlanId(plan.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                {plan.badge && (
                  <View style={s.planBadge}>
                    <Text style={s.planBadgeText}>{plan.badge}</Text>
                  </View>
                )}
                <View style={[s.planRadio, selected && { borderColor: theme.primary }]}>
                  {selected && <View style={[s.planRadioDot, { backgroundColor: theme.primary }]} />}
                </View>
                <Text style={[s.planName, selected && { color: theme.primary }]}>{plan.name}</Text>
                <Text style={s.planPrice}>
                  {plan.price}
                  <Text style={s.planPeriod}>{plan.period}</Text>
                </Text>
                <Text style={s.planDesc}>{plan.description}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          style={[s.upgradeBtn, loading && { opacity: 0.7 }]}
          onPress={handleUpgrade}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.upgradeBtnText}>
                Upgrade to Pro — {selectedPlan?.price}{selectedPlan?.period}
              </Text>
          }
        </Pressable>

        <Text style={s.secureNote}>
          {useRC ? '🔒  Native iOS purchase via App Store · Cancel anytime' : '🔒  Secure payment via Stripe · Cancel anytime'}
        </Text>

        {/* Restore */}
        <Pressable style={s.restoreBtn} onPress={handleRestore}>
          <Text style={s.restoreBtnText}>
            {useRC ? 'Restore previous purchase' : 'Already subscribed? Manage on rbtgenius.com'}
          </Text>
        </Pressable>

        <Text style={s.legalNote}>
          {useRC
            ? 'Subscription auto-renews until cancelled in App Store Settings. By subscribing you agree to our Terms of Service and Privacy Policy.'
            : 'Subscription auto-renews until cancelled. Manage your subscription at rbtgenius.com/profile. By upgrading you agree to our Terms of Service and Privacy Policy.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    topBar: {
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1,
    },
    backBtn: { marginBottom: 4 },
    backBtnText: { color: theme.primary, fontSize: 14, fontWeight: '600' },
    screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
    screenSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
    content: { padding: 20, gap: 16, paddingBottom: 48 },
    heroCard: {
      backgroundColor: alpha(theme.gold, 0.08), borderColor: alpha(theme.gold, 0.25),
      borderWidth: 1, borderRadius: 24, padding: 24, alignItems: 'center', gap: 10,
    },
    crownWrap: {
      width: 56, height: 56, borderRadius: 18, backgroundColor: alpha(theme.gold, 0.15),
      alignItems: 'center', justifyContent: 'center',
    },
    crownEmoji: { fontSize: 28 },
    heroTitle: { color: theme.text, fontSize: 20, fontWeight: '900', textAlign: 'center' },
    heroSub: { color: theme.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    compCard: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 22, padding: 18, flexDirection: 'row', gap: 0,
    },
    compCol: { flex: 1, gap: 10 },
    compDivider: { width: 1, marginHorizontal: 16 },
    compHeader: { color: theme.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
    compRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
    compIcon: { color: theme.muted, fontSize: 12, marginTop: 1 },
    compText: { color: theme.muted, fontSize: 12, lineHeight: 18, flex: 1 },
    planSectionLabel: { color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    planRow: { flexDirection: 'row', gap: 12 },
    planCard: {
      flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5,
      borderRadius: 20, padding: 16, gap: 6, position: 'relative',
    },
    planBadge: {
      position: 'absolute', top: -10, right: 12,
      backgroundColor: theme.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
    },
    planBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    planRadio: {
      width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: theme.muted,
      alignItems: 'center', justifyContent: 'center',
    },
    planRadioDot: { width: 9, height: 9, borderRadius: 5 },
    planName: { color: theme.text, fontSize: 15, fontWeight: '800' },
    planPrice: { color: theme.text, fontSize: 20, fontWeight: '900' },
    planPeriod: { fontSize: 12, fontWeight: '500', color: theme.muted },
    planDesc: { color: theme.muted, fontSize: 11, lineHeight: 16 },
    upgradeBtn: {
      backgroundColor: theme.primary, borderRadius: 18,
      paddingVertical: 18, alignItems: 'center',
      shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35, shadowRadius: 16,
    },
    upgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    secureNote: { color: theme.muted, fontSize: 12, textAlign: 'center' },
    restoreBtn: { alignItems: 'center', paddingVertical: 4 },
    restoreBtnText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
    legalNote: { color: theme.muted, fontSize: 11, textAlign: 'center', lineHeight: 17 },
    proAlready: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
    proAlreadyEmoji: { fontSize: 52 },
    proAlreadyTitle: { color: theme.text, fontSize: 26, fontWeight: '900' },
    proAlreadySub: { color: theme.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
    manageBtn: {
      backgroundColor: theme.primary, borderRadius: 16,
      paddingVertical: 14, paddingHorizontal: 28,
    },
    manageBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  });
