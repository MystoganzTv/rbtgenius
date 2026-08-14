import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateAppleRows,
  normalizeAppleReport,
  parseTsv,
} from '../server/lib/apple-analytics.js';

test('Apple TSV parser preserves quoted tab content', () => {
  const rows = parseTsv('Date\tSource Info\tCounts\n2026-08-12\t"Web\tCampaign"\t3\n');
  assert.deepEqual(rows, [{ Date: '2026-08-12', 'Source Info': 'Web\tCampaign', Counts: '3' }]);
});

test('Apple reports are filtered to RBTGenius and aggregate privacy-safe metrics', () => {
  const rows = normalizeAppleReport({
    reportName: 'App Store Downloads Standard',
    processingDate: '2026-08-14',
    instanceId: 'instance-1',
    appId: '6766110248',
    text: [
      'Date\tApp Apple Identifier\tDownload Type\tCounts',
      '2026-08-12\t6766110248\tFirst-time download\t4',
      '2026-08-12\t9999999999\tFirst-time download\t100',
      '2026-08-12\t6766110248\tRedownload\t2',
    ].join('\n'),
  });
  const aggregate = aggregateAppleRows(rows);

  assert.equal(rows.length, 2);
  assert.equal(aggregate.downloads, 4);
  assert.equal(aggregate.redownloads, 2);
  assert.equal(aggregate.period, '2026-08-12');
});

