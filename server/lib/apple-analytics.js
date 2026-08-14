import { createHash, sign } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const APPLE_API = 'https://api.appstoreconnect.apple.com';
const DEFAULT_APP_ID = '6766110248';
const MAX_PAGES = 20;
const REPORTS = [
  { key: 'downloads', match: /^App(?: Store)? Downloads Standard$/i, metrics: { Counts: 'counts' } },
  { key: 'purchases', match: /^App Store Purchases Detailed$/i, metrics: { Purchases: 'purchases', 'Proceeds in USD': 'proceeds_usd', 'Sales in USD': 'sales_usd', 'Paying Users': 'paying_users' } },
  { key: 'discovery', match: /^App Store Discovery and Engagement Standard$/i, metrics: { Counts: 'counts', 'Unique Counts': 'unique_counts' } },
  { key: 'crashes', match: /^App Crashes(?: Standard)?$/i, metrics: { Crashes: 'crashes', 'Unique Devices': 'unique_devices' } },
  { key: 'installs', match: /^App Store Installations? and Deletions? Standard$/i, metrics: { Counts: 'counts', 'Unique Devices': 'unique_devices' } },
  { key: 'sessions', match: /^App Sessions Standard$/i, metrics: { Sessions: 'sessions', 'Total Session Duration': 'total_session_duration', 'Unique Devices': 'unique_devices' } },
];
const DIMENSIONS = {
  'Download Type': 'download_type',
  'App Version': 'app_version',
  Device: 'device',
  'Platform Version': 'platform_version',
  'Source Type': 'source_type',
  'Source Info': 'source_info',
  'Page Type': 'page_type',
  Territory: 'territory',
  Event: 'event',
  'Engagement Type': 'engagement_type',
};

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

