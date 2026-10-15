#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { createRequire } from 'node:module';
import { reading, explain, history, KEYS } from './core.mjs';
const VERSION = createRequire(import.meta.url)('../package.json').version;
const ro = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const TOOLS = [
  { name: 'get_market_snapshot', description: 'Current Bitcoin Barometer reading: Heat Score 0-100, zone, BTC price with 24h and 7d change, and the ten indicators with value, heat and a one-line meaning. Descriptive only.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: ro },
  { name: 'explain_indicator', description: `What one Barometer indicator measures, its current value and heat, and how it feeds the score. Names: ${KEYS.join(', ')}.`, inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'Indicator name' } }, required: ['name'], additionalProperties: false }, annotations: ro },
  { name: 'get_history', description: 'Daily Heat Score and zone between two dates (YYYY-MM-DD, inclusive), from the public daily history.', inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'First day, YYYY-MM-DD' }, to: { type: 'string', description: 'Last day, YYYY-MM-DD' } }, required: ['from', 'to'], additionalProperties: false }, annotations: ro },
];
const send = (m) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
const rl = createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  try {
    if (m.method === 'initialize') return send({ id: m.id, result: { protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'nakamotonotes-barometer', version: VERSION } } });
    if (m.method === 'tools/list') return send({ id: m.id, result: { tools: TOOLS } });
    if (m.method === 'tools/call') {
      const a = m.params?.arguments || {}; let out;
      try {
        if (m.params.name === 'get_market_snapshot') out = await reading();
        else if (m.params.name === 'explain_indicator') out = await explain(a.name);
        else if (m.params.name === 'get_history') out = await history(a.from, a.to);
        else return send({ id: m.id, error: { code: -32602, message: 'unknown tool' } });
      } catch (e) { return send({ id: m.id, result: { isError: true, content: [{ type: 'text', text: String(e.message).slice(0, 500) }] } }); }
      return send({ id: m.id, result: { content: [{ type: 'text', text: JSON.stringify(out) }] } });
    }
    send({ id: m.id, error: { code: -32601, message: 'method not found' } });
  } catch (e) { send({ id: m.id, error: { code: -32603, message: String(e.message) } }); }
});
rl.on('close', () => process.exit(0));
