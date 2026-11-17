// Motor de resposta local (sem internet).
// Pesquisa BM25 sobre os dados da própria app: a base de conhecimento (aba Ficheiros IA / Conhecimento),
// o manual incluído, o núcleo de conhecimento do assistente e os últimos dados guardados dos separadores.
// Tudo corre no browser; nada sai do dispositivo.
import { knowledgeBase } from '@/data/survivalKnowledge';
import { manualSections } from '@/data/survivalManual';
import { listDocs, onKbChange } from '@/lib/kb';
import { DEFAULT_STATIONS } from '@/radio/defaultStations';
import stationsPT from '@/data/stationsPT.json';

// ---------- Texto ----------
const STOP = new Set(('a o os as um uma uns umas de do da dos das em no na nos nas por para pelo pela pelos pelas com sem sob sobre '
  + 'e ou mas que se como quando onde qual quais quem cujo porque pois ja nao sim muito mais menos tambem so ate entre '
  + 'eu tu ele ela nos vos eles elas me te lhe lhes meu minha teu tua seu sua nosso nossa isto isso aquilo este esta esse essa '
  + 'ser estar ter haver fazer faz foi era sao esta estao tem ha posso pode podes devo deve preciso quero queria saber diz diga '
  + 'explica explicar ajuda ajudar fala falar sobre coisa coisas algo alguma algum alguns algumas tudo todo toda todos todas '
  + 'the of and to in is it how what').split(' '));
