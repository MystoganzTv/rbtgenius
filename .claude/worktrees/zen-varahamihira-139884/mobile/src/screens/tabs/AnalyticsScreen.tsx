import { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { alpha, getTheme } from '../../theme';
import { ProgressBar, SectionTitle, toneColor } from '../../components/ui';
import { TOTAL_PRACTICE_QUESTIONS } from '../../services/questionService.js';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://rbtgenius.com';

const DOMAIN_CONFIG = [
  { key: 'measurement',          label: 'Measurement',        accent: 'primary'  },
  { key: 'assessment',           label: 'Assessment',          accent: 'gold'     },
  { key: 'skill_acquisition',    label: 'Skill Acquisition',   accent: 'success'  },
  { key: 'behavior_reduction',   label: 'Behavior Reduction',  accent: 'primary'  },
  { key: 'documentation',        label: 'Documentation',       accent: 'gold'     },
  { key: 'professional_conduct', label: 'Ethics',              accent: 'success'  },
];

function readinessLabel(r) {
  if (r >= 80) return { text: 'Exam Ready', color: '#059669' };
  if (r >= 65) return { text: 'Almost There', color: '#D97706' };
  if (r >= 40) return { text: 'In Progress', color: '#3266ad' };
  return { text: 'Getting Started', color: '#888' };
}

export default function AnalyticsScreen() {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const { token, user } = useAuth();

  const [dashboard, setDashboard]   = useState(null);
  const [weekly,    setWeekly]      = useState(null); // null = loading, [] = empty/unavailable
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Always fetch dashboard
      const dashRes = await fetch(`${API_BASE}/api/dashboard`, { headers });
      if (dashRes.ok) setDashboard(await dashRes.json());

      // Try weekly analytics — graceful fallback if endpoint doesn't exist
      try {
        const wRes = await fetch(`${API_BASE}/api/analytics/weekly`, { headers });
        if (wRes.ok) {
          const data = await wRes.json();
          setWeekly(data.days ?? data.weekly ?? []);
        } else {
          setWeekly([]);
        }
      } catch {
        setWeekly([]);
      }
    } catch { /* stay with current data */ }
    finally { setRefreshing(false); }
  }, [token]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  // Derived values
  const progress      = dashboard?.progress      ?? {};
  const entitlements  = dashboard?.entitlements  ?? {};
  const readiness     = Math.round(progress.readiness_score     ?? user?.readiness     ?? 0);
  const accuracy      = Math.round((progress.accuracy_rate      ?? user?.accuracyRate  ?? 0));
  const streak        = progress.study_streak_days ?? user?.streak ?? 0;
  const completed     = progress.total_questions_completed ?? user?.completedQuestions ?? 0;
  const questionsToday = progress.questions_today ?? user?.questionsToday ?? 0;
  const isPro         = entitlements.is_premium   ?? user?.isPremium ?? false;
  const domainMastery = progress.domain_mastery   ?? {};
  const rl            = readinessLabel(readiness);

  // Best/weakest domain
  const scored = DOMAIN_CONFIG
    .map(d => ({ ...d, pct: Math.round(domainMastery[d.key] ?? 0) }))
    .filter(d => d.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const best    = scored[0]   ?? null;
  const weakest = scored[scored.length - 1] ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>Analytics</Text>
        <Text style={s.screenSub}>Tu rendimiento en detalle</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(false)} tintColor={theme.primary} />
        }
      >
        {/* Readiness hero */}
        <View style={s.heroCard}>
          <View style={s.heroLeft}>
            <Text style={s.heroLabel}>Readiness score</Text>
            <Text style={[s.heroValue, { color: rl.color }]}>{readiness}%</Text>
            <View style={[s.heroTag, { backgroundColor: rl.color + '18' }]}>
              <Text style={[s.heroTagText, { color: rl.color }]}>{rl.text}</Text>
            </View>
          </View>
          <View style={s.heroRight}>
            <View style={s.ringOuter}>
              <View style={[s.ringFill, {
                height: `${Math.min(100, readiness)}%`,
                backgroundColor: rl.color,
              }]} />
              <Text style={[s.ringPct, { color: rl.color }]}>{readiness}%</Text>
            </View>
          </View>
        </View>

        {/* 4 stat chips */}
        <View style={s.chipGrid}>
          {[
            { label: 'Preguntas', value: completed.toLocaleString(), accent: theme.primary },
            { label: 'Precisión',  value: accuracy > 0 ? `${accuracy}%` : '—', accent: '#059669' },
            { label: 'Racha',      value: `${streak}d`, accent: theme.gold },
            { label: 'Hoy',        value: String(questionsToday), accent: '#7C3AED' },
          ].map(chip => (
            <View key={chip.label} style={s.chip}>
              <Text style={[s.chipValue, { color: chip.accent }]}>{chip.value}</Text>
              <Text style={s.chipLabel}>{chip.label}</Text>
            </View>
          ))}
        </View>

        {/* Best / weakest callout */}
        {(best || weakest) && (
          <View style={s.insightRow}>
            {best && (
              <View style={[s.insightCard, { borderColor: alpha('#059669', 0.3), backgroundColor: alpha('#059669', 0.06) }]}>
                <Text style={s.insightEmoji}>💪</Text>
                <Text style={[s.insightTitle, { color: '#059669' }]}>Más fuerte</Text>
                <Text style={s.insightDomain}>{best.label}</Text>
                <Text style={[s.insightPct, { color: '#059669' }]}>{best.pct}%</Text>
              </View>
            )}
            {weakest && weakest.key !== best?.key && (
              <View style={[s.insightCard, { borderColor: alpha('#D97706', 0.3), backgroundColor: alpha('#D97706', 0.06) }]}>
                <Text style={s.insightEmoji}>🎯</Text>
                <Text style={[s.insightTitle, { color: '#D97706' }]}>Enfócate aquí</Text>
                <Text style={s.insightDomain}>{weakest.label}</Text>
                <Text style={[s.insightPct, { color: '#D97706' }]}>{weakest.pct}%</Text>
              </View>
            )}
          </View>
        )}

        {/* Weekly chart */}
        <SectionTitle title="Actividad semanal" subtitle="Últimos 7 días" theme={theme} />
        <View style={s.chartCard}>
          {weekly === null ? (
            <Text style={s.chartLoading}>Cargando...</Text>
          ) : weekly.length > 0 ? (
            <>
              <View style={s.chart}>
                {weekly.map((day, i) => {
                  const pct = Math.min(100, Math.round(day.accuracy ?? day.score ?? 0));
                  const isToday = i === weekly.length - 1;
                  return (
                    <View key={i} style={s.chartCol}>
                      <Text style={s.chartScore}>{pct > 0 ? `${pct}%` : ''}</Text>
                      <View style={s.chartTrack}>
                        {pct > 0 && (
                          <View style={[s.chartFill, {
                            height: `${pct}%`,
                            backgroundColor: isToday ? theme.gold : theme.primary,
                          }]} />
                        )}
                      </View>
                      <Text style={[s.chartDay, isToday && { color: theme.primary, fontWeight: '800' }]}>
                        {day.day ?? day.label ?? `D${i + 1}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {weekly.length > 0 && (
                <Text style={s.chartAvg}>
                  Promedio: {Math.round(weekly.reduce((s, d) => s + (d.accuracy ?? d.score ?? 0), 0) / weekly.length)}%
                </Text>
              )}
            </>
          ) : (
            <View style={s.chartEmpty}>
              <Text style={s.chartEmptyIcon}>📊</Text>
              <Text style={s.chartEmptyText}>Practica más para ver tu tendencia semanal</Text>
            </View>
          )}
        </View>

        {/* Domain mastery */}
        <SectionTitle title="Dominio por área" subtitle="Basado en tus respuestas reales" theme={theme} />
        <View style={s.panel}>
          {DOMAIN_CONFIG.map((d) => {
            const pct = Math.round(domainMastery[d.key] ?? 0);
            const color = toneColor(d.accent, theme);
            return (
              <View key={d.key} style={s.domainRow}>
                <View style={s.domainMeta}>
                  <Text style={s.domainLabel}>{d.label}</Text>
                  <Text style={[s.domainPct, { color }]}>{pct}%</Text>
                </View>
                <ProgressBar color={color} progress={pct} theme={theme} />
                {pct === 0 && (
                  <Text style={s.domainHint}>Sin intentos todavía en este área</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Bank card */}
        <View style={s.bankCard}>
          <Text style={s.bankTitle}>Banco de preguntas</Text>
          <Text style={[s.bankStat, { color: theme.primary }]}>{TOTAL_PRACTICE_QUESTIONS.toLocaleString()}</Text>
          <Text style={s.bankSub}>preguntas · 43 ítems del BACB RBT TCO 3ª edición</Text>
          {!isPro && (
            <Text style={[s.bankSub, { marginTop: 4, color: theme.gold }]}>
              👑 Pro: preguntas ilimitadas por día
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe:           { flex: 1, backgroundColor: theme.background },
  topBar:         { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  screenTitle:    { color: theme.text, fontSize: 18, fontWeight: '800' },
  screenSub:      { color: theme.muted, fontSize: 12, marginTop: 2 },
  content:        { padding: 20, gap: 20, paddingBottom: 40 },

  heroCard:       { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 20 },
  heroLeft:       { flex: 1, gap: 8 },
  heroLabel:      { color: theme.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  heroValue:      { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  heroTag:        { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  heroTagText:    { fontSize: 12, fontWeight: '800' },
  heroRight:      { alignItems: 'center', justifyContent: 'center', width: 80 },
  ringOuter:      { width: 72, height: 72, borderRadius: 36, backgroundColor: alpha(theme.border, 0.15), overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  ringFill:       { width: '100%', borderRadius: 4 },
  ringPct:        { position: 'absolute', fontSize: 13, fontWeight: '900' },

  chipGrid:       { flexDirection: 'row', gap: 10 },
  chip:           { flex: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 4 },
  chipValue:      { fontSize: 20, fontWeight: '900' },
  chipLabel:      { color: theme.muted, fontSize: 11, fontWeight: '600' },

  insightRow:     { flexDirection: 'row', gap: 12 },
  insightCard:    { flex: 1, borderWidth: 1, borderRadius: 20, padding: 16, gap: 4, alignItems: 'center' },
  insightEmoji:   { fontSize: 24 },
  insightTitle:   { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  insightDomain:  { color: theme.text, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  insightPct:     { fontSize: 20, fontWeight: '900' },

  chartCard:      { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 20, minHeight: 140, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 20 },
  chartLoading:   { color: theme.muted, textAlign: 'center', paddingVertical: 20 },
  chart:          { flexDirection: 'row', alignItems: 'flex-end', height: 180, gap: 8 },
  chartCol:       { flex: 1, alignItems: 'center', gap: 6, height: '100%' },
  chartScore:     { color: theme.muted, fontSize: 10, fontWeight: '700' },
  chartTrack:     { flex: 1, width: 22, backgroundColor: alpha(theme.primary, 0.08), borderRadius: 999, overflow: 'hidden', justifyContent: 'flex-end' },
  chartFill:      { width: '100%', borderRadius: 999 },
  chartDay:       { color: theme.muted, fontSize: 11, fontWeight: '700' },
  chartAvg:       { color: theme.muted, fontSize: 13, fontWeight: '600', textAlign: 'right', marginTop: 8 },
  chartEmpty:     { alignItems: 'center', paddingVertical: 24, gap: 10 },
  chartEmptyIcon: { fontSize: 36 },
  chartEmptyText: { color: theme.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  panel:          { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 20, gap: 18, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 20 },
  domainRow:      { gap: 6 },
  domainMeta:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  domainLabel:    { color: theme.text, fontSize: 15, fontWeight: '700' },
  domainPct:      { fontSize: 14, fontWeight: '800' },
  domainHint:     { color: theme.muted, fontSize: 12 },

  bankCard:       { backgroundColor: alpha(theme.primary, 0.06), borderRadius: 20, padding: 20, gap: 4 },
  bankTitle:      { color: theme.text, fontSize: 15, fontWeight: '800' },
  bankStat:       { fontSize: 28, fontWeight: '900' },
  bankSub:        { color: theme.muted, fontSize: 13, lineHeight: 20 },
});
