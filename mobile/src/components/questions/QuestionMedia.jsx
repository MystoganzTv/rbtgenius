import { Image, StyleSheet, View } from 'react-native';
import { alpha } from '../../theme';
import QuestionChart from './QuestionChart.jsx';

export default function QuestionMedia({ source, accessibilityLabel, theme, chart = null, questionId = null }) {
  // Applied graph-reading questions replace the decorative topic image with
  // the graph the student has to interpret.
  if (chart) return <QuestionChart chart={chart} questionId={questionId} theme={theme} />;
  if (!source) return null;

  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: alpha(theme.primary, 0.05),
          borderColor: alpha(theme.border, 0.8),
        },
      ]}
    >
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
