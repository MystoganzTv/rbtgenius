import { useState, useEffect, useRef } from 'react';
import {
  Animated, ActivityIndicator, Linking, Pressable,
  ScrollView, StyleSheet, Text, View, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

let rcAvailable = false, getOfferings, purchasePackage, restorePurchases;
try {
  const rc = require('../../services/RevenueCatService');
  getOfferings = rc.getOfferings; purchasePackage = rc.purchasePackage;
  restorePurchases = rc.restorePurchases; rcAvailable = true;
} catch { rcAvailable = false; }

const API_BASE = 'https://www.rbtgenius.com';

const FEATURES = [
  { icon: '∞',  label: 'Unlimited practice questions', sub: 'No daily cap — study as much as you want' },
  { icon: '🃏', label: 'Unlimited flashcard sessions',  sub: 'All topics, all difficulty levels' },
  { icon: '📋', label: 'Full 85-question mock exams',  sub: 'Simulate the real BACB RBT exam' },
  { icon: '📊', label: 'Advanced analytics',            sub: 'Domain mastery, exam history & weekly trends' },
];

const FALLBACK = [
  { id: 'premium_monthly', label: 'Monthly', price: '$19.99', period: '/mo', badge: null,         savings: null,       desc: 'Cancel anytime' },
  { id: 'premium_yearly',  label: 'Yearly',  price: '$17.99', period: '/mo', badge: 'BEST VALUE', savings: 'Save 10%', desc: 'Billed $215.89/year' },
];

export default function UpgradeScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme  = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user, token } = useAuth();
  const s = styles(theme);
  const [planId,   setPlanId]   = useState('premium_yearly');
  const [loading,  setLoading]  = useState(false);
  const [offering, setOffering] = useState(null);
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    if (rcAvailable) getOfferings().then(o => o && setOffering(o)).catch(() => {});
  }, []);

  const useRC = rcAvailable && offering !== null;
  const plans = useRC
    ? (offering?.availablePackages ?? []).map(pkg => ({
        id: pkg.identifier, label: pkg.packageType === 'MONTHLY' ? 'Monthly' : 'Yearly',
        price: pkg.product.priceString, period: '/mo',
        badge: pkg.packageType !== 'MONTHLY' ? 'BEST VALUE' : null,
        savings: pkg.packageType !== 'MONTHLY' ? 'Save 10%' : null,
        desc: pkg.packageType === 'MONTHLY' ? 'Cancel anytime' : `Billed ${pkg.product.priceString}/year`,
        _pkg: pkg,
      }))
    : FALLBACK;
  const sel = plans.find(p => p.id === planId) ?? plans[plans.length - 1];

  const handleUpgrade = async () => {
    if (!token) { Alert.alert('Not signed in', 'Sign in first to upgrade.'); return; }
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      if (useRC) {
        const pkg = plans.find(p => p.id === planId)?._pkg;
        if (!pkg) { Alert.alert('Error', 'Plan not found.'); return; }
        const r = await purchasePackage(pkg);
        if (r.cancelled) return;
        if (r.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('🎉 Welcome to Pro!', 'All features unlocked. Good luck on your exam!');
          navigation.goBack?.();
        } else Alert.alert('Error', r.error ?? 'Purchase failed. Try again.');
      } else {
        const res  = await fetch(`${API_BASE}/api/billing/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: planId }),
        });
        const data = await res.json();
        if (data.url) await Linking.openURL(data.url);
        else Alert.alert('Error', 'Could not start checkout. Try again.');
      }
    } catch { Alert.alert('Error', 'Network error. Check your connection.'); }
    finally  { setLoading(false); }
  };

  const handleRestore = async () => {
    if (!useRC) { Linking.openURL(`${API_BASE}/pricing`); return; }
    setLoading(true);
    const ok = await restorePurchases().catch(() => false);
    setLoading(false);
    if (ok) { Alert.alert('Restored!', 'Pro subscription restored.'); navigation.goBack?.(); }
    else Alert.alert('Nothing found', 'No active subscription found for this Apple ID.');
  };

  const isPro = ['premium','premium_monthly','premium_yearly'].includes(user?.plan);
  if (isPro) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.proWrap}>
        <Text style={s.proEmoji}>🎉</Text>
        <Text style={s.proTitle}>You're Pro!</Text>
        <Text style={s.proSub}>All premium study features unlocked. Go study!</Text>
        <Pressable style={s.manageBtn} onPress={() => Linking.openURL(`${API_BASE}/profile`)}>
          <Text style={s.manageTxt}>Manage Subscription</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top','bottom']}>
      {navigation.canGoBack() && (
        <Pressable onPress={() => navigation.goBack()} style={s.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={s.closeTxt}>✕</Text>
        </Pressable>
      )}
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>

        {/* Hero */}
        <Animated.View style={[s.hero, { opacity: fade, transform: [{ translateY: slide }] }]}>
          <View style={s.crown}><Text style={s.crownEmoji}>👑</Text></View>
          <Text style={s.heroTitle}>RBT Genius Pro</Text>
          <Text style={s.heroSub}>Everything you need to pass the{'\n'}BACB RBT exam — no limits.</Text>
          <View style={s.proof}><Text style={s.proofTxt}>⭐ Trusted by 2,000+ RBT students</Text></View>
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
            const active = planId === plan.id;
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

        {/* CTA */}
        <Pressable style={[s.cta, loading && { opacity: 0.72 }]} onPress={handleUpgrade} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Text style={s.ctaTxt}>Start Pro — {sel?.price}{sel?.period}</Text>
                <Text style={s.ctaSub}>{sel?.desc}</Text>
              </>}
        </Pressable>

        {/* Trust + restore */}
        <View style={s.trust}>
          <Text style={s.trustTxt}>🔒 Secure</Text>
          <Text style={s.trustDot}>·</Text>
          <Text style={s.trustTxt}>Cancel anytime</Text>
          <Text style={s.trustDot}>·</Text>
          <Text style={s.trustTxt}>Instant access</Text>
        </View>
        <Pressable onPress={handleRestore} style={s.restore}>
          <Text style={s.restoreTxt}>Restore previous purchase</Text>
        </Pressable>
        <Text style={s.legal}>
          {useRC
            ? 'Payment charged to Apple ID at confirmation. Subscription auto-renews unless cancelled 24h before period end. Manage in App Store Settings.'
            : 'By subscribing you agree to our Terms of Service and Privacy Policy. Manage at rbtgenius.com/profile.'}
        </Text>
      </ScrollView>
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

  cta:         { marginHorizontal: 16, borderRadius: 20, paddingVertical: 20, alignItems: 'center', gap: 3, backgroundColor: theme.primary, shadowColor: theme.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.38, shadowRadius: 20 },
  ctaTxt:      { color: '#fff', fontSize: 17, fontWeight: '900' },
  ctaSub:      { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

  trust:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  trustTxt:    { color: theme.muted, fontSize: 12, fontWeight: '600' },
  trustDot:    { color: theme.muted, fontSize: 12 },
  restore:     { alignItems: 'center', paddingVertical: 2 },
  restoreTxt:  { color: theme.primary, fontSize: 13, fontWeight: '600' },
  legal:       { color: theme.muted, fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: 28 },

  proWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  proEmoji:    { fontSize: 64 },
  proTitle:    { color: theme.text, fontSize: 28, fontWeight: '900' },
  proSub:      { color: theme.muted, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  manageBtn:   { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 },
  manageTxt:   { color: '#fff', fontSize: 15, fontWeight: '800' },
});
