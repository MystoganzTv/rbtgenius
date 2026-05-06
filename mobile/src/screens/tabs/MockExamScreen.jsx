import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { isAvailableAsync, requestReview } from 'expo-store-review';

import { useTranslation } from 'react-i18next';
import { localizeQuestion } from '../../lib/i18n.js';
import { alpha, getTheme } from '../../theme';
import { ProgressBar, toneColor } from '../../components/ui';
import { getMockExamQuestions } from '../../services/questionService.js';
import { useAuth } from '../../context/AuthContext';

const API_BASE   = 'https://rbtgenius.com';
const EXAM_SIZE  = 85;
const TIME_LIMIT = 90 * 60;
const PASS_SCORE = 80;
const LETTERS    = ['A', 'B', 'C', 'D', 'E'];

const DOMAIN_CONFIG = [
  { key: 'measurement',          label: 'Measurement',        accent: 'primary'  },
  { key: 'assessment',           label: 'Assessment',          accent: 'gold'     },
  { key: 'skill_acquisition',    label: 'Skill Acquisition',   accent: 'success'  },
  { key: 'behavior_reduction',   label: 'Behavior Reduction',  accent: 'primary'  },
  { key: 'documentation',        label: 'Documentation',       accent: 'gold'     },
  { key: 'professional_conduct', label: 'Ethics',              accent: 'success'  },
];

