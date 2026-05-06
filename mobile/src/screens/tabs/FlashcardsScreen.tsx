import { useState, useCallback, useRef } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useTranslation } from 'react-i18next';
import { alpha, getTheme } from '../../theme';
import { ProgressBar } from '../../components/ui';
import { getFlashcards, TOPICS } from '../../services/questionService.js';
import { useAuth } from '../../context/AuthContext';

const API_BASE  = 'https://rbtgenius.com';
const ALL_CARDS = getFlashcards(120);

const DIFFICULTY_KEYS = ['all', 'Easy', 'Medium', 'Hard'] as const;

export default function FlashcardsScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme  = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s      = styles(theme);
  const { user, token } = useAuth();
  const { t } = useTranslation();

  const isPro        = user?.isPremium ?? false;
  const sessionLimit = isPro ? Infinity : (user?.flashcardLimit ?? 15);

  const [filterTopic, setFilterTopic] = useState('all');
  const [filterDiff,  setFilterDiff]  = useState('all');
  const [index,       setIndex]       = useState(0);
  const [flipped,     setFlipped]     = useState(false);
  const [mastered,    setMastered]    = useState(new Set());
  const [reviewing,   setReviewing]   = useState(new Set());
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const submitting = useRef(false);

  const filtered = ALL_CARDS.filter(c => {
    const topicOk = filterTopic === 'all' || c.topic === filterTopic;
    const diffOk  = filterDiff  === 'all' || c.difficulty === filterDiff;
    return topicOk && diffOk && !mastered.has(c.id);
  });

  const totalInDeck = ALL_CARDS.filter(c => {
    const topicOk = filterTopic === 'all' || c.topic === filterTopic;
    const diffOk  = filterDiff  === 'all' || c.difficulty === filterDiff;
    return topicOk && diffOk;
  }).length;

  const safeLen     = Math.max(filtered.length, 1);
  const card        = filtered[index % safeLen] ?? null;
  const limitHit    = !isPro && sessionAnswered >= sessionLimit;
  const allMastered = filtered.length === 0 && totalInDeck > 0;
  const masteredCount = mastered.size;
  const progressPct   = totalInDeck > 0 ? Math.round((masteredCount / totalInDeck) * 100) : 0;

  const submitAttempt = useCallback(async (c, isCorrect) => {
    if (!token || submitting.current) return;
    submitting.current = true;
    try {
      await fetch(`${API_BASE}/api/question-attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          question_id:     c.id,
          is_correct:      isCorrect,
          topic:           c.topic,
          difficulty:      c.difficulty ?? 'Medium',
          selected_answer: isCorrect ? 'A' : 'B',
        }),
      });
      setSessionAnswered(n => n + 1);
    } catch { /* silent */ }
    finally { submitting.current = false; }
  }, [token]);

  const advance = () => {
    setFlipped(false);
    setIndex(i => i % Math.max(filtered.length - 1, 1));
  };

  const flip = () => {
    if (!card) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlipped(f => !f);
  };

  const markGotIt = () => {
    if (!card || limitHit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitAttempt(card, true);
    setMastered(prev => new Set([...prev, card.id]));
    advance();
  };

  const markStudyMore = () => {
    if (!card || limitHit) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    submitAttempt(card, false);
    setReviewing(prev => new Set([...prev, card.id]));
    advance();
  };

  const next = () => { setFlipped(false); setIndex(i => (i + 1) % safeLen); };
  const prev = () => { setFlipped(false); setIndex(i => (i - 1 + safeLen) % safeLen); };

  const resetSession = () => {
    setMastered(new Set());
    setReviewing(new Set());
    setSessionAnswered(0);
    setIndex(0);
    setFlipped(false);
  };

  const changeFilter = (type, val) => {
    if (type === 'topic') setFilterTopic(val);
    else setFilterDiff(val);
    setIndex(0);
    setFlipped(false);
  };

  // ── Limit reached ─────────────────────────────────────────────────────────
  if (limitHit) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}><Text style={s.screenTitle}>{t('flashcards.title')}</Text></View>
        <View style={s.centerWrap}>
          <Text style={s.bigIcon}>{"🎯"}</Text>
          <Text style={s.centerTitle}>{t('flashcards.daily_limit_title')}</Text>
          <Text style={s.centerSub}>
{t('flashcards.session_limit_body', { limit: sessionLimit })}
          </Text>
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

  // ── Session complete ───────────────────────────────────────────────────────
  if (allMastered) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.topBar}><Text style={s.screenTitle}>{t('flashcards.title')}</Text></View>
        <View style={s.centerWrap}>
          <Text style={s.bigIcon}>{"🏆"}</Text>
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

  // ── Main ──────────────────────────────────────────────────────────────────
  const isCardMastered  = card ? mastered.has(card.id)  : false;
  const isCardReviewing = card ? reviewing.has(card.id) : false;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>{t('flashcards.title')}</Text>
        <View style={s.topStatRow}>
          <Text style={s.screenSub}>{t('flashcards.cards_remaining', { index: index + 1, total: filtered.length })}</Text>
          <View style={s.badgeRow}>
            <Text style={[s.badge, { color: theme.success, backgroundColor: alpha(theme.success, 0.1) }]}>{"✓"} {masteredCount}</Text>
            {reviewing.size > 0 && (
              <Text style={[s.badge, { color: theme.gold, backgroundColor: alpha(theme.gold, 0.1) }]}>{"↩"} {reviewing.size}</Text>
            )}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.progressWrap}>
          <ProgressBar color={theme.success} progress={progressPct} theme={theme} />
          <Text style={s.progressLabel}>{t('flashcard_ui.progress_label', { pct: progressPct, total: totalInDeck })}</Text>
        </View>

        {!isPro && (
          <Text style={s.limitNote}>{t('flashcard_ui.session_note', { answered: sessionAnswered, limit: sessionLimit })}</Text>
        )}

        {/* Topic pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll}>
          <Pressable onPress={() => changeFilter('topic', 'all')}
            style={[s.pill, filterTopic === 'all' && s.pillActive]}>
            <Text style={[s.pillText, filterTopic === 'all' && { color: theme.primary }]}>{t('flashcard_ui.all_topics')}</Text>
          </Pressable>
          {TOPICS.map(tp => (
            <Pressable key={tp.key} onPress={() => changeFilter('topic', tp.key)}
              style={[s.pill, filterTopic === tp.key && s.pillActive]}>
              <Text style={[s.pillText, filterTopic === tp.key && { color: theme.primary }]}>{t(`domains.${tp.key}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Difficulty pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pillScroll}>
          {DIFFICULTY_KEYS.map(key => (
            <Pressable key={key} onPress={() => changeFilter('diff', key)}
              style={[s.pill, filterDiff === key && { backgroundColor: alpha('#7C3AED', 0.1), borderColor: alpha('#7C3AED', 0.35) }]}>
              <Text style={[s.pillText, filterDiff === key && { color: '#7C3AED' }]}>{t(`difficulties.${key.toLowerCase()}`)}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Card */}
        {card && (
          <Pressable onPress={flip} style={[
            s.card,
            flipped && { backgroundColor: alpha(theme.primary, 0.05), borderColor: alpha(theme.primary, 0.3) },
            isCardMastered  && { borderColor: alpha(theme.success, 0.5) },
            isCardReviewing && !isCardMastered && { borderColor: alpha(theme.gold, 0.5) },
          ]}>
            {(isCardMastered || isCardReviewing) && (
              <View style={[s.cardBadge, { backgroundColor: isCardMastered ? alpha(theme.success, 0.1) : alpha(theme.gold, 0.1) }]}>
                <Text style={[s.cardBadgeText, { color: isCardMastered ? theme.success : theme.gold }]}>
                  {isCardMastered ? t('flashcard_ui.mastered_badge') : t('flashcard_ui.review_badge')}
                </Text>
              </View>
            )}
            <Text style={s.cardDomain}>{card.domain}</Text>
            <View style={s.cardBody}>
              <Text style={s.cardSide}>{flipped ? t('flashcard_ui.answer') : t('flashcard_ui.concept')}</Text>
              <Text style={s.cardText}>{flipped ? card.answer : card.question}</Text>
              {flipped && card.explanation ? (
                <Text style={s.cardExplanation}>{card.explanation}</Text>
              ) : null}
            </View>
            <Text style={s.cardHint}>{flipped ? t('flashcard_ui.tap_for_concept') : t('flashcard_ui.tap_for_answer')}</Text>
          </Pressable>
        )}

        {/* Action buttons — solo despues de flip */}
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
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe:             { flex: 1, backgroundColor: theme.background },
  topBar:           { paddingHorizontal: 20, paddingVertical: 12, borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1 },
  screenTitle:      { color: theme.text, fontSize: 18, fontWeight: '800' },
  topStatRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  screenSub:        { color: theme.muted, fontSize: 12 },
  badgeRow:         { flexDirection: 'row', gap: 6 },
  badge:            { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  content:          { padding: 20, gap: 14, paddingBottom: 40 },
  progressWrap:     { gap: 6 },
  progressLabel:    { color: theme.muted, fontSize: 11, textAlign: 'right' },
  limitNote:        { color: theme.primary, fontSize: 12, fontWeight: '600', textAlign: 'center', backgroundColor: alpha(theme.primary, 0.06), padding: 8, borderRadius: 10 },
  pillScroll:       { flexGrow: 0, marginHorizontal: -20, paddingHorizontal: 20 },
  pill:             { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  pillActive:       { backgroundColor: alpha(theme.primary, 0.12), borderColor: alpha(theme.primary, 0.4) },
  pillText:         { color: theme.muted, fontSize: 12, fontWeight: '700' },
  card:             { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5, borderRadius: 28, padding: 26, minHeight: 260, gap: 14, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.1, shadowRadius: 24 },
  cardBadge:        { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  cardBadgeText:    { fontSize: 11, fontWeight: '800' },
  cardDomain:       { color: theme.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  cardBody:         { flex: 1, gap: 8 },
  cardSide:         { color: theme.muted, fontSize: 12, fontWeight: '700' },
  cardText:         { color: theme.text, fontSize: 22, fontWeight: '900', lineHeight: 30 },
  cardExplanation:  { color: theme.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  cardHint:         { color: theme.muted, fontSize: 12, textAlign: 'center' },
  actionRow:        { flexDirection: 'row', gap: 12 },
  actionBtn:        { flex: 1, borderRadius: 18, paddingVertical: 18, alignItems: 'center', borderWidth: 1.5 },
  actionReview:     { borderColor: alpha(theme.gold, 0.5), backgroundColor: alpha(theme.gold, 0.06) },
  actionReviewText: { color: theme.gold, fontSize: 15, fontWeight: '800' },
  actionGotIt:      { borderColor: alpha(theme.success, 0.5), backgroundColor: alpha(theme.success, 0.08) },
  actionGotItText:  { color: theme.success, fontSize: 15, fontWeight: '800' },
  navRow:           { flexDirection: 'row', gap: 12 },
  navBtn:           { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
  navBtnPrimary:    { backgroundColor: theme.primary, borderColor: theme.primary },
  navBtnText:       { color: theme.text, fontSize: 14, fontWeight: '700' },
  textBtn:          { alignItems: 'center', paddingVertical: 10 },
  textBtnText:      { color: theme.muted, fontSize: 13, fontWeight: '600' },
  centerWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 16 },
  bigIcon:          { fontSize: 60 },
  centerTitle:      { color: theme.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  centerSub:        { color: theme.muted, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  completionStats:  { flexDirection: 'row', gap: 24, marginVertical: 8 },
  statPill:         { alignItems: 'center', gap: 4 },
  statVal:          { fontSize: 32, fontWeight: '900' },
  statLabel:        { color: theme.muted, fontSize: 12, fontWeight: '600' },
  bigBtn:           { borderRadius: 18, paddingVertical: 16, paddingHorizontal: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 14 },
  bigBtnText:       { color: '#fff', fontSize: 16, fontWeight: '800' },
});
