import { createRequire } from 'node:module';
const VERSION = createRequire(import.meta.url)('../package.json').version;
export const LIMITATION = 'A description of the current reading against its history, not a forecast or investment advice.';
export const IMAGE_URL = 'https://nakamotonotes.com/open/barometer.png';
const METHOD = 'https://nakamotonotes.com/methodology';
const LICENSE = 'CC BY 4.0, attribute NakamotoNotes';
const ATTRIBUTION = 'Fear & Greed Index by alternative.me';
const ZONES = ['Chill', 'Neutral', 'Heated', 'Euphoric'];
const base = () => (process.env.NAKAMOTONOTES_HOSTED_BASE || process.env.NAKAMOTONOTES_API_BASE || 'https://nakamotonotes.com').replace(/\/$/, '');
const META = {
  monthlyRSI: ['Monthly RSI', 'Relative strength index on monthly candles; how stretched price is versus its own recent monthly moves.', 'Momentum input to the Heat Score; higher readings push the score up.'],
  mayerMultiple: ['Mayer multiple', 'Price divided by its 200-day moving average; distance from the long-run trend.', 'Trend-distance input to the Heat Score.'],
  piCycleProximity: ['Pi Cycle', 'How close the 111-day average is to twice the 350-day average, a historic cycle-top marker.', 'Cycle-position input to the Heat Score.'],
  mvrvZScore: ['MVRV Z-score', 'Market value compared with realised value, scaled by its historical spread.', 'On-chain valuation input to the Heat Score.'],
  nupl: ['NUPL', 'Net unrealised profit or loss as a share of market value across all coins.', 'On-chain profit-share input to the Heat Score.'],
  puellMultiple: ['Puell multiple', 'Daily miner issuance value divided by its 365-day average.', 'Miner-revenue input to the Heat Score.'],
  twoYearHighProximity: ['2-year high', 'How near the price is to its highest level of the last two years.', 'Price-position input to the Heat Score.'],
  roc90: ['90-day momentum', 'Percentage price change over the last 90 days.', 'Short-term momentum input to the Heat Score.'],
  fearAndGreed: ['Fear & Greed', 'Third-party sentiment index from alternative.me, 0 (fear) to 100 (greed).', 'Sentiment input to the Heat Score.'],
  searchInterestHeat: ['Search interest', 'Relative public search interest in Bitcoin, already scaled 0-100.', 'Attention input to the Heat Score.'],
};
export const KEYS = Object.keys(META);
const GAUGES = ['piCycleProximity', 'monthlyRSI', 'puellMultiple', 'mayerMultiple', 'nupl', 'mvrvZScore', 'searchInterestHeat', 'fearAndGreed'];
const r2 = (v) => Math.round(v * 100) / 100;
const squash = (x) => String(x).trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '');
const fail = (m) => { throw new Error(m); };
async function get(path) {
  let res;
  try { res = await fetch(base() + path, { headers: { 'user-agent': `nakamotonotes-mcp/${VERSION}`, accept: '*/*' }, signal: AbortSignal.timeout(10000) }); }
  catch (e) { fail(`NakamotoNotes request failed or timed out: ${e.name === 'TimeoutError' ? 'timeout after 10s' : e.message}`); }
  if (res.status !== 200) fail(`NakamotoNotes returned HTTP ${res.status} for ${path}`);
  return res.text();
}
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const iso = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d\d-\d\dT/.test(v) && new Date(`${v.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === v.slice(0, 10);
async function feed() {
  let f; try { f = JSON.parse(await get('/open/barometer.json')); } catch (e) { fail(e.message.startsWith('NakamotoNotes') ? e.message : 'feed is not valid JSON'); }
  if (!f || typeof f !== 'object' || Array.isArray(f)) fail('feed is not an object');
  if (!Number.isInteger(f.score) || f.score < 0 || f.score > 100) fail('feed score is missing or out of range');
  if (!ZONES.includes(f.zone)) fail('feed zone is missing or unknown');
  if (!iso(f.computedAt)) fail('feed computedAt is missing or invalid');
  if (!f.indicators || typeof f.indicators !== 'object' || Array.isArray(f.indicators)) fail('feed indicators are missing');
  if (!Array.isArray(f.zoneBands) || f.zoneBands.length !== 4) fail('feed zoneBands are missing');
  if (!f.zoneBands.every((b) => b && Number.isInteger(b.min) && Number.isInteger(b.max))) fail('feed zoneBands bounds must be integers');
  if (f.degraded !== undefined && !Array.isArray(f.degraded)) fail('feed degraded is not a list');
  return f;
}
const bandOf = (bands, score) => (bands.find((b) => score >= b.min && score <= b.max) || fail(`no zone band holds score ${score}`)).zone;
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
async function historyRows() {
  const lines = (await get('/open/barometer-history.csv')).split('\n').filter((l) => l !== '');
  if (lines[0] !== 'date,score,zone') fail('history header is not date,score,zone');
  if (lines.length < 2) fail('history has no rows');
  let prev = ''; const rows = [];
  for (const l of lines.slice(1)) {
    const c = l.split(','); if (c.length !== 3) fail(`history row malformed: ${c.length} columns`);
    const score = Number(c[1]); const zone = c[2].replace(/ Zone$/, '');
    if (!day(c[0]) || !Number.isInteger(score) || score < 0 || score > 100 || !ZONES.includes(zone) || c[1].trim() === '') fail('history row invalid');
    if (c[0] <= prev) fail('history dates are not strictly ascending'); prev = c[0];
    rows.push({ date: c[0], score, zone });
  }
  return rows;
}
export async function reading() {
  const f = await feed(); const degraded = [...(f.degraded || [])].filter((k) => KEYS.includes(k));
  let price = null;
  if (f.price === undefined || f.price === null) degraded.push('price');
  else {
    const p = f.price; const usd = num(p.usd); const c24 = p.change24hPct === null ? null : num(p.change24hPct); const c7 = p.change7dPct === null ? null : num(p.change7dPct);
    if (typeof p.usd !== 'number' || !(usd > 0) || c24 === undefined || (p.change24hPct !== null && c24 === null) || (p.change7dPct !== null && c7 === null) || !iso(p.asOf)) fail('feed price is invalid');
    price = { usd: r2(usd), change24hPct: c24 === null ? null : r2(c24), change7dPct: c7 === null ? null : r2(c7), asOf: p.asOf };
  }
  let heats = null;
  if (f.indicatorHeats === undefined || f.indicatorHeats === null || typeof f.indicatorHeats !== 'object' || Array.isArray(f.indicatorHeats) || Object.keys(f.indicatorHeats).length === 0) degraded.push('indicatorHeats'); else heats = f.indicatorHeats;
  const indicators = KEYS.map((key) => {
    const raw = key === 'searchInterestHeat' ? f.indicators.searchInterest : f.indicators[key]; let value = null;
    if (raw !== null && raw !== undefined) { value = num(raw); if (value === null) fail(`feed indicator ${key} is not numeric`); }
    let heat = null;
    if (heats && heats[key] !== undefined && heats[key] !== null) { heat = heats[key]; if (!Number.isInteger(heat) || heat < 0 || heat > 100) fail(`feed heat for ${key} is out of range`); }
    if (value === null || (heats && heat === null)) degraded.push(key);
    if (degraded.includes(key)) { value = null; heat = null; }
    return { key, name: META[key][0], value: value === null ? null : r2(value), heat, gauge: GAUGES.includes(key), meaning: META[key][1] };
  });
  const rows = await historyRows(); const at = f.computedAt.slice(0, 10);
  const find = (d) => rows.find((r) => r.date === d);
  const y = find(addDays(at, -1)); const w = find(addDays(at, -7));
  if (!y || !w) fail(`history has no row for ${!y ? addDays(at, -1) : addDays(at, -7)}; previous readings unavailable`);
  const prev = (r) => (r ? { date: r.date, score: r.score, zone: bandOf(f.zoneBands, r.score) } : null);
  return { score: f.score, zone: bandOf(f.zoneBands, f.score), asOf: f.computedAt, price, zoneBands: f.zoneBands,
    previous: { yesterday: prev(y), weekAgo: prev(w) }, change1d: f.score - y.score, change7d: f.score - w.score,
    gaugeNote: '8 of the 10 indicators are shown as gauges on the site (gauge: true); all 10 feed the Heat Score.',
    indicators, degraded: [...new Set(degraded)], methodology: METHOD, imageUrl: IMAGE_URL, license: LICENSE, attribution: ATTRIBUTION, limitation: LIMITATION };
}
// The Barometer picture as base64 PNG for the MCP image content item; a non-200 or a body that is not a PNG throws.
export async function picture() {
  let res;
  try { res = await fetch(base() + '/open/barometer.png', { headers: { 'user-agent': `nakamotonotes-mcp/${VERSION}`, accept: 'image/png' }, signal: AbortSignal.timeout(10000) }); }
  catch (e) { fail(`picture request failed or timed out: ${e.name === 'TimeoutError' ? 'timeout after 10s' : e.message}`); }
  if (res.status !== 200) fail(`picture returned HTTP ${res.status}`);
  const b = Buffer.from(await res.arrayBuffer());
  if (b.length < 5000 || b.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') fail('picture is not a PNG');
  return b.toString('base64');
}
export async function explain(name) {
  if (typeof name !== 'string' || squash(name) === '') fail(`name must be a string; valid names: ${KEYS.join(', ')}`);
  const key = KEYS.find((k) => squash(k) === squash(name) || squash(META[k][0]) === squash(name)) ;
  if (!key) fail(`unknown indicator; valid names: ${KEYS.join(', ')}`);
  const r = await reading(); const i = r.indicators.find((x) => x.key === key);
  return { key, name: i.name, measures: META[key][1], value: i.value, heat: i.heat, degraded: r.degraded.includes(key), feeds_score: META[key][2], asOf: r.asOf, methodology: METHOD, license: LICENSE, attribution: ATTRIBUTION, limitation: LIMITATION };
}
const day = (s) => typeof s === 'string' && /^\d{4}-\d\d-\d\d$/.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const monday = (d) => addDays(d, -((new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7));
const periodStart = { day: (d) => d, week: monday, month: (d) => `${d.slice(0, 7)}-01` };
const MAXP = 400; const DEFAULT_CAP = 180;
export async function history(from, to, interval = 'auto', maxPoints) {
  const rows = await historyRows(); const f = await feed();
  if (to === undefined) to = rows[rows.length - 1].date;
  if (!day(from) || !day(to)) fail('from and to must be real dates in YYYY-MM-DD form');
  if (from > to) fail('from must not be after to');
  if (maxPoints !== undefined && !(Number.isInteger(maxPoints) && maxPoints >= 1 && maxPoints <= MAXP)) fail('max_points must be an integer from 1 to 400');
  if (!['auto', 'day', 'week', 'month'].includes(interval)) fail('interval must be one of day, week, month, auto');
  if (from > rows[rows.length - 1].date) fail(`from ${from} is after the last history row ${rows[rows.length - 1].date}`);
  const sel = rows.filter((r) => r.date >= from && r.date <= to);
  const count = (iv) => new Set(sel.map((r) => periodStart[iv](r.date))).size;
  const cap = maxPoints ?? (interval === 'auto' ? DEFAULT_CAP : MAXP);
  let used = interval;
  if (interval === 'auto') used = ['day', 'week', 'month'].find((iv) => count(iv) <= cap) || 'month';
  else if (maxPoints === undefined && count(interval) > MAXP) fail(`${interval} interval would return ${count(interval)} points (max ${MAXP}); the ${['day', 'week', 'month'].find((iv) => count(iv) <= MAXP)} interval fits`);
  const groups = new Map(); for (const r of sel) { const k = periodStart[used](r.date); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r.score); }
  const allPoints = [...groups].map(([date, ss]) => {
    if (used === 'day') return { date, score: ss[0], zone: bandOf(f.zoneBands, ss[0]) };
    const score = Math.round(ss.reduce((a, b) => a + b, 0) / ss.length);
    return { date, score, min: Math.min(...ss), max: Math.max(...ss), zone: bandOf(f.zoneBands, score), days: ss.length };
  });
  const omitted = Math.max(0, allPoints.length - cap); const points = omitted ? allPoints.slice(-cap) : allPoints;
  const all = sel.map((r) => r.score);
  const daysPerZone = Object.fromEntries(ZONES.map((z) => [z, sel.filter((r) => bandOf(f.zoneBands, r.score) === z).length]));
  const summary = all.length ? { min: Math.min(...all), max: Math.max(...all), mean: r2(all.reduce((a, b) => a + b, 0) / all.length), days: all.length, daysPerZone } : fail('no history rows in that range');
  return { from, to, interval: used, count: points.length, points, ...(omitted ? { truncated: true, omittedPoints: omitted } : {}), summary, dataRange: { first: rows[0].date, last: rows[rows.length - 1].date }, methodology: METHOD, license: LICENSE, limitation: LIMITATION };
}
