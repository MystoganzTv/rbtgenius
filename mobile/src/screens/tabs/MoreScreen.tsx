// @ts-nocheck
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

type Theme = any;
type Navigation = any;
type AccentKey = 'primary' | 'gold' | 'success';
type TranslateFn = (key: string, options?: any) => string;

export default function MoreScreen({ navigation }: { navigation?: Navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const auth = useAuth() as { user?: { isPremium?: boolean } | null } | null;
  const user = auth?.user ?? null;
  const { t: rawT } = useTranslation();
  const t = rawT as unknown as TranslateFn;
  const s = styles(theme);

  const items: Array<{
    key: string;
    title: string;
    sub: string;
    icon: (color: string) => JSX.Element;
    accent: AccentKey;
  }> = [
    {
      key: 'Flashcards',
      title: t('more.flashcards'),
      sub: t('more.flashcards_sub'),
      icon: (color: string) => <MaterialCommunityIcons name="cards-outline" color={color} size={22} />,
      accent: 'primary',
    },
    {
      key: 'Analytics',
      title: t('more.analytics'),
      sub: t('more.analytics_sub'),
      icon: (color: string) => <Ionicons name="stats-chart-outline" color={color} size={22} />,
      accent: 'gold',
    },
    {
      key: 'Profile',
      title: t('more.profile'),
      sub: t('more.profile_sub'),
      icon: (color: string) => <Ionicons name="person-circle-outline" color={color} size={22} />,
      accent: 'success',
    },
  ];

  const isPro = user?.isPremium ?? false;

  const accentColor = (accent: AccentKey) => {
    if (accent === 'gold') return theme.gold;
    if (accent === 'success') return theme.success;
    return theme.primary;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>{t('more.title')}</Text>
        <Text style={s.screenSub}>{t('more.subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {!isPro && (
          <Pressable
            style={s.proBanner}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation?.navigate('Upgrade');
            }}
          >
            <View style={s.proBannerLeft}>
              <Text style={s.proBannerEmoji}>👑</Text>
              <View>
                <Text style={s.proBannerTitle}>{t('more.upgrade')}</Text>
                <Text style={s.proBannerSub}>{t('more.upgrade_banner_sub')}</Text>
              </View>
            </View>
            <Feather name="chevron-right" color={theme.gold} size={18} />
          </Pressable>
        )}

        {items.map((item) => {
          const color = accentColor(item.accent);
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation?.navigate(item.key);
              }}
            >
              <View style={[s.iconWrap, { backgroundColor: alpha(color, 0.12) }]}>
                {item.icon(color)}
              </View>
              <View style={s.cardCopy}>
                <Text style={s.cardTitle}>{item.title}</Text>
                <Text style={s.cardSub}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" color={theme.muted} size={18} />
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: Theme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    topBar: {
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomColor: alpha(theme.border, 0.6), borderBottomWidth: 1,
    },
    screenTitle: { color: theme.text, fontSize: 18, fontWeight: '800' },
    screenSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    proBanner: {
      backgroundColor: alpha(theme.gold, 0.08), borderColor: alpha(theme.gold, 0.3),
      borderWidth: 1, borderRadius: 22, padding: 18,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    proBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    proBannerEmoji: { fontSize: 24 },
    proBannerTitle: { color: theme.gold, fontSize: 15, fontWeight: '800' },
    proBannerSub: { color: theme.muted, fontSize: 12, marginTop: 1 },
    card: {
      backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1,
      borderRadius: 22, padding: 18, flexDirection: 'row',
      alignItems: 'center', gap: 16,
      shadowColor: theme.shadow, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06, shadowRadius: 14,
    },
    iconWrap: {
      width: 46, height: 46, borderRadius: 14,
      alignItems: 'center', justifyContent: 'center',
    },
    cardCopy: { flex: 1, gap: 3 },
    cardTitle: { color: theme.text, fontSize: 16, fontWeight: '800' },
    cardSub: { color: theme.muted, fontSize: 13, lineHeight: 19 },
  });