export default function MockExamScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme  = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s      = styles(theme);
  const { user, token, refreshDashboard } = useAuth();
  const { t, i18n } = useTranslation();

  const isPro = user?.isPremium ?? false;

  const [phase,     setPhase]     = useState('setup'); // setup | running | saving | results
  const [questions, setQuestions] = useState([]);
  const [index,     setIndex]     = useState(0);
  // answers: { [questionId]: 'A'|'B'|'C'|'D' }
  const [answers,   setAnswers]   = useState({});
  const [selected,  setSelected]  = useState(null); // letter of current selection
  const [timeLeft,  setTimeLeft]  = useState(TIME_LIMIT);
  const [examResult, setExamResult] = useState(null); // server response
  const [saveError,  setSaveError]  = useState(false);
  const timerRef   = useRef(null);
  const startTime  = useRef(null);

  // ── Start ─────────────────────────────────────────────────────────────────
  const startExam = () => {
    const qs = getMockExamQuestions(EXAM_SIZE);
    setQuestions(qs);
    setIndex(0);
    setAnswers({});
    setSelected(null);
    setTimeLeft(TIME_LIMIT);
    setExamResult(null);
    setSaveError(false);
    startTime.current = Date.now();
    setPhase('running');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'running') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); finishExam(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const fmt = (secs) => {
    const m  = Math.floor(secs / 60).toString().padStart(2, '0');
    const s2 = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s2}`;
  };

  // ── Answer ────────────────────────────────────────────────────────────────
  const choose = (letter) => {
    if (selected !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(letter);
    setAnswers(prev => ({ ...prev, [questions[index].id]: letter }));
  };

  const goTo = (i) => {
    setIndex(i);
    setSelected(answers[questions[i]?.id] ?? null);
  };

  const next = () => {
    if (index < questions.length - 1) goTo(index + 1);
    else finishExam();
  };
  const prev = () => { if (index > 0) goTo(index - 1); };

  const submitEarly = () => {
    const cnt = Object.keys(answers).length;
    Alert.alert(
      t('exams.submit_early'),
      t('exams.answered_count_alert', { cnt, total: questions.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('exams.submit_early'), style: 'destructive', onPress: finishExam },
      ]
    );
  };

  // ── Save to server ────────────────────────────────────────────────────────
  const finishExam = useCallback(async () => {
    clearInterval(timerRef.current);
    setPhase('saving');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const timeTakenMinutes = Math.round((Date.now() - (startTime.current ?? Date.now())) / 60000);

    try {
      const res = await fetch(`${API_BASE}/api/mock-exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_ids: questions.map(q => q.id),
          answers,
          time_taken_minutes: timeTakenMinutes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExamResult(data);
        refreshDashboard?.(); // update readiness score in context
        // Pedir review si aprueba (≥80%)
        if ((data.score ?? 0) >= PASS_SCORE) {
          const available = await isAvailableAsync();
          if (available) requestReview();
        }
      } else {
        throw new Error('Server error');
      }
    } catch {
      // Fallback: compute locally
      setSaveError(true);
      const total   = questions.length;
      const correct = questions.filter(q => {
        const letter = answers[q.id];
        const idx    = LETTERS.indexOf(letter);
        return idx === q.correctIndex;
      }).length;
      const score   = Math.round((correct / total) * 100);

      // Local domain scores
      const domainCorrect = {};
      const domainTotal   = {};
      questions.forEach(q => {
        const key    = q.topic;
        const letter = answers[q.id];
        const idx    = LETTERS.indexOf(letter ?? '');
        domainTotal[key]   = (domainTotal[key]   ?? 0) + 1;
        domainCorrect[key] = (domainCorrect[key] ?? 0) + (idx === q.correctIndex ? 1 : 0);
      });
      const domain_scores = {};
      Object.keys(domainTotal).forEach(k => {
        domain_scores[k] = Math.round((domainCorrect[k] / domainTotal[k]) * 100);
      });

      setExamResult({ score, correct_answers: correct, total_questions: total, domain_scores });
    }

    setPhase('results');
  }, [questions, answers, token]);

  // ─── Saving spinner ────────────────────────────────────────────────────────
  if (phase === 'saving') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: theme.muted, fontSize: 15 }}>{t('exams.saving')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Results ──────────────────────────────────────────────────────────────
  if (phase === 'results' && examResult) {
    const score  = examResult.score ?? 0;
    const passed = score >= PASS_SCORE;
    const correct = examResult.correct_answers ?? 0;
    const total   = examResult.total_questions ?? questions.length;
    const domainScores = examResult.domain_scores ?? {};

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ScrollView contentContainerStyle={[s.content, { paddingTop: 24 }]} showsVerticalScrollIndicator={false}>

          {/* Hero */}
          <View style={[s.resultHero, { backgroundColor: passed ? alpha(theme.success, 0.1) : alpha('#EF4444', 0.08) }]}>
            <Text style={s.resultEmoji}>{passed ? '🎉' : '📚'}</Text>
            <Text style={[s.resultScore, { color: passed ? theme.success : '#EF4444' }]}>{score}%</Text>
            <Text style={[s.resultStatus, { color: passed ? theme.success : '#EF4444' }]}>
{passed ? t('exams.passed') : t('exams.failed')}
            </Text>
            <Text style={s.resultDetail}>{t('exams.correct_count', { correct, total, score: PASS_SCORE })}</Text>
            {saveError && (
              <Text style={s.saveErrorNote}>{t('exams.offline_score')}</Text>
            )}
          </View>

          {/* Domain breakdown */}
          {Object.keys(domainScores).length > 0 && (
            <View style={s.domainCard}>
              <Text style={s.domainCardTitle}>{t('exams.domain_breakdown')}</Text>
              {DOMAIN_CONFIG.map(d => {
                const pct   = Math.round(domainScores[d.key] ?? 0);
                const color = toneColor(d.accent, theme);
                if (pct === 0 && !domainScores[d.key]) return null;
                return (
                  <View key={d.key} style={s.domainRow}>
                    <View style={s.domainMeta}>
                      <Text style={s.domainLabel}>{t(`domains.${d.key}`)}</Text>
                      <Text style={[s.domainPct, { color: pct >= 80 ? theme.success : pct >= 60 ? theme.gold : '#EF4444' }]}>
                        {pct}%
                      </Text>
                    </View>
                    <ProgressBar
                      color={pct >= 80 ? theme.success : pct >= 60 ? theme.gold : '#EF4444'}
                      progress={pct}
                      theme={theme}
                    />
                  </View>
                );
              })}
            </View>
          )}

          {/* Q-by-Q review */}
          <Text style={[s.domainCardTitle, { marginTop: 4 }]}>{t('exams.review_title')}</Text>
          <View style={s.reviewCard}>
            {questions.map((q, i) => {
              const letter    = answers[q.id];
              const idx       = LETTERS.indexOf(letter ?? '');
              const isCorrect = idx === q.correctIndex;
              const answered  = letter !== undefined;
              return (
                <View key={i} style={[s.reviewRow, i < questions.length - 1 && s.reviewBorder]}>
                  <Text style={s.reviewNum}>P{i + 1}</Text>
                  <Text style={s.reviewTopic}>{t(`domains.${q.topic}`)}</Text>
                  <Text style={[s.reviewResult, { color: !answered ? theme.muted : isCorrect ? theme.success : '#EF4444' }]}>
                    {!answered ? '—' : isCorrect ? '✓' : `✗ (${LETTERS[q.correctIndex]})`}
                  </Text>
                </View>
              );
            })}
          </View>

          <Pressable style={s.retakeBtn} onPress={() => setPhase('setup')}>
            <Text style={s.retakeBtnText}>{t('exams.retake')}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Setup ────────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Text style={s.screenTitle}>{t('exams.title')}</Text>
          <Text style={s.screenSub}>{t('exams.subtitle')}</Text>
        </View>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>{t('exams.details_title')}</Text>
            {[
              [t('exams.questions_label'), `${EXAM_SIZE}`],
              [t('exams.time_label'), '90 min'],
              [t('exams.pass_label'), `${PASS_SCORE}%`],
              [t('exams.format_label'), t('exams.format_value')],
            ].map(([label, val]) => (
              <View key={label} style={s.infoRow}>
                <Text style={s.infoLabel}>{label}</Text>
                <Text style={s.infoVal}>{val}</Text>
              </View>
            ))}
          </View>

          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>{t('exams.tips_title')}</Text>
            {[t('exams.tip_1'), t('exams.tip_2'), t('exams.tip_3'), t('exams.tip_4')].map((tip, i) => (
              <Text key={i} style={s.tipText}>• {tip}</Text>
            ))}
          </View>

          {isPro ? (
            <Pressable style={s.startBtn} onPress={startExam}>
              <Text style={s.startBtnText}>{t('exams.start')}</Text>
            </Pressable>
          ) : (
            <View style={s.lockedWrap}>
              <Text style={s.lockedEmoji}>🔒</Text>
              <Text style={s.lockedTitle}>{t('exams.pro_feature')}</Text>
              <Text style={s.lockedSub}>{t('exams.pro_locked_body')}</Text>
              <Pressable style={s.upgradeBtn} onPress={() => navigation.navigate('More', { screen: 'Upgrade' })}>
                <Text style={s.upgradeBtnText}>{t('exams.upgrade_pro')}</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Running ──────────────────────────────────────────────────────────────
  const q           = questions[index];
  const answeredCnt = Object.keys(answers).length;
  const timerWarn   = timeLeft <= 600;

  const localizedQ = useMemo(
    () => q?._raw ? localizeQuestion(q._raw, i18n.language) : null,
    [q?.id, i18n.language],
  );
  const qText    = localizedQ?.localizedText?.primary || q?.prompt || '';
  const qOptions = localizedQ ? localizedQ.options.map(o => o.localizedText?.primary || o.text) : (q?.options ?? []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <View style={s.topBarRow}>
          <Text style={s.screenTitle}>{index + 1} / {questions.length}</Text>
          <Text style={[s.timer, timerWarn && { color: '#EF4444' }]}>{fmt(timeLeft)}</Text>
        </View>
        <Text style={s.screenSub}>{t('exams.answered_count', { answered: answeredCnt, remaining: questions.length - answeredCnt })}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.qCard}>
          <Text style={s.qDomain}>{q ? t(`domains.${q.topic}`) : ''}</Text>
          <Text style={s.qText}>{qText}</Text>
        </View>

        <View style={s.optionsWrap}>
          {qOptions.map((opt, i) => {
            const letter     = LETTERS[i];
            const isSelected = selected === letter;
            return (
              <Pressable key={i} onPress={() => choose(letter)}
                style={[s.optionBtn, isSelected && { backgroundColor: alpha(theme.primary, 0.1), borderColor: theme.primary }]}>
                <View style={[s.optionBullet, isSelected && { backgroundColor: theme.primary }]}>
                  <Text style={[s.optionLetter, isSelected && { color: '#fff' }]}>{letter}</Text>
                </View>
                <Text style={[s.optionText, isSelected && { color: theme.primary }]}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.navRow}>
          <Pressable style={s.navBtn} onPress={prev} disabled={index === 0}>
            <Text style={s.navBtnText}>{t('exams.prev')}</Text>
          </Pressable>
          <Pressable style={[s.navBtn, s.navBtnPrimary]} onPress={next}>
            <Text style={[s.navBtnText, { color: '#fff' }]}>
              {index < questions.length - 1 ? t('exams.next_arrow') : t('exams.finish')}
            </Text>
          </Pressable>
        </View>

        <Pressable style={s.submitEarly} onPress={submitEarly}>
          <Text style={s.submitEarlyText}>Enviar examen</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe:            { flex: 1, backgroundColor: theme.background },
  topBar:          { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  topBarRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle:     { color: theme.text, fontSize: 18, fontWeight: '800' },
  screenSub:       { color: theme.muted, fontSize: 12, marginTop: 2 },
  timer:           { color: theme.primary, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  content:         { padding: 20, gap: 16, paddingBottom: 40 },
  // Setup
  infoCard:        { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 20 },
  infoTitle:       { color: theme.text, fontSize: 16, fontWeight: '800', marginBottom: 14 },
  infoRow:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  infoLabel:       { color: theme.muted, fontSize: 14 },
  infoVal:         { color: theme.text, fontSize: 14, fontWeight: '700' },
  tipsCard:        { backgroundColor: alpha(theme.primary, 0.06), borderRadius: 20, padding: 20, gap: 8 },
  tipsTitle:       { color: theme.text, fontSize: 15, fontWeight: '800', marginBottom: 4 },
  tipText:         { color: theme.muted, fontSize: 13, lineHeight: 20 },
  startBtn:        { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  startBtnText:    { color: '#fff', fontSize: 16, fontWeight: '800' },
  lockedWrap:      { backgroundColor: alpha(theme.gold, 0.08), borderColor: alpha(theme.gold, 0.25), borderWidth: 1, borderRadius: 22, padding: 28, alignItems: 'center', gap: 10 },
  lockedEmoji:     { fontSize: 36 },
  lockedTitle:     { fontSize: 18, fontWeight: '900', color: theme.text },
  lockedSub:       { fontSize: 14, color: theme.muted, textAlign: 'center', lineHeight: 20 },
  upgradeBtn:      { backgroundColor: theme.gold, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28, marginTop: 4 },
  upgradeBtnText:  { color: '#fff', fontSize: 15, fontWeight: '800' },
  // Running
  qCard:           { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 22, gap: 10, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18 },
  qDomain:         { color: theme.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  qText:           { color: theme.text, fontSize: 17, fontWeight: '700', lineHeight: 26 },
  optionsWrap:     { gap: 10 },
  optionBtn:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5, borderRadius: 18, padding: 16 },
  optionBullet:    { width: 32, height: 32, borderRadius: 10, backgroundColor: alpha(theme.primary, 0.1), alignItems: 'center', justifyContent: 'center' },
  optionLetter:    { color: theme.primary, fontSize: 13, fontWeight: '800' },
  optionText:      { flex: 1, color: theme.text, fontSize: 15, lineHeight: 22 },
  navRow:          { flexDirection: 'row', gap: 12 },
  navBtn:          { flex: 1, borderRadius: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
  navBtnPrimary:   { backgroundColor: theme.primary, borderColor: theme.primary },
  navBtnText:      { color: theme.text, fontSize: 15, fontWeight: '700' },
  submitEarly:     { borderColor: '#EF4444', borderWidth: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitEarlyText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
  // Results
  resultHero:      { borderRadius: 28, padding: 32, alignItems: 'center', gap: 8 },
  resultEmoji:     { fontSize: 52 },
  resultScore:     { fontSize: 60, fontWeight: '900' },
  resultStatus:    { fontSize: 20, fontWeight: '900' },
  resultDetail:    { color: theme.muted, fontSize: 14, textAlign: 'center' },
  saveErrorNote:   { color: theme.gold, fontSize: 12, marginTop: 4, textAlign: 'center' },
  domainCard:      { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 20, gap: 14, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 18 },
  domainCardTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  domainRow:       { gap: 6 },
  domainMeta:      { flexDirection: 'row', justifyContent: 'space-between' },
  domainLabel:     { color: theme.text, fontSize: 13, fontWeight: '600' },
  domainPct:       { fontSize: 13, fontWeight: '800' },
  reviewCard:      { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  reviewRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  reviewBorder:    { borderBottomColor: alpha(theme.border, 0.5), borderBottomWidth: 1 },
  reviewNum:       { color: theme.muted, fontSize: 12, fontWeight: '600', width: 32 },
  reviewTopic:     { color: theme.muted, fontSize: 12, flex: 1 },
  reviewResult:    { fontSize: 13, fontWeight: '800' },
  retakeBtn:       { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 18, alignItems: 'center' },
  retakeBtnText:   { color: '#fff', fontSize: 16, fontWeight: '800' },
});
