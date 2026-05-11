import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { isAvailableAsync, requestReview } from 'expo-store-review';

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { alpha, getTheme } from '../../theme';
import { MetricCard } from '../../components/ui';
import { setupNotifications } from '../../services/NotificationService';
import { changeLanguage } from '../../i18n';

const API_BASE = 'https://www.rbtgenius.com';
const NOTIF_KEY = 'rbt_notifications_enabled';
const LANG_KEY = 'rbt_language';
const EXAM_DATE_KEY = 'rbt_exam_date';
const STUDY_GOAL_KEY = 'rbt_study_goal';
const SUPPORT_EMAIL = 'support@rbtgenius.com';

function daysUntilExam(dateStr: string): number | null {
  if (!dateStr) return null;
  const [month, day, year] = dateStr.split('/').map(Number);
  if (!month || !day || !year || year < 2020) return null;
  const exam = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exam.setHours(0, 0, 0, 0);
  return Math.round((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isValidDate(str: string): boolean {
  const parts = str.split('/');
  if (parts.length !== 3) return false;
  const [m, d, y] = parts.map(Number);
  if (!m || !d || !y) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2024) return false;
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d;
}

const GOAL_OPTIONS = [5, 10, 15, 20, 30, 50];

export default function ProfileScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user, token, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const s = styles(theme);

  // ── Server data ────────────────────────────────────────────────
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [badges, setBadges] = useState([]);

  // ── Edit modal ─────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Settings ──────────────────────────────────────────────────
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [language, setLanguage] = useState('en');
  const [examDate, setExamDate] = useState('');
  const [examDateInput, setExamDateInput] = useState('');
  const [examDateVisible, setExamDateVisible] = useState(false);
  const [studyGoal, setStudyGoal] = useState(15);
  const [goalVisible, setGoalVisible] = useState(false);

  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchProfile();
    fetchBadges();
    AsyncStorage.getItem(NOTIF_KEY).then((v) => { if (v !== null) setNotificationsOn(v === 'true'); });
    AsyncStorage.getItem(LANG_KEY).then((v) => { if (v) setLanguage(v); });
    AsyncStorage.getItem(EXAM_DATE_KEY).then((v) => { if (v) setExamDate(v); });
    AsyncStorage.getItem(STUDY_GOAL_KEY).then((v) => { if (v) setStudyGoal(Number(v)); });
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/profile`, { headers: authHeaders });
      if (res.ok) setProfile(await res.json());
    } catch { /* fallback to auth context */ }
    finally { setLoadingProfile(false); }
  };

  const fetchBadges = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.badges)) setBadges(data.badges);
      }
    } catch { /* no badges */ }
  };

  // Derived values
  const displayName = profile?.user?.full_name ?? user?.name ?? 'Student';
  const displayEmail = profile?.user?.email ?? user?.email ?? '';
  const isPro = profile?.entitlements?.is_premium ?? user?.isPremium ?? false;
  const progress = profile?.progress ?? {};
  const readiness = Math.round(progress.readiness_score ?? user?.readiness ?? 0);
  const streak = progress.study_streak_days ?? user?.streak ?? 0;
  const completed = progress.total_questions_completed ?? user?.completedQuestions ?? 0;
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const daysLeft = daysUntilExam(examDate);

  // ── Edit profile ───────────────────────────────────────────────
  const openEdit = () => {
    setEditName(displayName);
    setEditVisible(true);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/profile`, {
        method: 'PATCH',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) => prev
          ? { ...prev, user: { ...prev.user, full_name: updated.full_name } }
          : prev);
        setEditVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(t('common.error'), t('profile.error_save'));
      }
    } catch {
      Alert.alert(t('common.error'), t('common.network_error'));
    } finally {
      setSaving(false);
    }
  };

  // ── Notifications ──────────────────────────────────────────────
  const toggleNotifications = async (val: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const granted = await setupNotifications(val, token);
    const effective = val ? granted : false;
    setNotificationsOn(effective);
    AsyncStorage.setItem(NOTIF_KEY, String(effective));
    if (val && !granted) {
      Alert.alert(t('profile.permissions_required'), t('profile.permissions_body'));
    }
  };

  // ── Language ───────────────────────────────────────────────────
  const toggleLanguage = (val: boolean) => {
    const next = val ? 'es' : 'en';
    setLanguage(next);
    changeLanguage(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Exam date ──────────────────────────────────────────────────
  const openExamDate = () => {
    setExamDateInput(examDate);
    setExamDateVisible(true);
  };

  const saveExamDate = () => {
    const raw = examDateInput.trim();
    if (!raw) {
      setExamDate('');
      AsyncStorage.removeItem(EXAM_DATE_KEY);
      setExamDateVisible(false);
      return;
    }
    if (!isValidDate(raw)) {
      Alert.alert(t('common.error'), t('profile.exam_date_invalid'));
      return;
    }
    setExamDate(raw);
    AsyncStorage.setItem(EXAM_DATE_KEY, raw);
    setExamDateVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Study goal ─────────────────────────────────────────────────
  const saveGoal = (val: number) => {
    setStudyGoal(val);
    AsyncStorage.setItem(STUDY_GOAL_KEY, String(val));
    setGoalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Share & contact ────────────────────────────────────────────
  const handleShare = async () => {
    try {
      await Share.share({ message: t('profile.share_message') });
    } catch { /* dismissed */ }
  };

  const handleContact = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=RBT Genius Support`);
  };

  const handleRateApp = async () => {
    const available = await isAvailableAsync();
    if (available) {
      requestReview();
    } else {
      Linking.openURL('https://www.rbtgenius.com');
    }
  };

  // ── Reset progress ─────────────────────────────────────────────
  const handleReset = () => {
    Alert.alert(
      t('profile.reset_confirm_title'),
      t('profile.reset_confirm_body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.reset_progress'),
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/profile/reset-progress`, {
                method: 'POST',
                headers: authHeaders,
              });
              if (res.ok) {
                const data = await res.json();
                setProfile(data);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                Alert.alert(t('common.done'), t('profile.reset_success'));
              }
            } catch {
              Alert.alert(t('common.error'), t('common.network_error'));
            }
          },
        },
      ]
    );
  };

  // ── Sign out ───────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(t('profile.sign_out'), t('profile.sign_out_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.sign_out'), style: 'destructive', onPress: logout },
    ]);
  };

  const earnedCount = badges.filter((b) => b.unlocked).length;

  // ── Exam countdown chip color ──────────────────────────────────
  const countdownColor =
    daysLeft === null ? theme.muted
    : daysLeft <= 0 ? '#EF4444'
    : daysLeft <= 14 ? '#D97706'
    : '#059669';

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>{t('profile.title')}</Text>
        <Text style={s.screenSub}>{t('profile.subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar card ── */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileEmail}>{displayEmail}</Text>
            <View style={[s.planBadge, { backgroundColor: alpha(theme.gold, 0.15) }]}>
              <Text style={[s.planBadgeText, { color: theme.gold }]}>
                {isPro ? t('common.pro') : t('common.free')}
              </Text>
            </View>
          </View>
          <Pressable style={s.editBtn} onPress={openEdit}>
            <Text style={s.editBtnText}>{t('profile.edit')}</Text>
          </Pressable>
        </View>

        {/* ── Exam countdown banner ── */}
        <Pressable style={[s.examBanner, { borderColor: alpha(countdownColor, 0.35), backgroundColor: alpha(countdownColor, 0.06) }]} onPress={openExamDate}>
          <Text style={s.examBannerEmoji}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={[s.examBannerTitle, { color: countdownColor }]}>
              {daysLeft === null
                ? t('profile.exam_date_set')
                : daysLeft === 0
                  ? t('profile.exam_today')
                  : daysLeft < 0
                    ? t('profile.exam_passed')
                    : t('profile.days_until_exam', { days: daysLeft })}
            </Text>
            <Text style={s.examBannerSub}>
              {examDate || t('profile.exam_date_sub')}
            </Text>
          </View>
          <Text style={[s.chevron, { color: countdownColor }]}>›</Text>
        </Pressable>

        {/* ── Stats grid ── */}
        {loadingProfile ? (
          <View style={s.loadingRow}><ActivityIndicator color={theme.primary} /></View>
        ) : (
          <View style={s.metricGrid}>
            <MetricCard accent="primary" label={t('profile.readiness')} value={`${readiness}%`} theme={theme} />
            <MetricCard accent="gold" label={t('profile.streak')} value={`${streak} ${t('profile.days')}`} theme={theme} />
            <MetricCard accent="success" label={t('profile.questions')} value={completed.toLocaleString()} theme={theme} />
            <MetricCard accent="primary" label={t('profile.plan')} value={isPro ? t('common.pro') : t('common.free')} theme={theme} />
          </View>
        )}

        {/* ── Badges ── */}
        {badges.length > 0 && (
          <>
            <View style={s.sectionLabel}>
              <Text style={s.sectionLabelText}>{t('profile.achievements')}</Text>
              <Text style={s.sectionLabelCount}>{earnedCount}/{badges.length}</Text>
            </View>
            <View style={s.card}>
              {badges.map((badge) => (
                <View key={badge.id} style={[s.badgeItem, !badge.unlocked && s.badgeLocked]}>
                  <Text style={[s.badgeEmoji, !badge.unlocked && { opacity: 0.3 }]}>{badge.emoji ?? '🏅'}</Text>
                  <View style={s.badgeInfo}>
                    <Text style={[s.badgeLabel, !badge.unlocked && { color: theme.muted }]}>{badge.label}</Text>
                    <Text style={s.badgeDesc}>{badge.description}</Text>
                  </View>
                  <View style={[s.badgeStatus, { backgroundColor: badge.unlocked ? alpha('#059669', 0.12) : alpha(theme.border, 0.5) }]}>
                    <Text style={[s.badgeStatusText, { color: badge.unlocked ? '#059669' : theme.muted }]}>
                      {badge.unlocked ? '✓' : '🔒'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ── Settings ── */}
        <View style={s.sectionLabel}><Text style={s.sectionLabelText}>{t('profile.settings')}</Text></View>
        <View style={s.card}>

          {/* Notifications */}
          <View style={s.settingRow}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.notifications')}</Text>
              <Text style={s.settingSub}>{t('profile.notifications_sub')}</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={toggleNotifications}
              trackColor={{ false: alpha(theme.border, 0.8), true: alpha(theme.primary, 0.4) }}
              thumbColor={notificationsOn ? theme.primary : theme.muted}
            />
          </View>

          <View style={s.divider} />

          {/* Language */}
          <View style={s.settingRow}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.language')}</Text>
              <Text style={s.settingSub}>{i18n.language === 'es' ? '🇪🇸 Español' : '🇺🇸 English'}</Text>
            </View>
            <Switch
              value={i18n.language === 'es'}
              onValueChange={toggleLanguage}
              trackColor={{ false: alpha(theme.border, 0.8), true: alpha(theme.primary, 0.4) }}
              thumbColor={i18n.language === 'es' ? theme.primary : theme.muted}
            />
          </View>

          <View style={s.divider} />

          {/* Study goal */}
          <Pressable style={s.settingRow} onPress={() => setGoalVisible(true)}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.study_goal')}</Text>
              <Text style={s.settingSub}>{t('profile.study_goal_label', { count: studyGoal })}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

        </View>

        {/* ── App ── */}
        <View style={s.sectionLabel}><Text style={s.sectionLabelText}>App</Text></View>
        <View style={s.card}>

          <Pressable style={s.settingRow} onPress={handleShare}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.share_app')}</Text>
              <Text style={s.settingSub}>{t('profile.share_app_sub')}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

          <View style={s.divider} />

          <Pressable style={s.settingRow} onPress={handleRateApp}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.rate_app')}</Text>
              <Text style={s.settingSub}>{t('profile.rate_sub')}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

          <View style={s.divider} />

          <Pressable style={s.settingRow} onPress={handleContact}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.contact_support')}</Text>
              <Text style={s.settingSub}>{t('profile.contact_sub')}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

        </View>

        {/* ── Legal ── */}
        <View style={s.sectionLabel}><Text style={s.sectionLabelText}>Legal</Text></View>
        <View style={s.card}>

          <Pressable style={s.settingRow} onPress={() => navigation.navigate('Legal', { type: 'privacy' })}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.privacy_policy')}</Text>
              <Text style={s.settingSub}>{t('profile.privacy_sub')}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

          <View style={s.divider} />

          <Pressable style={s.settingRow} onPress={() => navigation.navigate('Legal', { type: 'terms' })}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.terms')}</Text>
              <Text style={s.settingSub}>{t('profile.terms_sub')}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

          <View style={s.divider} />

          <Pressable style={s.settingRow} onPress={() => navigation.navigate('Legal', { type: 'refund' })}>
            <View style={s.settingCopy}>
              <Text style={s.settingLabel}>{t('profile.refund_policy')}</Text>
              <Text style={s.settingSub}>{t('profile.refund_sub')}</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </Pressable>

        </View>

        {/* ── Danger zone ── */}
        <View style={s.sectionLabel}><Text style={s.sectionLabelText}>{t('profile.danger_zone')}</Text></View>
        <Pressable style={s.dangerBtn} onPress={handleReset}>
          <Text style={s.dangerBtnText}>{t('profile.reset_progress')}</Text>
        </Pressable>

        <Pressable style={s.logoutBtn} onPress={handleLogout}>
          <Text style={s.logoutText}>{t('profile.sign_out')}</Text>
        </Pressable>

        <Text style={s.version}>{t('profile.version')} · {isPro ? t('common.pro') : t('common.free')}</Text>
      </ScrollView>

      {/* ── Edit profile modal ── */}
      <Modal visible={editVisible} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('profile.edit_profile')}</Text>
              <Pressable onPress={() => setEditVisible(false)}>
                <Text style={s.modalClose}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>{t('profile.full_name')}</Text>
              <TextInput
                style={s.fieldInput}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('profile.full_name')}
                placeholderTextColor={theme.muted}
                autoCapitalize="words"
                autoFocus
              />
            </View>
            <Pressable style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.saveBtnText}>{t('profile.save_changes')}</Text>
              }
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Exam date modal ── */}
      <Modal visible={examDateVisible} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('profile.exam_date')}</Text>
              <Pressable onPress={() => setExamDateVisible(false)}>
                <Text style={s.modalClose}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <View style={s.modalBody}>
              <Text style={s.fieldLabel}>{t('profile.exam_date_sub')}</Text>
              <TextInput
                style={s.fieldInput}
                value={examDateInput}
                onChangeText={(v) => {
                  // auto-insert slashes
                  let clean = v.replace(/[^0-9]/g, '');
                  if (clean.length > 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
                  if (clean.length > 5) clean = clean.slice(0, 5) + '/' + clean.slice(5);
                  setExamDateInput(clean.slice(0, 10));
                }}
                placeholder={t('profile.exam_date_placeholder')}
                placeholderTextColor={theme.muted}
                keyboardType="numeric"
                autoFocus
                maxLength={10}
              />
              {examDate ? (
                <Pressable onPress={() => { setExamDate(''); AsyncStorage.removeItem(EXAM_DATE_KEY); setExamDateVisible(false); }}>
                  <Text style={[s.clearDate, { color: '#EF4444' }]}>✕ {t('profile.exam_passed')}</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable style={s.saveBtn} onPress={saveExamDate}>
              <Text style={s.saveBtnText}>{t('profile.save_changes')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── Study goal modal ── */}
      <Modal visible={goalVisible} animationType="slide" transparent presentationStyle="pageSheet">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{t('profile.study_goal_title')}</Text>
              <Pressable onPress={() => setGoalVisible(false)}>
                <Text style={s.modalClose}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
            <View style={[s.modalBody, { gap: 10 }]}>
              {GOAL_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[s.goalOption, studyGoal === opt && { borderColor: theme.primary, backgroundColor: alpha(theme.primary, 0.08) }]}
                  onPress={() => saveGoal(opt)}
                >
                  <Text style={[s.goalOptionText, studyGoal === opt && { color: theme.primary }]}>
                    {t('profile.study_goal_label', { count: opt })}
                  </Text>
                  {studyGoal === opt && <Text style={{ color: theme.primary, fontSize: 16 }}>✓</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
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
    screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
    screenSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
    content: { padding: 20, gap: 12, paddingBottom: 40 },

    profileCard: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14,
    },
    avatar: {
      width: 58, height: 58, borderRadius: 18, backgroundColor: theme.primary,
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
    profileInfo: { flex: 1, gap: 3 },
    profileName: { color: theme.text, fontSize: 17, fontWeight: '800' },
    profileEmail: { color: theme.muted, fontSize: 13 },
    planBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 3 },
    planBadgeText: { fontSize: 11, fontWeight: '700' },
    editBtn: { backgroundColor: alpha(theme.primary, 0.1), borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
    editBtnText: { color: theme.primary, fontSize: 13, fontWeight: '700' },

    examBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      borderWidth: 1, borderRadius: 20, padding: 16,
    },
    examBannerEmoji: { fontSize: 28 },
    examBannerTitle: { fontSize: 15, fontWeight: '800' },
    examBannerSub: { color: theme.muted, fontSize: 12, marginTop: 2 },

    loadingRow: { height: 80, alignItems: 'center', justifyContent: 'center' },
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

    sectionLabel: {
      marginTop: 8, marginBottom: 0,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    sectionLabelText: { color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
    sectionLabelCount: { color: theme.muted, fontSize: 11, fontWeight: '700' },

    card: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 22, overflow: 'hidden',
    },
    badgeItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: alpha(theme.border, 0.4) },
    badgeLocked: { opacity: 0.6 },
    badgeEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
    badgeInfo: { flex: 1, gap: 2 },
    badgeLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
    badgeDesc: { color: theme.muted, fontSize: 12, lineHeight: 17 },
    badgeStatus: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    badgeStatusText: { fontSize: 14, fontWeight: '800' },

    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15 },
    settingCopy: { flex: 1, gap: 2 },
    settingLabel: { color: theme.text, fontSize: 15, fontWeight: '700' },
    settingSub: { color: theme.muted, fontSize: 12 },
    chevron: { color: theme.muted, fontSize: 20 },
    divider: { height: 1, backgroundColor: alpha(theme.border, 0.6), marginHorizontal: 18 },

    dangerBtn: { borderColor: alpha('#EF4444', 0.5), borderWidth: 1, borderRadius: 16, paddingVertical: 15, alignItems: 'center', backgroundColor: alpha('#EF4444', 0.05) },
    dangerBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
    logoutBtn: { borderColor: '#EF4444', borderWidth: 1.5, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
    logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
    version: { color: theme.muted, fontSize: 12, textAlign: 'center', marginTop: 4 },

    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    modalSheet: { backgroundColor: theme.background, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48, gap: 20 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    modalTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
    modalClose: { color: theme.muted, fontSize: 15 },
    modalBody: { gap: 8 },
    fieldLabel: { color: theme.text, fontSize: 14, fontWeight: '700' },
    fieldInput: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, color: theme.text, fontSize: 16 },
    clearDate: { fontSize: 13, fontWeight: '700', marginTop: 8, textAlign: 'center' },
    saveBtn: { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    goalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: theme.border, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: theme.surface },
    goalOptionText: { color: theme.text, fontSize: 15, fontWeight: '700' },
  });
