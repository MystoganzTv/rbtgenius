import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { alpha } from '../../theme';

export function TranslationTrigger({ onPress, theme, style = null }) {
  const handlePress = (event) => {
    event?.stopPropagation?.();
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        {
          width: 34,
          height: 34,
          borderRadius: 17,
          borderWidth: 1,
          borderColor: alpha(theme.border, 0.9),
          backgroundColor: alpha(theme.surface, 0.96),
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name="language-outline" size={17} color={theme.primary} />
    </Pressable>
  );
}

export default function TranslationSheet({
  visible,
  onClose,
  theme,
  title = 'Translation',
  englishText = '',
  spanishText = '',
  unavailableLabel = 'Spanish translation unavailable yet.',
}) {
  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} pointerEvents="box-none">
        <View style={styles.stage} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: alpha(theme.border, 0.9), shadowColor: theme.shadow }]}>
            <View style={[styles.header, { borderBottomColor: alpha(theme.border, 0.6) }]}>
              <Text style={[styles.headerTitle, { color: theme.muted }]}>{title}</Text>
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.muted} />
              </Pressable>
            </View>

            <View style={styles.body}>
              <View style={[styles.card, { backgroundColor: alpha(theme.primary, 0.05), borderColor: alpha(theme.primary, 0.14) }]}>
                <Text style={[styles.langTag, { color: theme.primary }]}>EN</Text>
                <Text style={[styles.blockText, { color: theme.text }]}>{englishText || '—'}</Text>
              </View>

              <View style={[styles.card, { backgroundColor: alpha(theme.primary, 0.08), borderColor: alpha(theme.primary, 0.18) }]}>
                <Text style={[styles.langTag, { color: theme.primary }]}>ES</Text>
                <Text style={[styles.blockText, { color: theme.text }]}>{spanishText || unavailableLabel}</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  stage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingBottom: 24,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 12,
    maxHeight: '72%',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2.2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  langTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.6,
  },
  blockText: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '600',
  },
});
