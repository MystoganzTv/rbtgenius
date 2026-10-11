import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
export default function StudySaveStatus({ state, theme }) {
  const { t } = useTranslation();
  if (!state.saving && !state.error && !state.pending) return null;
  return <View accessibilityLiveRegion="polite" style={{ padding: 16, gap: 10 }}>
    <Text style={{ color: theme.text }}>{t(state.saving ? 'study.saving' : 'study.save_failed')}</Text>
    {!state.saving && state.pending && <Pressable accessibilityRole="button" onPress={state.retry}>
      <Text style={{ color: theme.primary, fontWeight: '700' }}>{t('common.retry')}</Text>
    </Pressable>}
  </View>;
}
