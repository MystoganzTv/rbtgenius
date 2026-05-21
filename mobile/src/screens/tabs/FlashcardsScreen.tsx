// @ts-nocheck
import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { alpha, getTheme } from '../../theme';
import TranslationSheet, { TranslationTrigger } from '../../components/i18n/TranslationSheet.jsx';
import { buildQuestionTranslationContent, getSpanishForOptionText } from '../../lib/questions/reviewed-question-translations.js';
import { ProgressBar } from '../../components/ui';
import { getFlashcards, TOPICS } from '../../services/questionService.js';
import { useAuth } from '../../context/AuthContext';

const API_BASE = 'https://www.rbtgenius.com';
type Theme = any;
type Navigation = any;
type TranslateFn = (key: string, options?: any) => string;

type DifficultyKey = 'all' | 'Easy' | 'Medium' | 'Hard';

interface FlashcardItem {
  id: string | number;
  domain: string;
  topic: string;
  question: string;
  answer: string;
  explanation?: string;
  difficulty?: DifficultyKey | string;
  _raw?: any;
}

interface TranslationPanelState {
  title: string;
  englishText: string;
  spanishText: string;
}

interface TranslationContent {
  spanishText?: string;
  explanationSpanish?: string;
  options?: Array<{ english: string; spanish: string }>;
}

const ALL_CARDS = getFlashcards(120) as FlashcardItem[];
const DIFFICULTY_KEYS: DifficultyKey[] = ['all', 'Easy', 'Medium', 'Hard'];

