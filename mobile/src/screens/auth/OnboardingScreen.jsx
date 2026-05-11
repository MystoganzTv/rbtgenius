import { useRef, useState } from 'react';
import {
  Dimensions, FlatList, Pressable, StyleSheet, Text, View, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { alpha, getTheme } from '../../theme';

const { width } = Dimensions.get('window');
export const ONBOARDING_KEY = 'rbt_genius_onboarding_done';

const SLIDES = [
  {
    icon: '🎯',
    title: 'Pasa tu examen\nRBT con confianza',
    body: 'Más de 960 preguntas basadas en el RBT TCO 3ª edición del BACB, organizadas por dominio.',
    accent: '#1E5EFF',
  },
  {
    icon: '⚡',
    title: 'Práctica\ninteligente',
    body: 'Responde preguntas por tema, ve tu progreso en tiempo real y descubre dónde necesitas mejorar.',
    accent: '#7C3AED',
  },
  {
    icon: '🤖',
    title: 'Tarjetas y\nrepaso activo',
    body: 'Repasa conceptos clave con flashcards, explicaciones rápidas y sesiones enfocadas en memoria activa.',
    accent: '#059669',
  },
  {
    icon: '📈',
    title: 'Mide tu\npreparación',
    body: 'Tu readiness score sube con cada sesión. Llega al 80% y estarás listo para el examen real.',
    accent: '#D97706',
  },
];

export default function OnboardingScreen({ onDone }) {
  const scheme = useColorScheme();
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const s = styles(theme);
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const goTo = (i) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const finish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {/* Skip */}
      {!isLast && (
        <Pressable style={s.skipBtn} onPress={finish}>
          <Text style={s.skipText}>Saltar</Text>
        </Pressable>
      )}

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        onMomentumScrollEnd={(e) => {
          const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex(newIndex);
        }}
        renderItem={({ item }) => (
          <View style={[s.slide, { width }]}>
            {/* Big icon orb */}
            <View style={[s.iconOrb, { backgroundColor: alpha(item.accent, 0.12) }]}>
              <Text style={s.icon}>{item.icon}</Text>
            </View>
            <Text style={[s.title, { color: theme.text }]}>{item.title}</Text>
            <Text style={[s.body, { color: theme.muted }]}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={s.dots}>
        {SLIDES.map((sl, i) => (
          <Pressable key={i} onPress={() => goTo(i)}>
            <View style={[
              s.dot,
              {
                backgroundColor: i === index ? slide.accent : alpha(slide.accent, 0.25),
                width: i === index ? 24 : 8,
              }
            ]} />
          </Pressable>
        ))}
      </View>

      {/* CTA */}
      <View style={s.footer}>
        {isLast ? (
          <>
            <Pressable style={[s.primaryBtn, { backgroundColor: slide.accent }]} onPress={finish}>
              <Text style={s.primaryBtnText}>Empezar gratis</Text>
            </Pressable>
            <Pressable style={s.ghostBtn} onPress={finish}>
              <Text style={[s.ghostBtnText, { color: theme.muted }]}>Ya tengo cuenta — iniciar sesión</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[s.primaryBtn, { backgroundColor: slide.accent }]}
            onPress={() => goTo(index + 1)}
          >
            <Text style={s.primaryBtnText}>Siguiente →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = (theme) => StyleSheet.create({
  safe:         { flex: 1 },
  skipBtn:      { alignSelf: 'flex-end', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 },
  skipText:     { color: theme.muted, fontSize: 14, fontWeight: '600' },
  slide:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 20 },
  iconOrb:      { width: 140, height: 140, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  icon:         { fontSize: 64 },
  title:        { fontSize: 34, fontWeight: '900', textAlign: 'center', lineHeight: 42 },
  body:         { fontSize: 16, lineHeight: 26, textAlign: 'center', maxWidth: 300 },
  dots:         { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingBottom: 24 },
  dot:          { height: 8, borderRadius: 999 },
  footer:       { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  primaryBtn:   { borderRadius: 18, paddingVertical: 18, alignItems: 'center', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 14 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  ghostBtn:     { alignItems: 'center', paddingVertical: 10 },
  ghostBtnText: { fontSize: 14, fontWeight: '600' },
});
