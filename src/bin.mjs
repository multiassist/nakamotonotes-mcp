#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { handle } from './tools.mjs';
const send = (m) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...m }) + '\n');
const rl = createInterface({ input: process.stdin });
rl.on('line', async (line) => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return;
  try { send({ id: m.id, ...(await handle(m)) }); } catch (e) { send({ id: m.id, error: { code: -32603, message: String(e.message) } }); }
});
rl.on('close', () => process.exit(0));