export default function FlashcardsScreen({ navigation }: { navigation?: Navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const auth = useAuth() as { user?: { isPremium?: boolean; flashcardLimit?: number } | null; token?: string | null } | null;
  const user = auth?.user ?? null;
  const token = auth?.token ?? '';
  const { t: rawT, i18n } = useTranslation();
  const t = rawT as unknown as TranslateFn;

  const isPro = user?.isPremium ?? false;
  const sessionLimit = isPro ? Infinity : (user?.flashcardLimit ?? 15);

  const [filterTopic, setFilterTopic] = useState('all');
  const [filterDiff, setFilterDiff] = useState<DifficultyKey>('all');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mastered, setMastered] = useState<Set<string | number>>(new Set());
  const [reviewing, setReviewing] = useState<Set<string | number>>(new Set());
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [translationPanel, setTranslationPanel] = useState<TranslationPanelState | null>(null);
  const submitting = useRef(false);

  const filtered = ALL_CARDS.filter((card) => {
    const topicOk = filterTopic === 'all' || card.topic === filterTopic;
    const diffOk = filterDiff === 'all' || card.difficulty === filterDiff;
    return topicOk && diffOk && !mastered.has(card.id);
  });

  const totalInDeck = ALL_CARDS.filter((card) => {
    const topicOk = filterTopic === 'all' || card.topic === filterTopic;
    const diffOk = filterDiff === 'all' || card.difficulty === filterDiff;
    return topicOk && diffOk;
  }).length;

  const safeLen = Math.max(filtered.length, 1);
  const card = filtered[index % safeLen] ?? null;
  const limitHit = !isPro && sessionAnswered >= sessionLimit;
  const allMastered = filtered.length === 0 && totalInDeck > 0;
  const masteredCount = mastered.size;
  const progressPct = totalInDeck > 0 ? Math.round((masteredCount / totalInDeck) * 100) : 0;
  const isCardMastered = card ? mastered.has(card.id) : false;
  const isCardReviewing = card ? reviewing.has(card.id) : false;
  const translationContent = useMemo<TranslationContent | null>(
    () => (card?._raw ? (buildQuestionTranslationContent(card._raw) as TranslationContent | null) : null),
    [card?._raw],
  );

  const submitAttempt = useCallback(async (currentCard: FlashcardItem, isCorrect: boolean) => {
    if (!token || submitting.current) return;
    submitting.current = true;
    try {
      await fetch(`${API_BASE}/api/question-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question_id: currentCard.id,
          is_correct: isCorrect,
          topic: currentCard.topic,
          difficulty: currentCard.difficulty ?? 'Medium',
          selected_answer: isCorrect ? 'A' : 'B',
        }),
      });
      setSessionAnswered((count) => count + 1);
    } catch {
      // silent
    } finally {
      submitting.current = false;
    }
  }, [token]);

  const advance = () => {
    setFlipped(false);
    setTranslationPanel(null);
    setIndex((current) => current % Math.max(filtered.length - 1, 1));
  };

  const flip = () => {
    if (!card) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlipped((current) => !current);
  };

  const markGotIt = () => {
    if (!card || limitHit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitAttempt(card, true);
    setMastered((prev) => new Set([...prev, card.id]));
    advance();
  };

  const markStudyMore = () => {
    if (!card || limitHit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitAttempt(card, false);
    setReviewing((prev) => new Set([...prev, card.id]));
    advance();
  };

  const next = () => {
    setFlipped(false);
    setTranslationPanel(null);
    setIndex((current) => (current + 1) % safeLen);
  };

  const prev = () => {
    setFlipped(false);
    setTranslationPanel(null);
    setIndex((current) => (current - 1 + safeLen) % safeLen);
  };

  const resetSession = () => {
    setMastered(new Set());
    setReviewing(new Set());
    setSessionAnswered(0);
    setIndex(0);
    setFlipped(false);
    setTranslationPanel(null);
  };

  const changeFilter = (type: 'topic' | 'diff', value: string) => {
    if (type === 'topic') {
      setFilterTopic(value);
    } else {
      setFilterDiff(value as DifficultyKey);
    }
    setIndex(0);
    setFlipped(false);
    setTranslationPanel(null);
  };

  if (limitHit) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}><Text style={s.screenTitle}>{t('flashcards.title')}</Text></View>
        <View style={s.centerWrap}>
          <Text style={s.bigIcon}>🎯</Text>
          <Text style={s.centerTitle}>{t('flashcards.daily_limit_title')}</Text>
          <Text style={s.centerSub}>{t('flashcards.session_limit_body', { limit: sessionLimit })}</Text>
          <Pressable style={[s.bigBtn, { backgroundColor: theme.primary }]} onPress={() => navigation?.navigate('More', { screen: 'Upgrade' })}>
            <Text style={s.bigBtnText}>{t('upgrade.cta')}</Text>
          </Pressable>
          <Pressable style={s.textBtn} onPress={resetSession}>
            <Text style={s.textBtnText}>{t('flashcards.restart_btn')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (allMastered) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}><Text style={s.screenTitle}>{t('flashcards.title')}</Text></View>
        <View style={s.centerWrap}>
          <Text style={s.bigIcon}>🏆</Text>
          <Text style={s.centerTitle}>{t('flashcards.session_complete')}</Text>
          <Text style={s.centerSub}>
            {t('flashcards.mastered_count', { count: masteredCount, plural: masteredCount !== 1 ? 's' : '' })} {reviewing.size > 0 ? t('flashcards.to_review_note', { count: reviewing.size }) : t('flashcards.great_work')}
          </Text>
          <View style={s.completionStats}>
            <View style={s.statPill}>
              <Text style={[s.statVal, { color: theme.success }]}>{masteredCount}</Text>
              <Text style={s.statLabel}>{t('flashcards.mastered_section')}</Text>
            </View>
            <View style={s.statPill}>
              <Text style={[s.statVal, { color: theme.gold }]}>{reviewing.size}</Text>
              <Text style={s.statLabel}>{t('flashcards.to_review_section')}</Text>
            </View>
          </View>
          <Pressable style={[s.bigBtn, { backgroundColor: theme.primary }]} onPress={resetSession}>
            <Text style={s.bigBtnText}>{t('flashcards.new_session')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>{t('flashcards.title')}</Text>
        <View style={s.topStatRow}>
          <Text style={s.screenSub}>{t('flashcards.cards_remaining', { index: index + 1, total: filtered.length })}</Text>
          <View style={s.badgeRow}>
            <Text style={[s.badge, { color: theme.success, backgroundColor: alpha(theme.success, 0.1) }]}>✓ {masteredCount}</Text>
            {reviewing.size > 0 && (
              <Text style={[s.badge, { color: theme.gold, backgroundColor: alpha(theme.gold, 0.1) }]}>↩ {reviewing.size}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.progressWrap}>
          <ProgressBar color={theme.success} progress={progressPct} theme={theme} />
          <Text style={s.progressLabel}>{t('flashcard_ui.progress_label', { pct: progressPct, total: totalInDeck })}</Text>
        </View>

        {!isPro && <Text style={s.limitNote}>{t('flashcard_ui.session_note', { answered: sessionAnswered, limit: sessionLimit })}</Text>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll}>
          <Pressable onPress={() => changeFilter('topic', 'all')} style={[s.pill, filterTopic === 'all' && s.pillActive]}>
            <Text style={[s.pillText, filterTopic === 'all' && { color: theme.primary }]}>{t('flashcard_ui.all_topics')}</Text>
          </Pressable>
          {TOPICS.map((topic) => (
            <Pressable key={topic.key} onPress={() => changeFilter('topic', topic.key)} style={[s.pill, filterTopic === topic.key && s.pillActive]}>
              <Text style={[s.pillText, filterTopic === topic.key && { color: theme.primary }]}>{t(`domains.${topic.key}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll}>
          {DIFFICULTY_KEYS.map((key) => (
            <Pressable key={key} onPress={() => changeFilter('diff', key)} style={[s.pill, filterDiff === key && { backgroundColor: alpha('#7C3AED', 0.1), borderColor: alpha('#7C3AED', 0.35) }]}>
              <Text style={[s.pillText, filterDiff === key && { color: '#7C3AED' }]}>{t(`difficulties.${key.toLowerCase()}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {card && (
          <Pressable
            onPress={flip}
            style={[
              s.card,
              flipped && { backgroundColor: alpha(theme.primary, 0.05), borderColor: alpha(theme.primary, 0.3) },
              isCardMastered && { borderColor: alpha(theme.success, 0.5) },
              isCardReviewing && !isCardMastered && { borderColor: alpha(theme.gold, 0.5) },
            ]}
          >
            {(isCardMastered || isCardReviewing) && (
              <View style={[s.cardBadge, { backgroundColor: isCardMastered ? alpha(theme.success, 0.1) : alpha(theme.gold, 0.1) }]}>
                <Text style={[s.cardBadgeText, { color: isCardMastered ? theme.success : theme.gold }]}>
                  {isCardMastered ? t('flashcard_ui.mastered_badge') : t('flashcard_ui.review_badge')}
                </Text>
              </View>
            )}
            <View style={s.translateRow}>
              <Text style={s.cardDomain}>{card.domain}</Text>
              <TranslationTrigger
                theme={theme}
                onPress={() => setTranslationPanel({
                  title: i18n.language === 'es' ? (flipped ? 'Traducción de la respuesta' : 'Traducción de la tarjeta') : (flipped ? 'Answer Translation' : 'Flashcard Translation'),
                  englishText: flipped ? (card.answer || '') : (card.question || ''),
                  spanishText: flipped
                    ? (translationContent?.options?.find((option) => option.english === card.answer)?.spanish || getSpanishForOptionText(card.answer) || '')
                    : (translationContent?.spanishText || ''),
                })}
              />
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardSide}>{flipped ? t('flashcard_ui.answer') : t('flashcard_ui.concept')}</Text>
              <Text style={s.cardText}>{flipped ? card.answer : card.question}</Text>
              {flipped && card.explanation ? (
                <View style={s.explanationWrap}>
                  <Text style={s.cardExplanation}>{card.explanation}</Text>
                  <TranslationTrigger
                    theme={theme}
                    onPress={() => setTranslationPanel({
                      title: i18n.language === 'es' ? 'Traducción de la explicación' : 'Explanation Translation',
                      englishText: card.explanation || '',
                      spanishText: translationContent?.explanationSpanish || '',
                    })}
                  />
                </View>
              ) : null}
            </View>
            <Text style={s.cardHint}>{flipped ? t('flashcard_ui.tap_for_concept') : t('flashcard_ui.tap_for_answer')}</Text>
          </Pressable>
        )}

        {flipped && card && (
          <View style={s.actionRow}>
            <Pressable style={[s.actionBtn, s.actionReview]} onPress={markStudyMore}>
              <Text style={s.actionReviewText}>{t('flashcard_ui.study_more')}</Text>
            </Pressable>
            <Pressable style={[s.actionBtn, s.actionGotIt]} onPress={markGotIt}>
              <Text style={s.actionGotItText}>{t('flashcards.mastered_label')}</Text>
            </Pressable>
          </View>
        )}

        <View style={s.navRow}>
          <Pressable style={s.navBtn} onPress={prev}>
            <Text style={s.navBtnText}>{t('flashcard_ui.prev')}</Text>
          </Pressable>
          <Pressable style={[s.navBtn, s.navBtnPrimary]} onPress={next}>
            <Text style={[s.navBtnText, { color: '#fff' }]}>{t('flashcards.next_arrow')}</Text>
          </Pressable>
        </View>

        <Pressable style={s.textBtn} onPress={resetSession}>
          <Text style={s.textBtnText}>{t('flashcards.restart_btn')}</Text>
        </Pressable>
      </ScrollView>

      <TranslationSheet
        visible={Boolean(translationPanel)}
        onClose={() => setTranslationPanel(null)}
        theme={theme}
        title={translationPanel?.title || (i18n.language === 'es' ? 'Traducción' : 'Translation')}
        englishText={translationPanel?.englishText || ''}
        spanishText={translationPanel?.spanishText || ''}
        unavailableLabel={i18n.language === 'es' ? 'La traducción al español aún no está disponible para este bloque.' : 'Spanish translation is not available yet for this section.'}
      />
    </SafeAreaView>
  );
}

const styles = (theme: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  topBar: { paddingHorizontal: 20, paddingVertical: 14, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
  screenSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  topStatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  content: { padding: 20, gap: 14, paddingBottom: 34 },
  progressWrap: { gap: 6 },
  progressLabel: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  limitNote: { color: theme.gold, fontSize: 12, fontWeight: '700' },
  pillScroll: { marginTop: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: alpha(theme.border, 0.7), backgroundColor: theme.surface, marginRight: 8 },
  pillActive: { backgroundColor: alpha(theme.primary, 0.1), borderColor: alpha(theme.primary, 0.35) },
  pillText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 26, minHeight: 320, padding: 22, gap: 18, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.08, shadowRadius: 18 },
  cardBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
  cardBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  translateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardDomain: { color: theme.primary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  cardBody: { flex: 1, justifyContent: 'center', gap: 14 },
  cardSide: { color: theme.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  cardText: { color: theme.text, fontSize: 28, fontWeight: '800', lineHeight: 38 },
  explanationWrap: { gap: 10, marginTop: 8 },
  cardExplanation: { color: theme.muted, fontSize: 14, lineHeight: 22 },
  cardHint: { textAlign: 'center', color: theme.muted, fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  actionReview: { backgroundColor: alpha(theme.gold, 0.14), borderWidth: 1, borderColor: alpha(theme.gold, 0.32) },
  actionGotIt: { backgroundColor: theme.success },
  actionReviewText: { color: theme.gold, fontSize: 15, fontWeight: '800' },
  actionGotItText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  navRow: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingVertical: 14, alignItems: 'center' },
  navBtnPrimary: { backgroundColor: theme.primary, borderColor: theme.primary },
  navBtnText: { color: theme.text, fontSize: 14, fontWeight: '800' },
  textBtn: { alignItems: 'center', paddingVertical: 10 },
  textBtnText: { color: theme.muted, fontSize: 13, fontWeight: '700' },
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 14 },
  bigIcon: { fontSize: 42 },
  centerTitle: { color: theme.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  centerSub: { color: theme.muted, fontSize: 14, lineHeight: 22, textAlign: 'center' },
  bigBtn: { minWidth: 220, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 26, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  completionStats: { flexDirection: 'row', gap: 12 },
  statPill: { minWidth: 110, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 22, fontWeight: '900' },
  statLabel: { color: theme.muted, fontSize: 11, fontWeight: '700' },
});
