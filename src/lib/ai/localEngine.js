// Motor de resposta local (sem internet).
// Pesquisa BM25 sobre os dados da própria app: a base de conhecimento (aba Ficheiros IA / Conhecimento),
// o manual incluído, o núcleo de conhecimento do assistente e os últimos dados guardados dos separadores.
// Tudo corre no browser; nada sai do dispositivo.
import { knowledgeBase } from '@/data/survivalKnowledge';
import { manualSections } from '@/data/survivalManual';
import { listDocs, onKbChange } from '@/lib/kb';
import { DEFAULT_STATIONS } from '@/radio/defaultStations';
import stationsPT from '@/data/stationsPT.json';
import { locale } from '../../i18n';
import { cleanNoise, intentOf, greeting, starter, identity, intro, connector, closing, missing } from './steelPersonaOffline';

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
// Texto de documentos importados (muitas vezes de OCR) mostrado tal como está: sem que "~", "*", "_" ou "#" virem
// riscados, negrito ou títulos por acaso. O manual incluído é Markdown a sério e não passa por aqui.
const plain = (t) => clean(t).replace(/[\\`*_~[\]<>|]/g, (c) => `\\${c}`).replace(/^(\s*)(#{1,6}|[-+])(\s)/gm, '$1\\$2$3').replace(/^(\s*\d+)([.)])(\s)/gm, '$1\\$2$3');
const shown = (u, t = u.text) => (u.source === 'kb' ? plain(cleanNoise(t)) : clean(t));

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
    const when = dash.timestamp ? new Date(dash.timestamp).toLocaleString(locale()) : 'última atualização';
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
      const when = c.timestamp ? new Date(c.timestamp).toLocaleString(locale()) : 'última atualização';
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
    let chapter = '';
    (d.pages || []).forEach((p, i) => {
      // PDFs com cabeçalho de capítulo (ex.: "05. PURIFICAÇÃO DE ÁGUA…" no eBook): o título passa a ser o capítulo
      const h = p.match(/STEELDECK\s*\/\/\s*GUIA DE SOBREVIV[ÊE]NCIA\s+\d{2}\.\s+([^\n]+?)\s*$/m);
      if (h) {
        let c = h[1].trim();
        if (c.endsWith('…')) { // título cortado no cabeçalho: completa-o pelo título da secção do manual
          const cut = norm(c.slice(0, -1)).trim();
          const full = manualSections.find((m) => norm(m.title).startsWith(cut));
          c = full ? full.title : c.slice(0, -1).replace(/\s+\S*$/, '');
        }
        chapter = c.trim();
      }
      const nice = chapter === chapter.toUpperCase() ? `${chapter.charAt(0)}${chapter.slice(1).toLowerCase()}` : chapter;
      const title = chapter ? `${d.system ? 'Guia SteelDeck' : d.title} · ${nice}` : d.title;
      for (const part of passages(p)) add({ source: 'kb', title, ref: `${d.name}, ${d.unit} ${i + 1}`, docId: d.id, page: i + 1, text: part });
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
      // prioridade: documentos da Base de Conhecimento (inclui o eBook), depois dados vivos da app; manual e núcleo antigos são secundários
      const boost = u.source === 'kb' ? 1.5 : u.source === 'app' ? 1.15 : 0.75;
      scored.push({ u, score: s * boost * (0.5 + matched / q.length), matched });
    }
  }
  scored.sort((a, b2) => b2.score - a.score);
  const best = scored[0];
  return { hits: scored.slice(0, limit), coverage: best ? best.matched / q.length : 0, terms: q.length };
}

// Passagens mais relevantes, para dar contexto à IA online
// minScore: abaixo disto a passagem não é relevante (evita gastar tokens com "lixo" em perguntas gerais)
export async function contextFor(query, limit = 6, { chars = 1500, minScore = 0 } = {}) {
  const { hits } = await search(query, limit);
  return hits.filter((h) => h.score >= minScore).map((h) => ({ ref: h.u.ref, source: h.u.source, title: h.u.title, score: h.score, text: (h.u.source === 'kb' ? cleanNoise(h.u.text) : h.u.text).slice(0, chars), docId: h.u.docId, page: h.u.page, route: h.u.route }));
}

const refOfUnit = (u) => ({ label: u.ref, source: u.source, docId: u.docId, page: u.page, route: u.route });

// Tópicos para sugestões: documentos importados primeiro, depois secções do manual
export async function topics(n = 4, withSource = false) {
  const idx = await getIndex();
  const kbTitles = [...new Set(idx.units.filter((u) => u.source === 'kb').map((u) => u.title))];
  // de um documento com capítulos, sugere os capítulos (não a capa/páginas iniciais)
  const kb = kbTitles.filter((t) => t.includes(' · ') || !kbTitles.some((o) => o.includes(' · ') && idx.units.some((u) => u.title === t && idx.units.some((v) => v.title === o && v.docId === u.docId))))
    .map((title) => ({ title, source: 'kb' }));
  const manual = manualSections.map((s) => ({ title: s.title, source: 'manual' }));
  const all = [...kb, ...manual].slice(0, n);
  return withSource ? all : all.map((t) => t.title);
}

// ---------- Resposta do motor local (Mr. Steel offline) ----------
// reason: 'offline' (sem rede), 'nokey' (online mas sem IA configurada) ou 'error' (a IA online falhou)
// history: mensagens anteriores da conversa ({ role, text, refs }), para "continua", "resume isso", etc.
// Frases completas (não fragmentos de tabela, legendas ou títulos em maiúsculas), para os resumos
const firstSentences = (text, max = 6) => cleanNoise(clean(text).replace(/\\(.)/g, '$1')).split(/\n+/)
  .map((l) => l.replace(/^[\s>*#\-•■\d.)]+/, '').trim())
  .filter((l) => l.length > 30 && !/^FIG\./i.test(l) && (l.match(/[a-zà-ú]/g) || []).length > l.length * 0.45)
  .map((l) => (l.match(/^.{20,220}?[.!?](\s|$)/) || [l.slice(0, 220)])[0].trim())
  .sort((a, b) => /[.!?]$/.test(b) - /[.!?]$/.test(a)) // frases completas primeiro
  .slice(0, max);

async function followupsFor(title, hits = []) {
  const seen = new Set([norm(title)]);
  const related = hits.map((h) => h.u.title).filter((t) => { const k = norm(t); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 2);
  return [`Saber mais sobre: ${title}`, ...related.map((t) => `Fala-me de: ${t}`)].slice(0, 3);
}

// Unidades já mostradas na última resposta (pela referência e pelo texto)
async function lastShown(history) {
  const last = [...(history || [])].reverse().find((m) => m.role === 'assistant' && m.refs && m.refs.length);
  if (!last) return null;
  const idx = await getIndex();
  const ref = last.refs[0];
  const sameRef = idx.units.filter((u) => u.ref === ref.label);
  const sameDoc = ref.docId ? idx.units.filter((u) => u.docId === ref.docId) : sameRef;
  const inText = (u) => last.text.includes(shown(u).slice(0, 60).trim());
  const shownUnits = sameDoc.filter(inText);
  return { last, ref, sameDoc, shownUnits: shownUnits.length ? shownUnits : sameRef.slice(0, 1) };
}

export async function answerLocally(question, { reason = 'offline', history = [] } = {}) {
  const offline = reason === 'offline';
  const intent = intentOf(question);

  // 1. Conversa: saudações, quem sou, agradecimentos
  if (intent === 'greet' || intent === 'who' || intent === 'thanks') {
    const t = await topics(3);
    const text = intent === 'greet' ? `${greeting(offline)}\n\n${starter()}`
      : intent === 'who' ? `${identity()}\n\n${starter()}`
        : `Sempre ao dispor. ${closing()}`;
    return { text, refs: [], followups: t.map((x) => `Fala-me de: ${x}`), found: true };
  }

  // 2. Continuação / resumo do tema anterior
  if (intent === 'continue' || intent === 'summary') {
    const ctx = await lastShown(history);
    if (ctx) {
      const { shownUnits, sameDoc, ref } = ctx;
      const main = shownUnits[0];
      if (intent === 'summary') {
        const pts = shownUnits.flatMap((u) => firstSentences(shown(u), 4)).slice(0, 6);
        if (pts.length) {
          return { text: `Em síntese, sobre **${main.title}**:\n\n${pts.map((p) => `- ${p}`).join('\n')}\n\n_${closing()}_`, refs: [refOfUnit(main)], followups: await followupsFor(main.title), found: true };
        }
      } else {
        const lastPos = Math.max(...shownUnits.map((u) => sameDoc.indexOf(u)));
        const after = sameDoc.slice(lastPos + 1);
        const sameTopic = after.filter((u) => u.title === main.title);
        const next = (sameTopic.length ? sameTopic : after).slice(0, 2);
        if (next.length) {
          const body = next.map((u) => shown(u)).join('\n\n');
          return { text: `Prossigo em **${next[0].title}**${next[0].page && next[0].page !== ref.page ? ` (pág. ${next[0].page})` : ''}:\n\n${body}\n\n_${closing()}_`, refs: [refOfUnit(next[0])], followups: ['Continua', 'Resume isso', `Saber mais sobre: ${next[0].title}`], found: true };
        }
        return { text: `Chegámos ao fim do que tenho sobre **${main.title}**. ${closing()}`, refs: [refOfUnit(main)], followups: await followupsFor(main.title), found: true };
      }
    }
    // sem tema anterior: tenta com a última pergunta do utilizador
    const prevQ = [...(history || [])].reverse().find((m) => m.role === 'user' && !intentOf(m.text));
    if (prevQ) question = prevQ.text;
  }

  // 3. "Saber mais sobre: X" -> todo o conteúdo guardado sobre esse tema
  const more = String(question).match(/^saber mais sobre:?\s*(.+)$/i);
  if (more) {
    const idx = await getIndex();
    const parts = idx.units.filter((u) => u.title === more[1].trim());
    if (parts.length) {
      const u0 = parts[0];
      let body = ''; for (const u of parts) { if (body.length > 3500) break; body += `${shown(u)}\n\n`; }
      const related = (await search(u0.title, 8)).hits.map((h) => h.u.title).filter((t, i, a) => t !== u0.title && a.indexOf(t) === i).slice(0, 2);
      return { text: `${intro()}\n\n**${u0.title}**\n\n${body.trim()}${body.length > 3500 ? '\n\n_(Continua no documento original.)_' : ''}\n\n_${closing()}_`, refs: [refOfUnit(u0)], followups: ['Continua', ...related.map((t) => `Fala-me de: ${t}`)].slice(0, 3), found: true };
    }
  }

  // 4. Pesquisa: até 3 passagens complementares, ligadas numa resposta só
  const { hits, coverage } = await search(String(question).replace(/^fala-me de:?\s*/i, ''), 10);
  const best = hits[0];
  const enough = best && best.score >= 1.4 && coverage >= 0.25;
  if (!enough) {
    const t = await topics(3);
    return { text: missing(t, reason), refs: [], followups: t.map((x) => `Fala-me de: ${x}`), found: false };
  }
  const main = best.u;
  const extra = hits.slice(1).find((h) => h.u.ref === main.ref && h.score > best.score * 0.55);
  const other = hits.slice(1).find((h) => h.u.title !== main.title && h.score > best.score * 0.5);
  let text = `${intro()}\n\n**${main.title}**\n\n${shown(main)}`;
  if (extra) text += `\n\n${shown(extra.u)}`;
  if (other) {
    const snippet = shown(other.u, clean(other.u.text).split(/\n{2,}/).slice(0, 2).join('\n\n').slice(0, 600));
    text += `\n\n---\n\n${connector()}\n\n**${other.u.title}**\n\n${snippet}${snippet.length >= 600 ? '…' : ''}`;
  }
  text += `\n\n_${closing()}_`;
  const refs = [refOfUnit(main), ...(other ? [refOfUnit(other.u)] : [])];
  return { text, refs, followups: await followupsFor(main.title, hits), found: true };
}
