import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { localizeDataSheet } from '../../lib/questions/question-bank.js';
import { alpha } from '../../theme';

// A filled-in data sheet (DRO intervals, ABC, token record, frequency count)
// for applied questions. Built from plain Views, like QuestionChart, so it
// needs no native dependency and translates with the question.

const TALLY_COLOR = '#EA580C';

function describeCell(render, value, spanish) {
  if (render === 'checkbox') return value === true ? (spanish ? 'marcado' : 'checked') : spanish ? 'en blanco' : 'blank';
  return String(value ?? '');
}

function describeSheet(sheet, spanish) {
  const parts = [sheet.title, sheet.subtitle].filter(Boolean);
  const columns = sheet.columns.map((column) => column.label);
  for (const row of sheet.rows) {
    const cells = row.cells.map((value, index) => `${columns[index]}: ${describeCell(row.render, value, spanish)}`);
    parts.push(`${row.label}. ${cells.join(', ')}`);
  }
  return parts.join('. ');
}

function Cell({ render, value, theme }) {
  if (render === 'text' || render === 'number') {
    return (
      <Text style={[render === 'number' ? styles.number : styles.text, { color: theme.text }]}>{value}</Text>
    );
  }
  if (render === 'checkbox') {
    return (
      <View style={[styles.checkbox, { borderColor: theme.muted }]}>
        {value === true ? <Text style={[styles.check, { color: theme.text }]}>✓</Text> : null}
      </View>
    );
  }
  if (!value) return <Text style={[styles.dash, { color: alpha(theme.muted, 0.6) }]}>—</Text>;
  const marks = Array.from({ length: value }, (_, index) => index);
  return (
    <View style={styles.marks}>
      {marks.map((index) =>
        render === 'tally' ? (
          <View key={index} style={[styles.tally, index > 0 && index % 5 === 0 && styles.tallyGap]} />
        ) : (
          <View key={index} style={[styles.dot, { backgroundColor: theme.primary }]} />
        ),
      )}
    </View>
  );
}

export default function DataSheet({ sheet, questionId, theme }) {
  const { i18n } = useTranslation();
  const spanish = Boolean(i18n.language?.startsWith('es'));
  const localized = localizeDataSheet(sheet, questionId, spanish ? 'es' : 'en');
  if (!localized || !Array.isArray(localized.columns) || !Array.isArray(localized.rows)) return null;

  const textSheet = localized.rows.some((row) => row.render === 'text');
  // Text sheets (ABC) need room per column, so they scroll sideways on a phone;
  // count sheets fit the width.
  const cellWidth = textSheet ? 120 : null;
  const labelWidth = textSheet ? 52 : 92;
  const line = alpha(theme.muted, 0.45);

  const table = (
    <View style={[styles.table, { borderColor: line }]}>
      <View style={[styles.row, { backgroundColor: alpha(theme.primary, 0.08) }]}>
        <View style={[styles.cell, styles.labelCell, { width: labelWidth, borderColor: line }]}>
          <Text style={[styles.headerText, { color: theme.muted }]}>{localized.corner || ''}</Text>
        </View>
        {localized.columns.map((column, index) => (
          <View
            key={index}
            style={[styles.cell, cellWidth ? { width: cellWidth } : styles.flexCell, { borderColor: line }]}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>{column.label}</Text>
            {column.sublabel ? (
              <Text style={[styles.sublabel, { color: theme.muted }]} numberOfLines={2}>
                {column.sublabel}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {localized.rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          <View style={[styles.cell, styles.labelCell, { width: labelWidth, borderColor: line }]}>
            <Text style={[styles.rowLabel, { color: theme.muted }]}>{row.label}</Text>
          </View>
          {row.cells.map((value, cellIndex) => (
            <View
              key={cellIndex}
              style={[
                styles.cell,
                cellWidth ? { width: cellWidth } : styles.flexCell,
                row.render === 'text' ? styles.textCell : styles.centerCell,
                { borderColor: line },
              ]}
            >
              <Cell render={row.render} value={value} theme={theme} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );

  return (
    <View
      style={[styles.frame, { backgroundColor: theme.surface, borderColor: alpha(theme.border, 0.8) }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={describeSheet(localized, spanish)}
    >
      <Text style={[styles.title, { color: theme.text }]}>{localized.title}</Text>
      {localized.subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{localized.subtitle}</Text> : null}
      {textSheet ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {table}
        </ScrollView>
      ) : (
        table
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', borderRadius: 18, borderWidth: 1, padding: 12 },
  title: { fontSize: 14, fontWeight: '700' },
  subtitle: { fontSize: 11, marginTop: 2, marginBottom: 10 },
  table: { borderTopWidth: 1, borderLeftWidth: 1 },
  row: { flexDirection: 'row' },
  cell: { borderRightWidth: 1, borderBottomWidth: 1, paddingVertical: 6, paddingHorizontal: 4, justifyContent: 'center' },
  flexCell: { flex: 1, alignItems: 'center' },
  labelCell: { paddingHorizontal: 6 },
  centerCell: { alignItems: 'center', minHeight: 34 },
  textCell: { justifyContent: 'flex-start' },
  headerText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  sublabel: { fontSize: 9, textAlign: 'center', marginTop: 1 },
  rowLabel: { fontSize: 11, fontWeight: '600' },
  text: { fontSize: 12, lineHeight: 16 },
  number: { fontSize: 14, fontWeight: '700' },
  dash: { fontSize: 12 },
  marks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 3 },
  tally: { width: 2.5, height: 14, borderRadius: 2, backgroundColor: TALLY_COLOR },
  tallyGap: { marginLeft: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  checkbox: { width: 16, height: 16, borderWidth: 1, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  check: { fontSize: 11, lineHeight: 13 },
});