export const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Raiz simples: as primeiras 5 letras juntam singular/plural e família de palavras (purificar/purificação)
const stem = (w) => (w.length > 5 ? w.slice(0, 5) : w.replace(/s$/, ''));
export function tokens(text) {
  return norm(text).split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem);
}
const clean = (t) => String(t || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();

// Divide textos longos em passagens (por parágrafos), para a resposta ser precisa
function passages(text, size = 900) {
  const out = []; let cur = '';
  for (const p of clean(text).split(/\n{2,}/)) {
    if (cur && cur.length + p.length > size) { out.push(cur.trim()); cur = ''; }
    cur += `${p}\n\n`;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
// "MÓDULO 3B — PURIFICAÇÃO DE ÁGUA" -> "Purificação de água"
const titleOf = (answer) => {
  const raw = (String(answer).match(/\*\*([^*\n]{4,90})\*\*/) || [, 'Núcleo do assistente'])[1]
    .replace(/^[^\p{L}\p{N}]+/u, '').replace(/^M[ÓO]DULO\s+\S+\s*[—–-]\s*/i, '').trim();
  const low = raw === raw.toUpperCase() ? raw.toLowerCase() : raw;
  return low.charAt(0).toUpperCase() + low.slice(1);
};

// ---------- Corpus ----------
function readCache(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}
function appDataDocs() {
  const docs = [];
  const dash = readCache('dashboard_cache');
  if (dash && dash.data) {
    const d = dash.data;
    const when = dash.timestamp ? new Date(dash.timestamp).toLocaleString('pt-PT') : 'última atualização';
    docs.push({
      source: 'app', title: 'Painel de ameaças (dados guardados)', ref: `Painel · ${when}`, route: '/dashboard',
      text: `Nível de ameaça global ${d.global_threat_level}/10. Risco de guerra ${d.war_risk}/10. Tensão geopolítica ${d.geopolitical_tension}/10. `
        + `Catástrofes naturais ${d.natural_disaster_risk}/10. Instabilidade económica ${d.economic_instability}/10. Risco cibernético ${d.cyber_risk}/10.\n\n`
        + `${d.summary || ''}\n\n${(d.critical_events || []).map((e) => `- ${e.title} (${e.region || 'global'}, gravidade ${e.severity}/10)`).join('\n')}`,
    });
  }
  for (const [key, title, route] of [['war_news_cache', 'Notícias de guerra (guardadas)', '/guerra'], ['catastrophe_cache', 'Catástrofes (guardadas)', '/catastrofes']]) {
    const c = readCache(key);
    if (c && Array.isArray(c.articles) && c.articles.length) {
      const when = c.timestamp ? new Date(c.timestamp).toLocaleString('pt-PT') : 'última atualização';
      docs.push({ source: 'app', title, ref: `${title.replace(/ \(.*/, '')} · ${when}`, route, text: c.articles.slice(0, 12).map((a) => `- **${a.title}** (${a.region || 'global'}, gravidade ${a.severity}/10): ${a.summary || ''}`).join('\n') });
    }
  }
  const all = [...DEFAULT_STATIONS, ...((stationsPT && stationsPT.stations) || [])];
  const fmt = (s) => (s.band === 'AM' ? `${Math.round(s.freq)} kHz AM` : `${Number(s.freq).toFixed(1)} FM`);
  docs.push({
    source: 'app', title: 'Emissoras de rádio da app', ref: 'Rádio', route: '/radio',
    text: `Rádio emissoras estações frequências FM AM ouvir. A app tem ${all.length} emissoras portuguesas.\n\n${all.map((s) => `- ${s.name}: ${fmt(s)}${s.genre ? ` — ${s.genre}` : ''}`).join('\n')}`,
  });
  return docs;
}

let index = null; let building = null; let dirty = true;
onKbChange(() => { dirty = true; });

async function buildIndex() {
  const units = [];
  const add = (u) => { const toks = tokens(`${u.title} ${u.title} ${u.text}`); if (toks.length) units.push({ ...u, toks, len: toks.length }); };
  // 1. Documentos importados (aba Conhecimento): cada página/secção
  const docs = await listDocs().catch(() => []);
  for (const d of docs) {
    if (d.enabled === false) continue;
    (d.pages || []).forEach((p, i) => {
      for (const part of passages(p)) add({ source: 'kb', title: d.title, ref: `${d.name}, ${d.unit} ${i + 1}`, docId: d.id, page: i + 1, text: part });
    });
  }
  // 2. Manual incluído
  for (const s of manualSections) for (const part of passages(s.content)) add({ source: 'manual', title: s.title, ref: `Manual — ${s.title}`, route: '/manual', text: part });
  // 3. Núcleo de conhecimento do assistente (respostas táticas por módulo)
  for (const e of knowledgeBase) {
    const title = titleOf(e.answer);
    for (const part of passages(e.answer)) add({ source: 'nucleo', title, ref: `Núcleo do assistente — ${title}`, text: part, keywords: e.keywords.join(' ') });
  }
  // 4. Dados dos separadores guardados no dispositivo
  for (const u of appDataDocs()) add(u);

  const df = new Map();
  for (const u of units) for (const t of new Set(u.toks)) df.set(t, (df.get(t) || 0) + 1);
  const avg = units.reduce((s, u) => s + u.len, 0) / Math.max(1, units.length);
  for (const u of units) {
    u.tf = new Map();
    for (const t of u.toks) u.tf.set(t, (u.tf.get(t) || 0) + 1);
    if (u.keywords) for (const t of tokens(u.keywords)) u.tf.set(t, (u.tf.get(t) || 0) + 2); // palavras-chave pesam mais
  }
  index = { units, df, avg, n: units.length, kbDocs: docs.filter((d) => d.enabled !== false).length };
  dirty = false;
  return index;
}
async function getIndex() {
  if (index && !dirty) return index;
  if (!building) building = buildIndex().finally(() => { building = null; });
  return building;
}

// ---------- Pesquisa ----------
export async function search(query, limit = 6) {
  const idx = await getIndex();
  const q = [...new Set(tokens(query))];
  if (!q.length) return { hits: [], coverage: 0 };
  const k1 = 1.4; const b = 0.75;
  const idf = (t) => Math.log(1 + (idx.n - (idx.df.get(t) || 0) + 0.5) / ((idx.df.get(t) || 0) + 0.5));
  const scored = [];
  for (const u of idx.units) {
    let s = 0; let matched = 0;
    for (const t of q) {
      const f = u.tf.get(t);
      if (!f) continue;
      matched++;
      s += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * u.len) / idx.avg)));
    }
    if (matched) {
      const boost = u.source === 'kb' ? 1.25 : u.source === 'app' ? 1.15 : 1; // os documentos do utilizador primeiro
      scored.push({ u, score: s * boost * (0.5 + matched / q.length), matched });
    }
  }
  scored.sort((a, b2) => b2.score - a.score);
  const best = scored[0];
  return { hits: scored.slice(0, limit), coverage: best ? best.matched / q.length : 0, terms: q.length };
}

// Passagens mais relevantes, para dar contexto à IA online
export async function contextFor(query, limit = 6) {
  const { hits } = await search(query, limit);
  return hits.map((h) => ({ ref: h.u.ref, source: h.u.source, title: h.u.title, text: h.u.text.slice(0, 1500), docId: h.u.docId, page: h.u.page, route: h.u.route }));
}

