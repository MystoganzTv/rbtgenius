import { useEffect, useState, useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { alpha, getTheme } from '../../theme';
import { Badge, MetricCard, ProgressBar, SectionTitle, toneColor } from '../../components/ui';
import { TOTAL_PRACTICE_QUESTIONS } from '../../services/questionService.js';

const API_BASE = 'https://www.rbtgenius.com';

const DOMAIN_KEYS = [
  { key: 'measurement',          accent: 'primary'  },
  { key: 'assessment',           accent: 'gold'     },
  { key: 'skill_acquisition',    accent: 'success'  },
  { key: 'behavior_reduction',   accent: 'primary'  },
  { key: 'documentation',        accent: 'gold'     },
  { key: 'professional_conduct', accent: 'success'  },
];

export default function DashboardScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user, token, refreshDashboard } = useAuth();
  const { t } = useTranslation();
  const s = styles(theme);

  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDashboard(data);
        // Also update AuthContext user stats so PracticeScreen limit is current
        refreshDashboard?.();
      }
    } catch { /* fallback to auth context values */ }
    finally { setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchDashboard(true); }, [fetchDashboard]);
  useFocusEffect(useCallback(() => { fetchDashboard(true); }, [fetchDashboard]));

  // Derived values — server wins, falls back to auth context
  const progress = dashboard?.progress ?? {};
  const entitlements = dashboard?.entitlements ?? {};
  const firstName = user?.name?.split(' ')[0] ?? 'Student';
  const readiness = Math.round(progress.readiness_score ?? user?.readiness ?? 0);
  const streak = progress.study_streak_days ?? user?.streak ?? 0;
  const completed = progress.total_questions_completed ?? user?.completedQuestions ?? 0;
  const accuracy = Math.round(progress.accuracy_rate ?? 0);
  const questionsToday = progress.questions_today ?? 0;
  const dailyLimit = entitlements.practice_daily_limit ?? 15;
  const remaining = entitlements.usage?.practice_questions_remaining ?? (dailyLimit - questionsToday);
  const isPro = entitlements.is_premium ?? (user?.plan === 'premium' || user?.plan === 'premium_monthly' || user?.plan === 'premium_yearly');
  const domainMastery = progress.domain_mastery ?? {};

  const readinessColor = readiness >= 80 ? theme.success : readiness >= 60 ? theme.gold : '#EF4444';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.brand}>
          <View style={s.brandMark}><Text style={s.brandInitials}>RG</Text></View>
          <View>
            <Text style={s.screenTitle}>{t('dashboard.title')}</Text>
            <Text style={s.screenSub}>{t('dashboard.subtitle')}</Text>
          </View>
        </View>
        {!isPro && (
          <Pressable
            style={s.proChip}
            onPress={() => navigation?.navigate('More', { screen: 'Upgrade' })}
          >
            <Text style={s.proChipText}>{t('dashboard.go_pro')}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(false)}
            tintColor={theme.primary}
          />
        }
      >
        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={[s.orb, s.orbTop, { backgroundColor: alpha(theme.gold, 0.16) }]} />
          <View style={[s.orb, s.orbBottom, { backgroundColor: alpha(theme.primary, 0.18) }]} />
          <Text style={s.eyebrow}>RBT Genius</Text>
          <Text style={s.heroTitle}>{t('dashboard.welcome_back', { name: firstName })}</Text>
          <Text style={s.heroBody}>
            {readiness > 0
              ? t('dashboard.readiness_body', {
                  pct: readiness,
                  msg: readiness >= 80
                    ? t('dashboard.readiness_great')
                    : readiness >= 60
                      ? t('dashboard.readiness_medium')
                      : t('dashboard.readiness_low'),
                })
              : t('dashboard.readiness_empty')}
          </Text>
          <View style={s.badgeRow}>
            <Badge label={t('dashboard.streak_badge', { streak })} theme={theme} />
            <Badge label={isPro ? t('common.pro') : t('common.free')} tone="gold" theme={theme} />
          </View>
        </View>

        {/* Pro banner (premium users) */}
        {isPro && (
          <View style={s.proBanner}>
            <View style={s.proBannerLeft}>
              <Text style={s.proBannerTitle}>{t('dashboard.pro_banner_title')}</Text>
              <Text style={s.proBannerSub}>{t('dashboard.pro_banner_sub')}</Text>
            </View>
            <View style={s.proCrown}>
              <Text style={s.proCrownText}>👑</Text>
            </View>
          </View>
        )}

        {/* Daily limit bar (free users) */}
        {!isPro && (
          <View style={s.limitCard}>
            <View style={s.limitHeader}>
              <Text style={s.limitTitle}>{t('dashboard.today')}</Text>
              <Text style={s.limitCount}>
                <Text style={{ color: theme.primary, fontWeight: '900' }}>{questionsToday}</Text>
                <Text style={{ color: theme.muted }}> / {dailyLimit}</Text>
              </Text>
            </View>
            <ProgressBar
              color={theme.primary}
              progress={Math.min(100, Math.round((questionsToday / dailyLimit) * 100))}
              theme={theme}
            />
            <Text style={s.limitSub}>
              {remaining > 0
                ? t('dashboard.daily_limit', { used: questionsToday, limit: dailyLimit })
                : t('dashboard.upgrade_banner')}
            </Text>
          </View>
        )}

        {/* Metric grid */}
        <SectionTitle title={t('dashboard.your_stats')} subtitle={t('dashboard.all_time')} theme={theme} />
        <View style={s.metricGrid}>
          <MetricCard accent="primary" label={t('dashboard.questions_done')} value={completed.toLocaleString()} theme={theme} />
          <MetricCard
            accent={readiness >= 80 ? 'success' : readiness >= 60 ? 'gold' : 'primary'}
            label={t('dashboard.readiness')}
            value={`${readiness}%`}
            theme={theme}
          />
          <MetricCard accent="gold" label={t('dashboard.study_streak')} value={`${streak} ${t('dashboard.days')}`} theme={theme} />
          <MetricCard accent="success" label={t('dashboard.accuracy')} value={accuracy > 0 ? `${accuracy}%` : '—'} theme={theme} />
        </View>

        {/* Domain mastery */}
        <SectionTitle title={t('dashboard.domain_mastery')} subtitle={t('dashboard.domain_subtitle')} theme={theme} />
        <View style={s.panel}>
          {DOMAIN_KEYS.map((domain) => {
            const mastery = Math.round(domainMastery[domain.key] ?? 0);
            const color = toneColor(domain.accent, theme);
            return (
              <View key={domain.key} style={s.domainRow}>
                <View style={s.domainHeader}>
                  <Text style={s.domainLabel}>{t(`domains.${domain.key}`)}</Text>
                  <Text style={[s.domainPct, { color }]}>{mastery}%</Text>
                </View>
                <ProgressBar color={color} progress={mastery} theme={theme} />
                {mastery === 0 && (
                  <Text style={s.domainHint}>{t('dashboard.no_attempts')}</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Bank stat */}
        <View style={s.bankRow}>
          <Text style={s.bankText}>
            {TOTAL_PRACTICE_QUESTIONS.toLocaleString()} questions across 6 domains · BACB RBT TCO 3rd Ed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandMark: {
    width: 42, height: 42, borderRadius: 16, backgroundColor: theme.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25, shadowRadius: 14,
  },
  brandInitials: { color: '#fff', fontSize: 14, fontWeight: '800' },
  screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  screenSub: { color: theme.muted, fontSize: 12 },
  proChip: {
    backgroundColor: alpha(theme.gold, 0.12), borderColor: alpha(theme.gold, 0.3),
    borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  proChipText: { color: theme.gold, fontSize: 12, fontWeight: '800' },
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
    borderRadius: 28, padding: 24, overflow: 'hidden', position: 'relative',
    shadowColor: theme.shadow, shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.1, shadowRadius: 24,
  },
  orb: { position: 'absolute', width: 140, height: 140, borderRadius: 999 },
  orbTop: { top: -40, right: -30 },
  orbBottom: { bottom: -50, left: -30 },
  eyebrow: {
    color: theme.primary, fontSize: 11, fontWeight: '800',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  heroTitle: { color: theme.text, fontSize: 26, fontWeight: '900', lineHeight: 32, marginBottom: 8 },
  heroBody: { color: theme.muted, fontSize: 15, lineHeight: 22, maxWidth: '88%' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  proBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: alpha(theme.gold, 0.10), borderColor: alpha(theme.gold, 0.30),
    borderWidth: 1.5, borderRadius: 20, padding: 18,
  },
  proBannerLeft: { flex: 1, gap: 3 },
  proBannerTitle: { color: theme.text, fontSize: 15, fontWeight: '900' },
  proBannerSub: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  proCrown: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: alpha(theme.gold, 0.18),
    alignItems: 'center', justifyContent: 'center',
  },
  proCrownText: { fontSize: 22 },
  limitCard: {
    backgroundColor: alpha(theme.primary, 0.06), borderColor: alpha(theme.primary, 0.15),
    borderWidth: 1, borderRadius: 20, padding: 18, gap: 10,
  },
  limitHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitTitle: { color: theme.text, fontSize: 14, fontWeight: '700' },
  limitCount: { fontSize: 14 },
  limitSub: { color: theme.muted, fontSize: 12 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  panel: {
    backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
    borderRadius: 24, padding: 20, gap: 16,
    shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07, shadowRadius: 20,
  },
  domainRow: { gap: 6 },
  domainHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  domainLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
  domainPct: { fontSize: 13, fontWeight: '800' },
  domainHint: { color: theme.muted, fontSize: 11 },
  bankRow: { alignItems: 'center' },
  bankText: { color: theme.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});
