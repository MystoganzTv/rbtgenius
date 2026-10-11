import test from 'node:test';
import assert from 'node:assert/strict';
import { ACCESS_COMPARISON } from '../src/lib/plan-access.js';
import { translateUi } from '../src/lib/i18n.js';

test('plan comparison values have complete Spanish translations, including dynamic counts', () => {
  for (const row of ACCESS_COMPARISON) for (const field of ['label', 'guest', 'free', 'premium']) {
    const translated = translateUi(row[field], 'es');
    assert.notEqual(translated, row[field], `${row.id}.${field} remained English`);
    assert.doesNotMatch(translated, /\b(?:questions|concepts|cards|per|and|across|unlimited|preview|locked|full|access|dashboard|readiness|mock)\b/i);
  }
});