export function createAppleToken({ issuerId, keyId, privateKey, now = Date.now() }) {
  if (!issuerId || !keyId || !privateKey) {
    throw new Error('App Store Connect credentials are incomplete');
  }
  const issuedAt = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: issuerId,
    iat: issuedAt,
    exp: issuedAt + 15 * 60,
    aud: 'appstoreconnect-v1',
  }));
  const unsigned = `${header}.${payload}`;
  const key = privateKey.replaceAll('\\n', '\n').trim();
  const signature = sign('sha256', Buffer.from(unsigned), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${base64url(signature)}`;
}

function parseLine(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === '\t' && !quoted) {
      values.push(value);
      value = '';
    } else value += character;
  }
  values.push(value);
  return values;
}

export function parseTsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const headers = parseLine(lines[0]).map(value =>
    String(value || '').replace(/^\uFEFF/, '').replaceAll('\u00a0', ' ').replace(/\s+/g, ' ').trim(),
  );
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || '']));
  });
}

function numeric(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = Number(String(value).replaceAll(',', '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function reportDefinition(name) {
  return REPORTS.find(report => report.match.test(name));
}

function mergeRows(rows) {
  const merged = new Map();
  for (const row of rows) {
    const key = `${row.report_name}:${row.event_date}:${row.dimension_hash}`;
    const current = merged.get(key);
    if (!current) merged.set(key, row);
    else {
      for (const [metric, value] of Object.entries(row.metrics)) {
        current.metrics[metric] = (current.metrics[metric] || 0) + value;
      }
    }
  }
  return [...merged.values()];
}

export function normalizeAppleReport({
  reportName,
  text,
  processingDate,
  instanceId,
  appId,
  now = new Date().toISOString(),
}) {
  const definition = reportDefinition(reportName);
  if (!definition) return [];
  const normalized = [];
  for (const source of parseTsv(text)) {
    const eventDate = source.Date;
    const sourceAppId = source['App Apple Identifier'];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) continue;
    if (sourceAppId && String(sourceAppId) !== String(appId)) continue;
    const dimensions = {};
    for (const [appleName, key] of Object.entries(DIMENSIONS)) {
      if (source[appleName]) dimensions[key] = source[appleName];
    }
    const metrics = {};
    for (const [appleName, key] of Object.entries(definition.metrics)) {
      const value = numeric(source[appleName]);
      if (value != null) metrics[key] = value;
    }
    if (!Object.keys(metrics).length) continue;
    const canonical = JSON.stringify(
      Object.fromEntries(Object.entries(dimensions).sort(([left], [right]) => left.localeCompare(right))),
    );
    normalized.push({
      report_name: definition.key,
      event_date: eventDate,
      dimension_hash: createHash('sha256').update(canonical).digest('hex'),
      dimensions,
      metrics,
      processing_date: processingDate,
      source_instance_id: instanceId,
      updated_at: now,
    });
  }
  return mergeRows(normalized);
}

function add(target, key, value) {
  target[key] = (target[key] || 0) + (Number(value) || 0);
}

export function aggregateAppleRows(rows = []) {
  const result = {
    period: null,
    capturedAt: null,
    downloads: 0,
    redownloads: 0,
    updates: 0,
    impressions: 0,
    uniqueImpressions: 0,
    pageViews: 0,
    conversionRate: null,
    purchases: 0,
    salesUSD: 0,
    proceedsUSD: 0,
    sessions: 0,
    averageSessionSeconds: null,
    crashes: 0,
    installs: 0,
    deletions: 0,
    proceedsBySource: [],
  };
  const sources = {};
  let sessionDuration = 0;
  let minDate = null;
  let maxDate = null;
  let latestProcessingDate = null;
  for (const row of rows) {
    const date = row.event_date;
    if (date && (!minDate || date < minDate)) minDate = date;
    if (date && (!maxDate || date > maxDate)) maxDate = date;
    if (row.processing_date && (!latestProcessingDate || row.processing_date > latestProcessingDate)) {
      latestProcessingDate = row.processing_date;
    }
    const dimensions = row.dimensions || {};
    const metrics = row.metrics || {};
    if (row.report_name === 'downloads') {
      const type = String(dimensions.download_type || '').toLowerCase();
      if (type.includes('first-time')) result.downloads += Number(metrics.counts) || 0;
      else if (type.includes('redownload')) result.redownloads += Number(metrics.counts) || 0;
      else if (type.includes('update')) result.updates += Number(metrics.counts) || 0;
    } else if (row.report_name === 'discovery') {
      const event = String(dimensions.event || '').toLowerCase();
      if (event === 'impression') {
        result.impressions += Number(metrics.counts) || 0;
        result.uniqueImpressions += Number(metrics.unique_counts) || 0;
      } else if (event === 'page view') result.pageViews += Number(metrics.counts) || 0;
    } else if (row.report_name === 'purchases') {
      result.purchases += Number(metrics.purchases) || 0;
      result.salesUSD += Number(metrics.sales_usd) || 0;
      result.proceedsUSD += Number(metrics.proceeds_usd) || 0;
      if (dimensions.source_type) add(sources, dimensions.source_type, metrics.proceeds_usd);
    } else if (row.report_name === 'sessions') {
      result.sessions += Number(metrics.sessions) || 0;
      sessionDuration += Number(metrics.total_session_duration) || 0;
    } else if (row.report_name === 'crashes') result.crashes += Number(metrics.crashes) || 0;
    else if (row.report_name === 'installs') {
      const event = String(dimensions.event || '').toLowerCase();
      if (event === 'install') result.installs += Number(metrics.counts) || 0;
      else if (event === 'delete') result.deletions += Number(metrics.counts) || 0;
    }
  }
  result.period = minDate && maxDate ? (minDate === maxDate ? minDate : `${minDate}–${maxDate}`) : null;
  result.capturedAt = latestProcessingDate ? `${latestProcessingDate}T12:00:00.000Z` : null;
  result.conversionRate = result.uniqueImpressions
    ? Math.round(((result.downloads + result.redownloads) / result.uniqueImpressions) * 10000) / 100
    : null;
  result.averageSessionSeconds = result.sessions ? Math.round(sessionDuration / result.sessions) : null;
  result.salesUSD = Math.round(result.salesUSD * 100) / 100;
  result.proceedsUSD = Math.round(result.proceedsUSD * 100) / 100;
  result.proceedsBySource = Object.entries(sources)
    .map(([source, usd]) => ({ source, usd: Math.round(usd * 100) / 100 }))
    .sort((left, right) => right.usd - left.usd);
  return result;
}

async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Apple request failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ''}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function listResources(fetchImpl, url, token) {
  const data = [];
  let next = url;
  for (let page = 0; next && page < MAX_PAGES; page += 1) {
    const payload = await requestJson(fetchImpl, next, {
      headers: { Authorization: `Bearer ${token}` },
    });
    data.push(...(payload.data || []));
    next = payload.links?.next || null;
  }
  return data;
}

async function createOngoingRequest(fetchImpl, token, appId) {
  return requestJson(fetchImpl, `${APPLE_API}/v1/analyticsReportRequests`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        type: 'analyticsReportRequests',
        attributes: { accessType: 'ONGOING' },
        relationships: { app: { data: { type: 'apps', id: String(appId) } } },
      },
    }),
  });
}

export function isAppleAnalyticsConfigured(env = process.env) {
  return Boolean(
    env.APPSTORE_CONNECT_ISSUER_ID &&
    env.APPSTORE_CONNECT_KEY_ID &&
    env.APPSTORE_CONNECT_PRIVATE_KEY,
  );
}

export async function syncAppleAnalytics({
  storage,
  fetchImpl = globalThis.fetch,
  env = process.env,
  now = new Date(),
} = {}) {
  if (!storage) throw new Error('Apple analytics storage is required');
  if (!isAppleAnalyticsConfigured(env)) throw new Error('App Store Connect is not configured');
  const appId = env.APPSTORE_APP_ID || DEFAULT_APP_ID;
  const token = createAppleToken({
    issuerId: env.APPSTORE_CONNECT_ISSUER_ID,
    keyId: env.APPSTORE_CONNECT_KEY_ID,
    privateKey: env.APPSTORE_CONNECT_PRIVATE_KEY,
    now: now.getTime(),
  });
  let requestId = env.APPSTORE_ANALYTICS_REQUEST_ID;
  if (!requestId) {
    const requests = await listResources(
      fetchImpl,
      `${APPLE_API}/v1/apps/${appId}/analyticsReportRequests?filter%5BaccessType%5D=ONGOING&limit=200`,
      token,
    );
    requestId = requests.find(request => !request.attributes?.stoppedDueToInactivity)?.id;
  }
  if (!requestId && env.APPSTORE_CREATE_ANALYTICS_REQUEST === 'true') {
    const created = await createOngoingRequest(fetchImpl, token, appId);
    requestId = created?.data?.id || null;
  }
  if (!requestId) throw new Error('No active Apple analytics report request exists');

  const reports = (await listResources(
    fetchImpl,
    `${APPLE_API}/v1/analyticsReportRequests/${requestId}/reports?limit=200`,
    token,
  )).filter(report => reportDefinition(report.attributes?.name || ''));
  const lookbackDays = Math.min(Math.max(Number(env.APPLE_SYNC_LOOKBACK_DAYS || 14), 2), 30);
  const cutoff = new Date(now.getTime() - lookbackDays * 86400000).toISOString().slice(0, 10);
  const instances = [];
  for (const report of reports) {
    const reportInstances = await listResources(
      fetchImpl,
      `${APPLE_API}/v1/analyticsReports/${report.id}/instances?filter%5Bgranularity%5D=DAILY&limit=200`,
      token,
    );
    for (const instance of reportInstances) {
      if (instance.attributes?.processingDate >= cutoff) instances.push({ report, instance });
    }
  }
  const importedIds = await storage.getImportedAppleInstanceIds(cutoff);
  let importedInstances = 0;
  let importedRows = 0;
  for (const { report, instance } of instances.sort((left, right) =>
    left.instance.attributes.processingDate.localeCompare(right.instance.attributes.processingDate),
  )) {
    if (importedIds.has(instance.id)) continue;
    const segments = await listResources(
      fetchImpl,
      `${APPLE_API}/v1/analyticsReportInstances/${instance.id}/segments?fields%5BanalyticsReportSegments%5D=checksum,sizeInBytes,url&limit=200`,
      token,
    );
    let rows = [];
    for (const segment of segments) {
      const response = await fetchImpl(segment.attributes?.url);
      if (!response.ok) throw new Error(`Apple report download failed (${response.status})`);
      const compressed = Buffer.from(await response.arrayBuffer());
      if (segment.attributes?.checksum) {
        const checksum = createHash('md5').update(compressed).digest('hex');
        if (checksum !== String(segment.attributes.checksum).toLowerCase()) {
          throw new Error('Apple report checksum verification failed');
        }
      }
      rows.push(...normalizeAppleReport({
        reportName: report.attributes.name,
        text: gunzipSync(compressed).toString('utf8'),
        processingDate: instance.attributes.processingDate,
        instanceId: instance.id,
        appId,
      }));
    }
    rows = mergeRows(rows);
    await storage.upsertAppleAnalyticsRows(rows);
    await storage.recordAppleAnalyticsImport({
      instanceId: instance.id,
      reportName: report.attributes.name,
      processingDate: instance.attributes.processingDate,
      rowCount: rows.length,
    });
    importedInstances += 1;
    importedRows += rows.length;
  }
  return {
    requestId,
    reports: reports.length,
    availableInstances: instances.length,
    importedInstances,
    importedRows,
  };
}

