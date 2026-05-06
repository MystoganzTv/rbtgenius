import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { alpha, getTheme } from '../../theme';
import { useAuth } from '../../context/AuthContext';

const ITEMS = [
  {
    key: 'Flashcards',
    title: 'Flashcards',
    sub: 'Rapid recall for short study sessions',
    icon: (color) => <MaterialCommunityIcons name="cards-outline" color={color} size={22} />,
    accent: 'primary',
  },
  {
    key: 'Analytics',
    title: 'Analytics',
    sub: 'Performance insights across all domains',
    icon: (color) => <Ionicons name="stats-chart-outline" color={color} size={22} />,
    accent: 'gold',
  },
  {
    key: 'Profile',
    title: 'Profile',
    sub: 'Account, plan, and preferences',
    icon: (color) => <Ionicons name="person-circle-outline" color={color} size={22} />,
    accent: 'success',
  },
];

export default function MoreScreen({ navigation }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { user } = useAuth();
  const s = styles(theme);

  const isPro = user?.plan === 'premium' || user?.plan === 'premium_monthly' || user?.plan === 'premium_yearly';

  const accentColor = (accent) => {
    if (accent === 'gold') return theme.gold;
    if (accent === 'success') return theme.success;
    return theme.primary;
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.topBar}>
        <Text style={s.screenTitle}>More</Text>
        <Text style={s.screenSub}>Extra tools and account sections</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Pro upgrade banner (free users only) */}
        {!isPro && (
          <Pressable
            style={s.proBanner}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Upgrade');
            }}
          >
            <View style={s.proBannerLeft}>
              <Text style={s.proBannerEmoji}>👑</Text>
              <View>
                <Text style={s.proBannerTitle}>Upgrade to Pro</Text>
                <Text style={s.proBannerSub}>Unlock mock exams, analytics & unlimited practice</Text>
              </View>
            </View>
            <Feather name="chevron-right" color={theme.gold} size={18} />
          </Pressable>
        )}

        {ITEMS.map((item) => {
          const color = accentColor(item.accent);
          return (
            <Pressable
              key={item.key}
              style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(item.key);
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
