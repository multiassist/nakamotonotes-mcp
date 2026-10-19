import { createRequire } from 'node:module';
import { reading, explain, history, picture, KEYS } from './core.mjs';
import { widgetHtml, WIDGET_URI, WIDGET_MIME, WIDGET_DOMAIN } from './widget.mjs';
export const VERSION = createRequire(import.meta.url)('../package.json').version;
const KNOWN = ['2024-11-05', '2025-03-26', '2025-06-18'];
const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const NUM = { type: 'number' }; const NNUM = { type: ['number', 'null'] }; const STR = { type: 'string' };
const ZONEBANDS = { type: 'array', items: { type: 'object', properties: { zone: STR, min: { type: 'integer' }, max: { type: 'integer' } }, required: ['zone', 'min', 'max'] } };
const PREV = { type: ['object', 'null'], properties: { date: STR, score: { type: 'integer' }, zone: STR }, required: ['date', 'score', 'zone'] };
const TOOLS = [
  { name: 'get_market_snapshot', _meta: { ui: { resourceUri: WIDGET_URI }, 'ui/resourceUri': WIDGET_URI }, title: 'Bitcoin Barometer snapshot', description: 'Current Bitcoin Barometer reading: Heat Score 0-100, zone and zone bands, yesterday and last week, BTC price with 24h and 7d change, and the ten indicators with value, heat and a one-line meaning. Descriptive only.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { ...ro, title: 'Bitcoin Barometer snapshot' },
    outputSchema: { type: 'object', properties: { score: { type: 'integer' }, zone: STR, asOf: STR, price: { type: ['object', 'null'] }, zoneBands: ZONEBANDS, previous: { type: 'object', properties: { yesterday: PREV, weekAgo: PREV }, required: ['yesterday', 'weekAgo'] }, change1d: { type: ['integer', 'null'] }, change7d: { type: ['integer', 'null'] }, gaugeNote: STR, imageUrl: STR,
      indicators: { type: 'array', items: { type: 'object', properties: { key: STR, name: STR, value: NNUM, heat: { type: ['integer', 'null'] }, gauge: { type: 'boolean' }, meaning: STR }, required: ['key', 'name', 'value', 'heat', 'gauge', 'meaning'] } }, degraded: { type: 'array', items: STR }, methodology: STR, license: STR, attribution: STR, limitation: STR },
      required: ['score', 'zone', 'asOf', 'zoneBands', 'previous', 'indicators', 'degraded', 'limitation'] } },
  { name: 'explain_indicator', title: 'Explain one Barometer indicator', description: 'What one Barometer indicator measures, its current value and heat, and how it feeds the score.', inputSchema: { type: 'object', properties: { name: { type: 'string', enum: KEYS, description: 'Indicator key' } }, required: ['name'], additionalProperties: false }, annotations: { ...ro, title: 'Explain one Barometer indicator' },
    outputSchema: { type: 'object', properties: { key: STR, name: STR, measures: STR, value: NNUM, heat: { type: ['integer', 'null'] }, degraded: { type: 'boolean' }, feeds_score: STR, asOf: STR, methodology: STR, license: STR, attribution: STR, limitation: STR }, required: ['key', 'name', 'measures', 'value', 'heat', 'degraded', 'feeds_score', 'asOf'] } },
  { name: 'get_history', title: 'Heat Score history', description: 'Heat Score history from the public daily history. from is required (YYYY-MM-DD), to defaults to the last day. interval day|week|month|auto (auto picks the finest that fits 400 points); max_points (1-400) caps the points: auto uses 180 by default, and with max_points the latest points are kept and truncated is set. A summary covers the whole range.', inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'First day, YYYY-MM-DD' }, to: { type: 'string', description: 'Last day, YYYY-MM-DD (default: last available day)' }, interval: { type: 'string', enum: ['day', 'week', 'month', 'auto'], description: 'Point size (default auto)' }, max_points: { type: 'integer', minimum: 1, maximum: 400, description: 'Most points to return; older points are dropped and truncated is set' } }, required: ['from'], additionalProperties: false }, annotations: { ...ro, title: 'Heat Score history' },
    outputSchema: { type: 'object', properties: { from: STR, to: STR, interval: STR, count: { type: 'integer' }, truncated: { type: 'boolean' }, omittedPoints: { type: 'integer' }, points: { type: 'array', items: { type: 'object', properties: { date: STR, score: { type: 'integer' }, zone: STR }, required: ['date', 'score', 'zone'] } },
      summary: { type: 'object', properties: { min: NUM, max: NUM, mean: NUM, days: { type: 'integer' }, daysPerZone: { type: 'object' } }, required: ['min', 'max', 'mean', 'days', 'daysPerZone'] }, dataRange: { type: 'object' }, methodology: STR, license: STR, limitation: STR }, required: ['from', 'to', 'interval', 'count', 'points', 'summary'] } },
];
const HANDLERS = new Map([
  ['get_market_snapshot', () => reading()],
  ['explain_indicator', (a) => explain(a.name)],
  ['get_history', (a) => history(a.from, a.to, a.interval, a.max_points)],
]);
const err = (code, message) => ({ error: { code, message } });
export async function handle(m) {
  if (m.method === 'initialize') {
    const v = m.params?.protocolVersion;
    return { result: { protocolVersion: KNOWN.includes(v) ? v : '2025-06-18', capabilities: { tools: {}, resources: {}, extensions: { 'io.modelcontextprotocol/ui': {} } }, serverInfo: { name: 'nakamotonotes-barometer', version: VERSION } } };
  }
  if (m.method === 'ping') return { result: {} };
  if (m.method === 'resources/list') return { result: { resources: [{ uri: WIDGET_URI, name: 'Bitcoin Barometer gauge', mimeType: WIDGET_MIME }] } };
  if (m.method === 'resources/read') {
    const u = m.params?.uri;
    if (typeof u !== 'string' || u === '') return err(-32602, 'uri must be a non-empty string');
    if (u !== WIDGET_URI) return err(-32002, 'resource not found');
    return { result: { contents: [{ uri: WIDGET_URI, mimeType: WIDGET_MIME, text: widgetHtml(), _meta: { ui: { domain: WIDGET_DOMAIN, csp: { connectDomains: [], resourceDomains: [] } } } }] } };
  }
  if (m.method === 'tools/list') return { result: { tools: TOOLS } };
  if (m.method === 'tools/call') {
    const p = m.params;
    if (!p || typeof p !== 'object' || Array.isArray(p)) return err(-32602, 'params must be an object');
    const fn = typeof p.name === 'string' ? HANDLERS.get(p.name) : undefined;
    if (!fn) return err(-32602, 'unknown tool');
    try {
      const out = await fn(p.arguments || {}); const content = [{ type: 'text', text: JSON.stringify(out) }];
      if (p.name === 'get_market_snapshot') {
        try { content.push({ type: 'image', data: await picture(), mimeType: 'image/png' }); }
        catch (e) { content.push({ type: 'text', text: `Barometer picture unavailable (${String(e.message).slice(0, 200)}); the reading above is complete.` }); }
      }
      return { result: { content, structuredContent: out } };
    }
    catch (e) { return { result: { isError: true, content: [{ type: 'text', text: String(e.message).slice(0, 500) }] } }; }
  }
  return err(-32601, 'method not found');
}
