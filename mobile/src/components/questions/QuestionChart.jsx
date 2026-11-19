import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getAppliedTranslationEs } from '../../lib/questions/question-bank.js';
import { alpha } from '../../theme';

// Line graph for applied questions that ask the student to read graphed data
// (Test Content Outline A.7). Built from plain Views so it needs no native
// chart dependency and works in the existing Expo build without a rebuild.

const PLOT_HEIGHT = 150;
const Y_AXIS_WIDTH = 30;
const DOT = 9;

function niceTicks(max) {
  const step = max <= 12 ? 2 : max <= 20 ? 5 : max <= 50 ? 10 : 20;
  const ticks = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);
  return ticks;
}

function Segment({ from, to, color }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: (from.x + to.x) / 2 - length / 2,
        top: (from.y + to.y) / 2 - 1,
        width: length,
        height: 2,
        backgroundColor: color,
        transform: [{ rotate: `${angle}rad` }],
      }}
    />
  );
}

// Screen-reader text: the full data, split by phase, so the question can be
// answered without seeing the graph.
function describeChart({ yLabel, xLabel, series, phaseBreak, phaseLabels, spanish }) {
  const heading = `${yLabel}, ${xLabel}`;
  if (phaseBreak === null) return `${heading}: ${series.join(', ')}`;
  const first = phaseLabels[0] || (spanish ? 'Antes del cambio de fase' : 'Before the phase change');
  const second = phaseLabels[1] || (spanish ? 'Después del cambio de fase' : 'After the phase change');
  return `${heading}. ${first}: ${series.slice(0, phaseBreak).join(', ')}. ${second}: ${series.slice(phaseBreak).join(', ')}.`;
}

export default function QuestionChart({ chart, questionId, theme }) {
  const { i18n } = useTranslation();
  const [plotWidth, setPlotWidth] = useState(0);

  if (!chart || !Array.isArray(chart.series) || chart.series.length === 0) return null;

  const spanish = i18n.language?.startsWith('es') ? getAppliedTranslationEs(questionId)?.chart : null;
  const yLabel = spanish?.y_label || chart.y_label || '';
  const xLabel = spanish?.x_label || chart.x_label || 'Session';
  const phaseLabels = spanish?.phase_labels || chart.phase_labels || [];

  const series = chart.series;
  const yMax = chart.y_max || Math.max(...series);
  const inset = DOT;
  const usable = Math.max(plotWidth - inset * 2, 1);
  const xFor = (index) => inset + (series.length === 1 ? usable / 2 : (index / (series.length - 1)) * usable);
  const yFor = (value) => PLOT_HEIGHT - (value / yMax) * PLOT_HEIGHT;
  const points = series.map((value, index) => ({ x: xFor(index), y: yFor(value), index }));
  const phaseBreak = Number.isInteger(chart.phase_change_after) ? chart.phase_change_after : null;
  const phaseX = phaseBreak === null ? null : (xFor(phaseBreak - 1) + xFor(phaseBreak)) / 2;
  const lineColor = theme.primary;

  return (
    <View
      style={[styles.frame, { backgroundColor: alpha(theme.primary, 0.05), borderColor: alpha(theme.border, 0.8) }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeChart({ yLabel, xLabel, series, phaseBreak, phaseLabels, spanish: Boolean(i18n.language?.startsWith('es')) })}
    >
      {phaseX !== null && plotWidth > 0 ? (
        <View style={[styles.phaseLabels, { marginLeft: Y_AXIS_WIDTH }]}>
          <Text style={[styles.phaseLabel, { color: theme.muted, width: phaseX }]} numberOfLines={1}>
            {phaseLabels[0] || ''}
          </Text>
          <Text style={[styles.phaseLabel, { color: theme.muted, flex: 1 }]} numberOfLines={1}>
            {phaseLabels[1] || ''}
          </Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <View style={[styles.yAxis, { height: PLOT_HEIGHT }]}>
          {niceTicks(yMax).map((tick) => (
            <Text key={tick} style={[styles.tick, { color: theme.muted, top: yFor(tick) - 7 }]}>
              {tick}
            </Text>
          ))}
        </View>
        <View
          style={[styles.plot, { height: PLOT_HEIGHT, borderColor: alpha(theme.muted, 0.6) }]}
          onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
        >
          {niceTicks(yMax).map((tick) => (
            <View
              key={`grid-${tick}`}
              style={[styles.grid, { top: yFor(tick), backgroundColor: alpha(theme.border, 0.9) }]}
            />
          ))}
          {plotWidth > 0 ? (
            <>
              {phaseX !== null ? (
                <View style={[styles.phaseLine, { left: phaseX - 1, borderColor: theme.muted }]} />
              ) : null}
              {points.slice(1).map((point, i) => {
                const previous = points[i];
                if (phaseBreak !== null && point.index === phaseBreak) return null;
                return <Segment key={`seg-${point.index}`} from={previous} to={point} color={lineColor} />;
              })}
              {points.map((point) => (
                <View
                  key={`dot-${point.index}`}
                  style={[
                    styles.dot,
                    {
                      left: point.x - DOT / 2,
                      top: point.y - DOT / 2,
                      borderColor: lineColor,
                      backgroundColor: theme.surface,
                    },
                  ]}
                />
              ))}
            </>
          ) : null}
        </View>
      </View>

      <View style={[styles.xTicks, { marginLeft: Y_AXIS_WIDTH }]}>
        {plotWidth > 0
          ? series.map((_, index) => (
              <Text key={`x-${index}`} style={[styles.xTick, { color: theme.muted, left: xFor(index) - 10 }]}>
                {index + 1}
              </Text>
            ))
          : null}
      </View>
      <Text style={[styles.axisTitle, { color: theme.muted }]}>
        {yLabel} · {xLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 18, borderWidth: 1, paddingVertical: 12, paddingRight: 14, paddingLeft: 6 },
  phaseLabels: { flexDirection: 'row', marginBottom: 6 },
  phaseLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row' },
  yAxis: { width: Y_AXIS_WIDTH, position: 'relative' },
  tick: { position: 'absolute', right: 6, fontSize: 10 },
  plot: { flex: 1, borderLeftWidth: 1, borderBottomWidth: 1, position: 'relative' },
  grid: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  phaseLine: { position: 'absolute', top: -4, bottom: 0, width: 0, borderLeftWidth: 1.5, borderStyle: 'dashed' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2 },
  xTicks: { height: 16, position: 'relative', marginTop: 4 },
  xTick: { position: 'absolute', width: 20, textAlign: 'center', fontSize: 10 },
  axisTitle: { marginTop: 6, textAlign: 'center', fontSize: 11 },
});