const refOfUnit = (u) => ({ label: u.ref, source: u.source, docId: u.docId, page: u.page, route: u.route });
const SOURCE_NAME = { kb: 'Da tua base de conhecimento', manual: 'Do manual incluído', nucleo: 'Do núcleo do assistente', app: 'Dos dados guardados na app' };

// Tópicos para sugestões: documentos importados primeiro, depois secções do manual
export async function topics(n = 4, withSource = false) {
  const idx = await getIndex();
  const kb = [...new Set(idx.units.filter((u) => u.source === 'kb').map((u) => u.title))].map((title) => ({ title, source: 'kb' }));
  const manual = manualSections.map((s) => ({ title: s.title, source: 'manual' }));
  const all = [...kb, ...manual].slice(0, n);
  return withSource ? all : all.map((t) => t.title);
}

// Resposta completa do motor local
// reason: 'offline' (sem rede), 'nokey' (online mas sem IA configurada) ou 'error' (a IA online falhou)
export async function answerLocally(question, { reason = 'offline' } = {}) {
  // "Saber mais sobre: X" -> todo o conteúdo guardado sobre esse tema
  const more = String(question).match(/^saber mais sobre:?\s*(.+)$/i);
  if (more) {
    const idx = await getIndex();
    const parts = idx.units.filter((u) => u.title === more[1].trim());
    if (parts.length) {
      const u0 = parts[0];
      let body = ''; for (const u of parts) { if (body.length > 3500) break; body += `${clean(u.text)}\n\n`; }
      const related = (await search(u0.title, 8)).hits.map((h) => h.u.title).filter((t, i, a) => t !== u0.title && a.indexOf(t) === i).slice(0, 2);
      return { text: `**${SOURCE_NAME[u0.source]} — ${u0.title}**\n\n${body.trim()}${body.length > 3500 ? '\n\n_(Continua no documento original.)_' : ''}`, refs: [refOfUnit(u0)], followups: related.map((t) => `Fala-me de: ${t}`), found: true };
    }
  }
  const { hits, coverage, terms } = await search(question.replace(/^fala-me de:?\s*/i, ''), 8);
  const best = hits[0];
  const enough = best && (best.score >= 2.2 || (terms === 1 && best.score >= 1.2)) && coverage >= (terms <= 2 ? 0.5 : 0.34);
  const intro = reason === 'offline' ? 'Estou **sem ligação à internet**' : reason === 'nokey' ? 'A **IA online não está ligada** (falta a chave nas Definições)' : 'A **IA online não respondeu**';
  if (!enough) {
    const t = await topics(3);
    return {
      text: `${intro}, por isso só consigo responder com o que está guardado na app e na aba **Conhecimento** — e não encontrei nada sobre isso.\n\nExperimenta perguntar sobre um destes temas, ou importa documentos na aba **Ficheiros IA** para eu os poder consultar sem rede:\n\n${t.map((x) => `- ${x}`).join('\n')}`,
      refs: [],
      followups: t.map((x) => `Fala-me de: ${x}`),
      found: false,
    };
  }
  const main = best.u;
  // Junta a passagem seguinte do mesmo documento se também for relevante (resposta mais completa)
  const extra = hits.slice(1).find((h) => h.u.ref === main.ref && h.score > best.score * 0.6);
  const other = hits.slice(1).find((h) => h.u.title !== main.title && h.score > best.score * 0.55);
  let text = `**${SOURCE_NAME[main.source]} — ${main.title}**\n\n${clean(main.text)}`;
  if (extra) text += `\n\n${clean(extra.u.text)}`;
  if (other) {
    const snippet = clean(other.u.text).split(/\n{2,}/)[0].slice(0, 420);
    text += `\n\n---\n\n**Também relacionado — ${other.u.title}** (${SOURCE_NAME[other.u.source].toLowerCase()})\n\n${snippet}${snippet.length >= 420 ? '…' : ''}`;
  }
  const refs = [refOfUnit(main), ...(other ? [refOfUnit(other.u)] : [])];
  // Perguntas de seguimento: tópicos relacionados encontrados na pesquisa
  const seenT = new Set([norm(main.title)]);
  const related = hits.map((h) => h.u.title).filter((t) => { const k = norm(t); if (seenT.has(k)) return false; seenT.add(k); return true; }).slice(0, 2);
  const followups = [`Saber mais sobre: ${main.title}`, ...related.map((t) => `Fala-me de: ${t}`)];
  return { text, refs, followups: followups.slice(0, 3), found: true };
}
