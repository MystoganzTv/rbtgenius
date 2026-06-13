/**
 * ReviewMistakesScreen — práctica con las preguntas donde el último
 * intento del usuario fue incorrecto. Fetches IDs from the backend,
 * loads questions from the local bank, then runs a standard practice loop.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet,
  Text, View, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { getQuestionsByIds } from '../../services/questionService';
import TranslationSheet, { TranslationTrigger } from '../../components/i18n/TranslationSheet.jsx';
import { buildQuestionTranslationContent } from '../../lib/questions/reviewed-question-translations.js';

const API_BASE = 'https://www.rbtgenius.com';

export default function ReviewMistakesScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const { t } = useTranslation();
  const { token } = useAuth();

  const [phase, setPhase] = useState('loading'); // loading | empty | practice | done
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [translationPanel, setTranslationPanel] = useState(null);
  const submitting = useRef(false);

  // ── Load wrong question IDs on mount ────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/question-attempts/wrong`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('fetch failed');
        const data = await res.json();
        const ids = data.question_ids ?? [];
        if (!ids.length) { setPhase('empty'); return; }
        const loaded = getQuestionsByIds(ids);
        if (!loaded.length) { setPhase('empty'); return; }
        // Shuffle so it's not always the same order
        setQuestions(loaded.sort(() => Math.random() - 0.5));
        setPhase('practice');
      } catch {
        setPhase('empty');
      }
    })();
  }, [token]);

  const question = questions[index];
  const answered = selectedOption !== null;
  const total = questions.length;

  const translationContent = question?._raw
    ? buildQuestionTranslationContent(question._raw)
    : null;

  // ── Submit attempt ───────────────────────────────────────────────────────────
  const submitAttempt = useCallback(async (q, chosenIndex) => {
    if (!token || submitting.current) return;
    submitting.current = true;
    const letterMap = ['A', 'B', 'C', 'D', 'E'];
    const selectedLetter = letterMap[chosenIndex] ?? 'A';
    try {
      await fetch(`${API_BASE}/api/question-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question_id: q.id,
          concept_id: q.concept_id ?? null,
          selected_answer: selectedLetter,
          is_correct: chosenIndex === q.correctIndex,
          topic: q.topic,
          difficulty: q.difficulty,
          task_list_code: q.task_list_code ?? null,
          source: 'review_mistakes',
        }),
      });
    } catch { /* silent */ }
    finally { submitting.current = false; }
  }, [token]);

  const handleOption = (i) => {
    if (answered) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOption(i);
    if (i === question.correctIndex) setCorrectCount(n => n + 1);
    submitAttempt(question, i);
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTranslationPanel(null);
    setSelectedOption(null);
    if (index + 1 >= total) {
      setPhase('done');
    } else {
      setIndex(i => i + 1);
    }
  };

  // ── Option color helper ──────────────────────────────────────────────────────
  const optionStyle = (i) => {
    if (!answered) return s.optionBase;
    if (i === question.correctIndex) return [s.optionBase, s.optionCorrect];
    if (i === selectedOption) return [s.optionBase, s.optionWrong];
    return [s.optionBase, s.optionDim];
  };
  const optionTextStyle = (i) => {
    if (!answered) return s.optionText;
    if (i === question.correctIndex) return [s.optionText, { color: theme.success }];
    if (i === selectedOption) return [s.optionText, { color: '#EF4444' }];
    return [s.optionText, { color: theme.muted }];
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === 'loading') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Text style={s.screenTitle}>{t('review.title')}</Text>
        </View>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={s.loadingText}>{t('review.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (phase === 'empty') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Text style={s.screenTitle}>{t('review.title')}</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🎉</Text>
          <Text style={s.emptyTitle}>{t('review.empty_title')}</Text>
          <Text style={s.emptySub}>{t('review.empty_sub')}</Text>
          <Pressable style={s.doneBtn} onPress={() => navigation?.goBack()}>
            <Text style={s.doneBtnText}>{t('review.go_practice')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Completion screen ────────────────────────────────────────────────────────
  if (phase === 'done') {
    const pct = Math.round((correctCount / total) * 100);
    const passed = pct >= 80;
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}>
          <Text style={s.screenTitle}>{t('review.title')}</Text>
        </View>
        <View style={s.centered}>
          <Text style={s.emptyIcon}>{passed ? '✅' : '📚'}</Text>
          <Text style={[s.scoreText, { color: passed ? theme.success : '#EF4444' }]}>{pct}%</Text>
          <Text style={s.emptyTitle}>
            {t('review.done_correct', { correct: correctCount, total })}
          </Text>
          <Text style={s.emptySub}>
            {passed ? t('review.done_great') : t('review.done_keep_going')}
          </Text>
          <Pressable style={s.doneBtn} onPress={() => {
            // Reset and try again
            setIndex(0);
            setSelectedOption(null);
            setCorrectCount(0);
            setQuestions(qs => qs.sort(() => Math.random() - 0.5));
            setPhase('practice');
          }}>
            <Text style={s.doneBtnText}>{t('review.retry')}</Text>
          </Pressable>
          <Pressable style={s.ghostBtn} onPress={() => navigation?.goBack()}>
            <Text style={s.ghostBtnText}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Practice loop ────────────────────────────────────────────────────────────
  const letterLabels = ['A', 'B', 'C', 'D', 'E'];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>{t('review.title')}</Text>
        <Text style={s.screenSub}>
          {t('review.progress', { current: index + 1, total })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Progress bar */}
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${((index) / total) * 100}%`, backgroundColor: theme.primary }]} />
        </View>

        {/* Question */}
        <View style={s.questionCard}>
          <View style={s.topicRow}>
            <Text style={s.topicTag}>{t(`domains.${question.topic}`)}</Text>
            <TranslationTrigger
              translationContent={translationContent}
              onOpen={(payload) => setTranslationPanel(payload)}
            />
          </View>
          <Text style={s.questionText}>{question.prompt}</Text>
        </View>

        {/* Options */}
        <View style={s.options}>
          {question.options.map((opt, i) => (
            <Pressable key={i} style={optionStyle(i)} onPress={() => handleOption(i)}>
              <View style={s.optionLabel}>
                <Text style={[s.optionLetter, answered && i === question.correctIndex && { color: theme.success },
                  answered && i === selectedOption && i !== question.correctIndex && { color: '#EF4444' }]}>
                  {letterLabels[i]}
                </Text>
              </View>
              <Text style={optionTextStyle(i)}>{opt}</Text>
            </Pressable>
          ))}
        </View>

        {/* Explanation */}
        {answered && question.explanation ? (
          <View style={s.explanationCard}>
            <Text style={s.explanationLabel}>
              {selectedOption === question.correctIndex
                ? t('practice.correct_label')
                : t('practice.incorrect_label')}
            </Text>
            <Text style={s.explanationText}>{question.explanation}</Text>
          </View>
        ) : null}

        {/* Next button */}
        {answered && (
          <Pressable style={s.nextBtn} onPress={handleNext}>
            <Text style={s.nextBtnText}>
              {index + 1 >= total ? t('review.finish') : t('practice.next_question')}
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Translation sheet */}
      {translationPanel && (
        <TranslationSheet
          content={translationPanel}
          onClose={() => setTranslationPanel(null)}
          theme={theme}
        />
      )}
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe:            { flex: 1, backgroundColor: theme.background },
  topBar:          { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  screenTitle:     { color: theme.text, fontSize: 18, fontWeight: '800' },
  screenSub:       { color: theme.muted, fontSize: 12, marginTop: 2 },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  loadingText:     { color: theme.muted, fontSize: 15, marginTop: 12 },
  emptyIcon:       { fontSize: 56, marginBottom: 8 },
  emptyTitle:      { color: theme.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  emptySub:        { color: theme.muted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  scoreText:       { fontSize: 52, fontWeight: '900' },
  doneBtn:         { backgroundColor: theme.primary, borderRadius: 16, paddingHorizontal: 32, paddingVertical: 16, marginTop: 8 },
  doneBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
  ghostBtn:        { paddingVertical: 12 },
  ghostBtnText:    { color: theme.muted, fontSize: 15, fontWeight: '600' },
  scroll:          { padding: 16, gap: 14, paddingBottom: 40 },
  progressTrack:   { height: 4, backgroundColor: alpha(theme.border, 0.5), borderRadius: 2, overflow: 'hidden' },
  progressFill:    { height: 4, borderRadius: 2 },
  questionCard:    { backgroundColor: theme.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 20, gap: 12 },
  topicRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicTag:        { color: theme.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  questionText:    { color: theme.text, fontSize: 16, lineHeight: 24, fontWeight: '600' },
  options:         { gap: 10 },
  optionBase:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: theme.surface, borderWidth: 1.5, borderColor: theme.border, borderRadius: 16, padding: 16 },
  optionCorrect:   { borderColor: theme.success, backgroundColor: alpha(theme.success, 0.08) },
  optionWrong:     { borderColor: '#EF4444', backgroundColor: alpha('#EF4444', 0.08) },
  optionDim:       { opacity: 0.5 },
  optionLabel:     { width: 24, height: 24, borderRadius: 8, backgroundColor: alpha(theme.primary, 0.1), alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionLetter:    { color: theme.primary, fontSize: 12, fontWeight: '900' },
  optionText:      { color: theme.text, fontSize: 15, lineHeight: 22, flex: 1 },
  explanationCard: { backgroundColor: alpha(theme.primary, 0.06), borderRadius: 16, borderWidth: 1, borderColor: alpha(theme.primary, 0.2), padding: 16, gap: 6 },
  explanationLabel:{ color: theme.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  explanationText: { color: theme.text, fontSize: 14, lineHeight: 21 },
  nextBtn:         { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  nextBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
