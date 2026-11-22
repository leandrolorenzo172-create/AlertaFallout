// Recolhe as emissoras de Portugal do diretório radio-browser.info e grava src/data/stationsPT.json.
// Corre no GitHub Actions antes do build (e de hora a hora, com o cron do workflow).
// Se a API falhar, o ficheiro que já está no repositório fica como está e o build usa-o.
//
// Regras:
// - só streams HTTPS (o site está em https e o browser bloqueia áudio http: conteúdo misto);
// - cada stream é testado com um pedido curto (5 s) e os que não respondem ficam de fora;
// - sem repetidas (mesmo nome ou mesmo endereço), com prioridade às 16 de DEFAULT_STATIONS;
// - frequências livres atribuídas de forma determinística: primeiro FM (0,6 MHz entre emissoras),
//   quando a FM enche, AM (10 kHz entre emissoras). A mesma lista dá sempre as mesmas frequências.
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_STATIONS, SPACING, BAND_LIMITS } from '../src/radio/defaultStations.js';

const OUT = 'src/data/stationsPT.json';
const SERVERS = ['de1', 'fi1', 'nl1', 'at1', 'de2'].map((s) => `https://${s}.api.radio-browser.info`);
const QUERY = '/json/stations/search?countrycode=PT&hidebroken=true&order=clickcount&reverse=true&limit=500';
const PROBE_MS = 5000;
const PARALLEL = 16;
const UA = 'AlertaFallout/1.0 (+https://github.com/steeldeck/SteelDeck)';

// ---------- 1. Ir buscar a lista, tentando os vários servidores ----------
async function fetchList() {
  for (const base of SERVERS) {
    try {
      const res = await fetch(base + QUERY, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data) || !data.length) throw new Error('lista vazia');
      console.log(`${base}: ${data.length} emissoras`);
      return data;
    } catch (e) {
      console.log(`${base}: falhou (${e.message})`);
    }
  }
  return null;
}

// ---------- 2. Chaves para detetar repetidas ----------
const STOP = new Set(['radio', 'fm', 'am', 'portugal', 'pt', 'online', 'web', 'the', 'oficial', 'estacao', 'rtp', 'rdp']);
export function nameKey(name) {
  return (name || '').replace(/\([^)]*\)/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w)).join(' ');
}
export function urlKey(url) {
  try {
    const u = new URL(url);
    // StreamTheWorld: o mesmo "mount" aparece com sufixos AAC/_SC e em servidores numerados
    const stw = /streamtheworld\.com/i.test(u.hostname) && u.pathname.match(/([A-Z0-9_]+?)(?:AAC)?(?:_SC)?\.(?:mp3|aac)$/i);
    if (stw) return `stw:${stw[1].toUpperCase()}`;
    return `${u.hostname.replace(/^www\./, '')}${u.port ? `:${u.port}` : ''}${u.pathname.replace(/\/+$/, '')}${u.search}`.toLowerCase();
  } catch { return url; }
}

// ---------- 3. Testar cada stream ----------
const AUDIO_TYPE = /audio|mpegurl|ogg|aac|mpeg|octet-stream|mp2t|video\/|application\/x-scpls/i;
async function probe(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Icy-MetaData': '0' }, signal: ctrl.signal, redirect: 'follow' });
    const type = res.headers.get('content-type') || '';
    const finalHttps = res.url.startsWith('https://'); // um redirecionamento para http também não serve
    const ok = res.ok && finalHttps && (!type || AUDIO_TYPE.test(type)) && !/text\/html/i.test(type);
    return ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    ctrl.abort(); // não descarregar o stream
  }
}
async function probeAll(items) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      out[i] = await probe(items[i].url);
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return out;
}

