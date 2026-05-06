import { useState, useCallback, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { alpha, getTheme } from '../../theme';
import { Badge } from '../../components/ui';
import { getPracticeByTopic, TOPICS } from '../../services/questionService.js';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://rbtgenius.com';

export default function PracticeScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const { user, token } = useAuth();

  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0].key);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answeredToday, setAnsweredToday] = useState(user?.questionsToday ?? 0);
  const submitting = useRef(false);

  const isPro = user?.isPremium ?? false;
  const dailyLimit = user?.dailyLimit ?? 15;
  const limitReached = !isPro && answeredToday >= dailyLimit;

  const questions = getPracticeByTopic(selectedTopic, 24);
  const question = questions[questionIndex] ?? questions[0];
  const answered = selectedOption !== null;

  const handleTopicChange = (key) => {
    setSelectedTopic(key);
    setQuestionIndex(0);
    setSelectedOption(null);
  };

  const submitAttempt = useCallback(async (q, chosenIndex) => {
    if (!token || submitting.current) return;
    submitting.current = true;
    const letterMap = ['A', 'B', 'C', 'D', 'E'];
    const selectedLetter = letterMap[chosenIndex] ?? 'A';
    const isCorrect = chosenIndex === q.correctIndex;
    try {
      await fetch(`${API_BASE}/api/question-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question_id: q.id,
          concept_id: q.concept_id ?? null,
          selected_answer: selectedLetter,
          is_correct: isCorrect,
          topic: q.topic,
          difficulty: q.difficulty,
          task_list_code: q.task_list_code ?? null,
        }),
      });
      setAnsweredToday(n => n + 1);
    } catch (_) {
      // silent — don't block UX on network errors
    } finally {
      submitting.current = false;
    }
  }, [token]);

  const handleOption = (i) => {
    if (answered || limitReached) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(i);
    submitAttempt(question, i);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedOption(null);
    setQuestionIndex(idx => (idx + 1) % questions.length);
  };

  // ── Limit reached screen ──────────────────────────────────────────────────
  if (limitReached) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Text style={s.screenTitle}>Practice</Text>
        </View>
        <View style={s.limitWrap}>
          <Text style={s.limitIcon}>🎯</Text>
          <Text style={s.limitTitle}>Daily Limit Reached</Text>
          <Text style={s.limitSub}>
            You've answered {dailyLimit} questions today — that's your free plan limit.
            Upgrade to Pro for unlimited practice.
          </Text>
          <Pressable
            style={s.upgradeBtn}
            onPress={() => navigation?.navigate('Upgrade')}
          >
            <Text style={s.upgradeBtnText}>Upgrade to Pro 👑</Text>
          </Pressable>
          <Text style={s.limitNote}>Resets every day at midnight</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Normal practice screen ────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>Practice</Text>
        <View style={s.topBarRight}>
          <Text style={s.screenSub}>{questionIndex + 1} / {questions.length} · {question?.topicLabel}</Text>
          {!isPro && (
            <Text style={s.limitBadge}>{answeredToday}/{dailyLimit} today</Text>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Topic pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll}>
          {TOPICS.map(t => {
            const active = t.key === selectedTopic;
            return (
              <Pressable key={t.key} onPress={() => handleTopicChange(t.key)}
                style={[s.pill, active && { backgroundColor: alpha(theme.primary, 0.12), borderColor: alpha(theme.primary, 0.4) }]}>
                <Text style={[s.pillText, active && { color: theme.primary }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Question card */}
        {question && (
          <View style={s.card}>
            <View style={s.cardHeader}>
              <Badge label={question.difficulty} theme={theme} />
              <Badge label={`${question.timeEstimate} min`} tone="gold" theme={theme} />
            </View>
            <Text style={s.questionText}>{question.prompt}</Text>
            <View style={s.options}>
              {question.options.map((opt, i) => {
                const isSelected = selectedOption === i;
                const isCorrect = i === question.correctIndex;
                const showResult = answered;
                let borderColor = theme.border, bgColor = 'transparent', letterColor = theme.primary;
                if (showResult) {
                  if (isCorrect) { borderColor = theme.success; bgColor = alpha(theme.success, 0.1); }
                  else if (isSelected) { borderColor = '#EF4444'; bgColor = alpha('#EF4444', 0.08); letterColor = '#EF4444'; }
                } else if (isSelected) {
                  borderColor = theme.primary; bgColor = alpha(theme.primary, 0.08);
                }
                return (
                  <Pressable key={i} onPress={() => handleOption(i)}
                    style={[s.option, { borderColor, backgroundColor: bgColor }]}>
                    <Text style={[s.optionLetter, { color: letterColor }]}>{String.fromCharCode(65 + i)}</Text>
                    <Text style={s.optionText}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>

            {answered && (
              <View style={s.explanation}>
                <Text style={s.explanationTitle}>
                  {selectedOption === question.correctIndex ? '✓ Correct!' : '✗ Not quite'}
                </Text>
                <Text style={s.explanationText}>{question.explanation}</Text>
              </View>
            )}
          </View>
        )}

        {answered && (
          <Pressable style={s.nextBtn} onPress={handleNext}>
            <Text style={s.nextBtnText}>Next Question →</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  topBar: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  screenSub: { color: theme.muted, fontSize: 12 },
  limitBadge: { fontSize: 11, fontWeight: '700', color: theme.primary, backgroundColor: alpha(theme.primary, 0.1), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  pillScroll: { flexGrow: 0, marginHorizontal: -20, paddingHorizontal: 20 },
  pill: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  pillText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 24, padding: 20, gap: 16, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.07, shadowRadius: 20 },
  cardHeader: { flexDirection: 'row', gap: 10 },
  questionText: { color: theme.text, fontSize: 19, fontWeight: '800', lineHeight: 28 },
  options: { gap: 10 },
  option: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 20, borderWidth: 1.5, alignItems: 'flex-start' },
  optionLetter: { fontSize: 15, fontWeight: '800', width: 18 },
  optionText: { color: theme.text, flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 22 },
  explanation: { backgroundColor: alpha(theme.primary, 0.06), borderRadius: 16, padding: 16, gap: 8 },
  explanationTitle: { color: theme.text, fontSize: 15, fontWeight: '800' },
  explanationText: { color: theme.muted, fontSize: 14, lineHeight: 22 },
  nextBtn: { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 18, alignItems: 'center', shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  // Limit reached
  limitWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  limitIcon: { fontSize: 64 },
  limitTitle: { color: theme.text, fontSize: 24, fontWeight: '800', textAlign: 'center' },
  limitSub: { color: theme.muted, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  upgradeBtn: { backgroundColor: theme.primary, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 32, marginTop: 8, shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 16 },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  limitNote: { color: theme.muted, fontSize: 12 },
});