// ---------- 4. Frequências ----------
function hash(str) { // FNV-1a, estável entre execuções
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
// Posições possíveis em unidades inteiras: FM em décimas de MHz, AM em kHz (grelha de 10 kHz)
const GRID = {
  FM: { from: BAND_LIMITS.FM.min * 10, to: BAND_LIMITS.FM.max * 10, step: 1, gap: Math.round(SPACING.FM * 10), toFreq: (p) => p / 10 },
  AM: { from: BAND_LIMITS.AM.min, to: BAND_LIMITS.AM.max, step: 10, gap: SPACING.AM, toFreq: (p) => p },
};
// Lista fixa de posições livres em cada banda. Só depende das emissoras principais (fixas), por isso não muda
// de um build para o outro. Na FM percorre-se a banda de baixo para cima e guarda-se cada posição que fica
// a pelo menos 0,6 MHz das principais e das já escolhidas (assim não se desperdiça espaço entre elas).
function slotsFor(band) {
  const g = GRID[band];
  const taken = DEFAULT_STATIONS.filter((s) => s.band === band).map((s) => (band === 'FM' ? Math.round(s.freq * 10) : s.freq));
  const out = [];
  for (let p = g.from; p <= g.to; p += g.step) {
    if (taken.every((q) => Math.abs(q - p) >= g.gap) && out.every((q) => Math.abs(q - p) >= g.gap)) out.push(p);
  }
  return out;
}
function allocate(stations, previous) {
  const slots = { FM: slotsFor('FM'), AM: slotsFor('AM') };
  const used = { FM: new Set(), AM: new Set() };
  const placed = []; const left = [];
  // 1.º As emissoras que já estavam no ficheiro do repositório ficam na mesma frequência, se ainda for válida.
  //    Assim uma emissora que entra ou sai não obriga as outras a mudar de lugar.
  const before = new Map(((previous && previous.stations) || []).map((s) => [s.id, s]));
  const rest = [];
  for (const st of stations) {
    const old = before.get(st.id);
    const idx = old && slots[old.band] ? slots[old.band].findIndex((p) => GRID[old.band].toFreq(p) === old.freq) : -1;
    if (idx >= 0 && !used[old.band].has(idx)) { used[old.band].add(idx); placed.push({ ...st, band: old.band, freq: old.freq }); } else rest.push(st);
  }
  stations = rest;
  // Ordem estável (pelo identificador da emissora), não pela popularidade, que muda de hora a hora.
  // Cada emissora tem uma posição preferida (hash do identificador); se estiver ocupada, fica na seguinte livre.
  const ordered = stations.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const st of ordered) {
    let done = false;
    for (const band of ['FM', 'AM']) {
      const list = slots[band];
      if (used[band].size >= list.length) continue; // banda cheia: passa à seguinte
      const start = hash(st.id) % list.length;
      for (let k = 0; k < list.length; k++) {
        const idx = (start + k) % list.length;
        if (!used[band].has(idx)) { used[band].add(idx); placed.push({ ...st, band, freq: GRID[band].toFreq(list[idx]) }); done = true; break; }
      }
      if (done) break;
    }
    if (!done) left.push(st);
  }
  console.log(`Posições livres: ${slots.FM.length} na FM, ${slots.AM.length} na AM`);
  return { placed, left };
}

// ---------- Execução ----------
const list = await fetchList();
if (!list) { console.log(`API indisponível: fica o ${OUT} que já existe.`); process.exit(0); }

const defaultNames = new Set(DEFAULT_STATIONS.map((s) => nameKey(s.name)));
const defaultUrls = new Set(DEFAULT_STATIONS.flatMap((s) => [s.url, ...(s.alt || [])]).map(urlKey));
const seenNames = new Set(); const seenUrls = new Set();
const candidates = [];
for (const s of list) {
  const url = (s.url_resolved || s.url || '').trim();
  const name = (s.name || '').replace(/\s+/g, ' ').trim();
  if (!name || !url.startsWith('https://')) continue;
  const nk = nameKey(name); const uk = urlKey(url);
  if (!nk || defaultNames.has(nk) || defaultUrls.has(uk) || seenNames.has(nk) || seenUrls.has(uk)) continue;
  seenNames.add(nk); seenUrls.add(uk);
  const tags = (s.tags || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 3);
  candidates.push({
    id: s.stationuuid, name: name.slice(0, 60), url,
    genre: tags.length ? tags.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(', ') : '',
    page: /^https:\/\//.test(s.homepage || '') ? s.homepage.trim() : undefined,
    clicks: s.clickcount || 0,
  });
}
console.log(`${candidates.length} candidatas com HTTPS e sem repetidas; a testar os streams...`);
const alive = await probeAll(candidates);
const working = candidates.filter((_, i) => alive[i]);
console.log(`${working.length} responderam`);
if (working.length < 10) { console.log(`Muito poucas emissoras a responder: fica o ${OUT} que já existe.`); process.exit(0); }

// Se não couberem todas nas duas bandas, ficam as mais ouvidas
working.sort((a, b) => b.clicks - a.clicks);
let previous = null;
try { previous = JSON.parse(readFileSync(OUT, 'utf8')); } catch { /* primeira vez */ }
const capacity = slotsFor('FM').length + slotsFor('AM').length;
const chosen = working.slice(0, capacity);
const left0 = working.slice(capacity);
const { placed, left: left1 } = allocate(chosen, previous);
const left = [...left0, ...left1];
if (left.length) console.log(`${left.length} emissoras sem frequência livre (as menos ouvidas): ${left.map((s) => s.name).join(', ')}`);
const stations = placed
  .sort((a, b) => (a.band === b.band ? a.freq - b.freq : a.band === 'FM' ? -1 : 1))
  .map(({ clicks, ...s }) => s);

const same = previous && JSON.stringify(previous.stations) === JSON.stringify(stations);
writeFileSync(OUT, `${JSON.stringify({ generated: same ? previous.generated : new Date().toISOString(), source: 'radio-browser.info', stations }, null, 1)}\n`);
console.log(`${OUT}: ${stations.length} emissoras (${stations.filter((s) => s.band === 'FM').length} FM, ${stations.filter((s) => s.band === 'AM').length} AM)${same ? ', sem alterações' : ''}`);
