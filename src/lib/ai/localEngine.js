// Motor de resposta local (sem internet).
// Pesquisa BM25 sobre os dados da própria app: a base de conhecimento (aba Ficheiros IA / Conhecimento),
// o manual incluído, o núcleo de conhecimento do assistente e os últimos dados guardados dos separadores.
// Tudo corre no browser; nada sai do dispositivo.
import { knowledgeBase } from '@/data/survivalKnowledge';
import { manualSections } from '@/data/survivalManual';
import { listDocs, onKbChange } from '@/lib/kb';
import { ensureGuide } from '@/lib/guide';
import { DEFAULT_STATIONS } from '@/radio/defaultStations';
import stationsPT from '@/data/stationsPT.json';
import { locale } from '../../i18n';
import { cleanNoise, intentOf, greeting, starter, identity, question, missing, rephrase, thanks, opener, smallTalk, isJoke, joke } from './steelPersonaOffline';
import RESUMOS from '@/data/mrsteel/resumos.json';
import { isConversation, offlineChatReply } from './chatMode';

// ---------- Texto ----------
const STOP = new Set(('a o os as um uma uns umas de do da dos das em no na nos nas num numa nuns numas dum duma ao aos por para pelo pela pelos pelas com sem sob sobre '
  + 'e ou mas que se como quando onde qual quais quem cujo porque pois ja nao sim muito mais menos tambem so ate entre '
  + 'eu tu ele ela nos vos eles elas me te lhe lhes meu minha teu tua seu sua nosso nossa isto isso aquilo este esta esse essa '
  + 'ser estar ter haver fazer faz foi era sao esta estao tem ha posso pode podes devo deve preciso quero queria saber diz diga '
  + 'explica explicar ajuda ajudar fala falar sobre coisa coisas algo alguma algum alguns algumas tudo todo toda todos todas '
  + 'montar monto montas monte construir construo construa fazes faco fazer-se arranjar conseguir consigo existe existem devo devia deveria '
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
  const partOf = new Map();
  const add = (u) => {
    const toks = tokens(`${u.title} ${u.title} ${u.text}`); if (!toks.length) return;
    const part = (partOf.get(u.ref) || 0) + 1; partOf.set(u.ref, part);
    units.push({ ...u, key: `${u.ref}#${part}`, toks, len: toks.length });
  };
  // 1. Documentos importados (aba Conhecimento): cada página/secção
  await ensureGuide().catch(() => {}); // o Guia tem de estar na Base de Conhecimento mesmo sem abrir o Manual
  const docs = await listDocs().catch(() => []);
  for (const d of docs) {
    if (d.enabled === false) continue;
    let chapter = '';
    (d.pages || []).forEach((p, i) => {
      // PDFs com cabeçalho de capítulo (ex.: "05. PURIFICAÇÃO DE ÁGUA…" no eBook): o título passa a ser o capítulo
      const h = p.match(/STEELDECK\s*\/\/\s*GUIA DE SOBREVIV[ÊE]NCIA\s+\d{2}\.\s+([^\n]+?)\s*$/m);
      if (h) {
        let c = h[1].trim();
        // título do cabeçalho (às vezes cortado com "…"): usa o título completo da secção do manual
        const cut = norm(c.replace(/…$/, '')).trim();
        const full = manualSections.find((m) => norm(m.title).startsWith(cut));
        c = full ? full.title : c.replace(/…$/, '').replace(/\s+\S*$/, '');
        chapter = c.trim();
      }
      const nice = chapter === chapter.toUpperCase() ? `${chapter.charAt(0)}${chapter.slice(1).toLowerCase()}` : chapter;
      const title = chapter ? `${d.system ? 'Guia SteelDeck' : d.title} · ${nice}` : d.title;
      for (const part of passages(p)) add({ source: 'kb', title, ref: `${d.name}, ${d.unit} ${i + 1}`, docId: d.id, page: i + 1, unit: d.unit, doc: `o ficheiro «${d.system ? 'Guia de Sobrevivência SteelDeck.pdf' : d.name}»`, text: part });
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
const SYN = Object.fromEntries(Object.entries({
  comer: 'comida alimentos', fome: 'comida alimentos', beber: 'agua', sede: 'agua desidratacao', dormir: 'abrigo',
  frio: 'hipotermia abrigo', calor: 'insolacao desidratacao', sangue: 'hemorragia', ferida: 'hemorragia feridas',
  perdido: 'orientacao', norte: 'orientacao bussola', lume: 'fogo', fogueira: 'fogo', corda: 'nos', mochila: 'kit',
  chuva: 'tempo abrigo', trovao: 'trovoada', mar: 'maritimo', afogar: 'maritimo', lixo: 'higiene', banho: 'higiene',
}).map(([k, v]) => [tokens(k)[0], tokens(v)]));
export async function search(query, limit = 6, { only } = {}) {
  const idx = await getIndex();
  const q0 = [...new Set(tokens(query))];
  if (!q0.length) return { hits: [], coverage: 0 };
  // sinónimos simples: a pergunta usa uma palavra, o Guia usa outra ("comer" → comida/alimentos)
  const q = [...new Set([...q0, ...q0.flatMap((t) => SYN[t] || [])])];
  const k1 = 1.4; const b = 0.75;
  const idf = (t) => Math.log(1 + (idx.n - (idx.df.get(t) || 0) + 0.5) / ((idx.df.get(t) || 0) + 0.5));
  const scored = [];
  for (const u of idx.units) {
    if (only && u.source !== only) continue;
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

const refOfUnit = (u, used) => ({ label: u.ref, source: u.source, docId: u.docId, page: u.page, route: u.route, ...(used ? { keys: used.map((x) => x.key) } : {}) });

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
// Nunca cola texto cru: escolhe as frases mais úteis das passagens e monta a resposta em prosa
// (abertura + síntese + ligação a outra fonte + pergunta sobre o tema).

// Frases candidatas de uma passagem, já limpas (sem tabelas partidas, legendas ou títulos em maiúsculas)
function candidates(u) {
  const text = cleanNoise(clean(u.text)).replace(/\*\*/g, '');
  const out = []; let heading = ''; let inHeading = false;
  for (const raw of text.split(/\n+/)) {
    if (/^\s*☐/.test(raw)) continue;
    // títulos em maiúsculas ("PEDERNEIRA DE FERROCÉRIO" + "DIFICULDADE: FÁCIL") dão contexto às frases seguintes
    const letters = raw.replace(/[^A-Za-zÀ-ú]/g, '');
    if (letters.length >= 4 && (raw.match(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/g) || []).length > letters.length * 0.7) { heading = inHeading ? `${heading} ${raw}` : raw; inHeading = true; continue; }
    if (letters.length) inHeading = false; // listas de verificação ("Sei fazer…") não são explicações
    const step = /^\s*(\d+[.)]|[■•\-▶])\s+/.test(raw);
    const line = raw.replace(/^[\s>*#\-•■▶☐\d.)]+/, '').trim();
    const parts = step ? [line] : line.split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/);
    for (let p of parts) {
      p = p.trim();
      const words = p.split(/\s+/).length;
      if (p.length < 35 || p.length > 300 || words < 6 || /^FIG\./i.test(p)) continue;
      if ((p.match(/[a-zà-ú]/g) || []).length < p.length * 0.5) continue; // títulos e tabelas
      // linha de tabela: várias palavras com maiúscula a meio, sem vírgulas nem pontuação final
      if (!/[.!?,;:]/.test(p) && (p.slice(1).match(/\s[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ú]/g) || []).length >= 2) continue;
      const whole = /[.!?]$/.test(p); // frase completa (as linhas de tabelas raramente acabam em ponto)
      if (!/[.!?:)]$/.test(p)) p = `${p.replace(/[,;:\s]+$/, '')}.`;
      out.push({ text: p.charAt(0).toUpperCase() + p.slice(1), step, u, heading, whole });
    }
  }
  return out;
}
// As frases mais relevantes para a pergunta, pela ordem em que aparecem no texto
function keySentences(units, query, max = 3, strict = false) {
  const q = new Set(tokens(query || ''));
  // palavras raras (ex.: "pederneira") pesam mais do que palavras comuns no Guia (ex.: "fogo")
  const idfW = (t) => (index ? Math.log(1 + index.n / (1 + (index.df.get(t) || 0))) : 1);
  const all = units.flatMap(candidates).map((c, i) => {
    const inText = new Set(tokens(c.text)); const inHead = new Set(tokens(c.heading || ''));
    let sc = 0;
    for (const t of q) { if (inText.has(t)) sc += idfW(t) * 2; else if (inHead.has(t)) sc += idfW(t) * 1.7; } // título da secção também conta
    if (!c.whole) sc *= 0.5;
    return { ...c, i, score: (q.size ? sc : 0) + (/[.!?]$/.test(c.text) ? 0.5 : 0) - i * 0.02 };
  });
  const seen = new Set();
  const relevant = q.size ? all.filter((c) => c.score >= (strict ? 6 : 2)) : all; // com pergunta: só frases que tocam no tema
  if (strict && !relevant.length) return [];
  return (relevant.length ? relevant : all).sort((a, b) => b.score - a.score).filter((c) => { const k = norm(c.text).slice(0, 50); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, max).sort((a, b) => a.i - b.i);
}

// ---------- Fórmula de resumo (src/data/mrsteel/formula-resumo.md), para QUALQUER documento ----------
// 1.º consulta a base de conhecimento (as passagens do tema) -> 2.º classifica as frases nos 4 blocos da fórmula ->
// 3.º escreve 10–15 linhas: porquê/contexto -> critérios e escolha do local -> opções práticas -> avisos de segurança.
const CUE = {
  ctx: /\b(porque|prioridade|primeir[ao]|mais depressa|essencial|fundamental|importante|objetivo|depende|mata[mr]?|perdes|perde|serve para|e a base|regra de ouro|metade)\b/,
  crit: /\b(escolh\w*|local|sitio|criterios?|distancias?|raio|longe|perto|acima|abaixo|direc\w*|vento|norte|sul|este|oeste|elevac\w*|encosta|vale|zonas?|visivel|clareira|sinaliz\w*|minimo|maximo|antes de|verifica|procura|identifica\w*|reconhec\w*)\b|\d+\s?(m|km|cm|metros|min|minutos|horas|h|%|graus|°)\b/,
  opt: /\b(tipos?|metodos?|opc\w*|alternativ\w*|podes|consegues|usa[rs]?|monta\w*|constro\w*|faz\w*|improvis\w*|sem ferramentas|lona|com uma?|serve|funciona|tecnica|modelo|versao|emergencia)\b/,
  safe: /\b(nunca|nao (bebas|comas|faca\w*|uses|deixes|atravesses|movas|cortes|chupes|tentes|rebentes)|cuidado|perig\w*|proibid\w*|mortal|toxic\w*|venenos\w*|112|evita\w*|obrigatori\w*|aviso|risco|sempre|isol\w*|ventila\w*|monoxido|incendio|queima\w*|molhad\w*)\b/,
};
const BLOCKS = ['ctx', 'crit', 'opt', 'safe'];
const QUOTA = { ctx: 2, crit: 4, opt: 4, safe: 3 }; // 13 linhas; mínimo 10, máximo 15
function formulaSentences(units, query) {
  const q = new Set(tokens(query || ''));
  const idfW = (t) => (index ? Math.log(1 + index.n / (1 + (index.df.get(t) || 0))) : 1);
  const seen = new Set();
  const all = units.flatMap(candidates).filter((c) => {
    if (!c.whole && !c.step) return false;
    const k = norm(c.text).slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true;
  });
  if (!all.length) return [];
  const scored = all.map((c, i) => {
    const t = norm(c.text);
    const inText = new Set(tokens(c.text)); const inHead = new Set(tokens(c.heading || ''));
    let rel = 0; for (const w of q) { if (inText.has(w)) rel += idfW(w); else if (inHead.has(w)) rel += idfW(w) * 0.6; }
    const cue = {};
    for (const b of BLOCKS) cue[b] = (t.match(new RegExp(CUE[b].source, 'g')) || []).length;
    cue.ctx += i < 3 ? 2 : 0; // a abertura do tema costuma ser a premissa
    if (/\b(nunca|proibid|mortal|112|nao (bebas|comas|faca|uses|deixes))/.test(t)) cue.safe += 3;
    const block = BLOCKS.reduce((a, b) => (cue[b] > cue[a] ? b : a), 'opt');
    const len = c.text.length;
    return { ...c, i, rel, block, score: rel * 1.5 + cue[block] + (len > 60 && len < 240 ? 1 : 0) - i * 0.01 };
  });
  const pickBlock = (b, n, taken) => scored.filter((c) => c.block === b && !taken.has(c)).sort((x, y) => y.score - x.score).slice(0, n);
  const taken = new Set();
  const out = {};
  for (const b of BLOCKS) { out[b] = pickBlock(b, QUOTA[b], taken); out[b].forEach((c) => taken.add(c)); }
  // a frase que responde mais diretamente à pergunta entra sempre
  const best = [...scored].sort((x, y) => y.rel - x.rel)[0];
  if (best && best.rel > 0 && !taken.has(best)) { out[best.block].unshift(best); taken.add(best); }
  // completa até 10 linhas com as frases mais relevantes que sobraram (ficam no bloco de cada uma)
  let total = BLOCKS.reduce((s2, b) => s2 + out[b].length, 0);
  for (const c of [...scored].sort((x, y) => y.score - x.score)) { if (total >= 10) break; if (taken.has(c)) continue; out[c.block].push(c); taken.add(c); total++; }
  // corta acima de 15, a partir do bloco mais cheio
  while (total > 15) { const b = BLOCKS.reduce((a, x) => (out[x].length > out[a].length ? x : a), 'ctx'); out[b].pop(); total--; }
  for (const b of BLOCKS) out[b].sort((x, y) => x.i - y.i); // dentro do bloco, pela ordem do documento
  return BLOCKS.map((b) => out[b]).filter((l) => l.length);
}
// Passagens do tema: o capítulo inteiro (Guia e PDFs com capítulos) ou as páginas à volta das melhores passagens
function topicUnits(idx, hits) {
  const main = hits[0].u;
  const sameDoc = idx.units.filter((u) => u.source === main.source && (main.docId ? u.docId === main.docId : u.ref === main.ref));
  const chapter = main.title.includes(' · ') ? sameDoc.filter((u) => u.title === main.title) : [];
  let units = chapter.length && chapter.length <= 14 ? chapter : [];
  if (!units.length) {
    const pages = new Set(hits.filter((h) => h.u.docId === main.docId && h.score > hits[0].score * 0.4).map((h) => h.u.page));
    units = sameDoc.filter((u) => [...pages].some((x) => Math.abs(x - u.page) <= 1)).slice(0, 12);
  }
  return units.length ? units : [main];
}
async function formulaAnswer(q, hits) {
  const idx = await getIndex();
  const units = topicUnits(idx, hits);
  const blocks = formulaSentences(units, q);
  const n = blocks.reduce((s2, b) => s2 + b.length, 0);
  if (n < 4) return null; // pouco texto corrido (só tabelas): usa a resposta curta
  const used = [...new Set(blocks.flat().map((c) => c.u))];
  const pages = [...new Set(blocks.flat().map((c) => c.u.page).filter(Boolean))].sort((a, b) => a - b);
  const u0 = used[0];
  const where = pages.length > 1 ? `${u0.unit === 'pág.' ? 'páginas' : 'secções'} ${pages[0]}–${pages[pages.length - 1]}` : pages.length ? `${pageWord(u0)} ${pages[0]}` : '';
  const paras = blocks.map((b) => b.map((c) => esc(c.text)).join(' '));
  paras[0] = `${opener(/guia/i.test(u0.doc || ''))} Com base ${u0.doc ? `n${u0.doc}` : 'nos teus ficheiros'}${where ? `, ${where}` : ''}, ${lowerFirst(paras[0])}`;
  return {
    text: `${paras.join('\n\n')}\n\n${question()}`,
    refs: [refOfUnit(u0, used)],
    followups: await followupsFor(hits[0].u.title, hits),
    found: true,
  };
}

// Citação explícita da fonte: "Segundo o Guia de Sobrevivência SteelDeck, página 31, …"
const lowerFirst = (t) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]([a-zà-ú]|\s[a-zà-ú])/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const pageWord = (u) => (u.unit === 'pág.' ? 'página' : 'secção');
// "como fazer fogo?" -> "para fazer fogo"
function purposeOf(q) {
  const m = norm(q).match(/^(como|de que forma|qual a melhor forma de|o que (e preciso|preciso) para)\s+(.{3,60}?)\??$/);
  return m ? `para ${String(q).trim().replace(/\?+$/, '').split(/\s+/).slice(-m[3].split(/\s+/).length).join(' ')}` : '';
}
// Junta as frases citando o documento e a página de cada uma (só usa o que está nos ficheiros)
function cited(sents, q, first = true) {
  const groups = [];
  for (const s of sents) {
    const g = groups[groups.length - 1];
    if (g && g.u.docId === s.u.docId && g.u.page === s.u.page) g.list.push(s); else groups.push({ u: s.u, list: [s] });
  }
  const purpose = first ? purposeOf(q) : '';
  return groups.map((g, gi) => {
    const where = g.u.page ? `${pageWord(g.u)} ${g.u.page}` : '';
    const head = gi === 0
      ? `Com base ${g.u.doc ? `n${g.u.doc}` : 'nos teus ficheiros'}${where ? `, ${where}` : ''}, ${purpose ? `${purpose}, ` : ''}`
      : (g.u.docId === groups[0].u.docId ? `Na ${where} do mesmo documento, ` : `Segundo ${g.u.doc}${where ? `, ${where}` : ''}, `);
    const steps = g.list.filter((x) => x.step).length >= 3;
    if (steps) return `${head.replace(/, $/, ':')}\n\n${g.list.map((x, k) => `${k + 1}. ${esc(x.text)}`).join('\n')}`;
    const [a, ...rest] = g.list;
    return `${head}${esc(lowerFirst(a.text))}${rest.length ? ` ${rest.map((x) => esc(x.text)).join(' ')}` : ''}`;
  }).join('\n\n');
}
const esc = (t) => plain(t).replace(/\\\./g, '.');

async function followupsFor(title, hits = []) {
  const seen = new Set([norm(title)]);
  const related = hits.map((h) => h.u.title).filter((t) => { const k = norm(t); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 2);
  return [`Saber mais sobre: ${title}`, ...related.map((t) => `Fala-me de: ${t}`)].slice(0, 3);
}

// Passagens usadas na última resposta (guardadas nas referências) e as do mesmo documento
async function lastUsed(history) {
  const last = [...(history || [])].reverse().find((m) => m.role === 'assistant' && m.refs && m.refs.length);
  if (!last) return null;
  const idx = await getIndex();
  const ref = last.refs[0];
  const keys = new Set(ref.keys || []);
  const sameDoc = idx.units.filter((u) => (ref.docId ? u.docId === ref.docId : u.ref === ref.label));
  const used = sameDoc.filter((u) => keys.has(u.key));
  return { ref, sameDoc, used: used.length ? used : idx.units.filter((u) => u.ref === ref.label).slice(0, 1) };
}


// ---------- Resumos do Guia (src/data/mrsteel/resumos.json) ----------
// Pergunta por um tema ou palavra-chave ("abrigo", "fala-me de hipotermia") -> resumo em prosa escrito a partir do Guia,
// com as páginas calculadas a partir do PDF importado na aba Conhecimento.
const flat = (t) => ` ${norm(t).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const lowerLead = (t) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ú\s]/.test(t) && !/^[A-Z]\s[A-Z]/.test(t) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
const TOPIC_PREFIX = /^(fala[- ]?me (de|do|da|dos|das|sobre)|diz[- ]?me (algo )?sobre|conta[- ]?me sobre|o que (e|sao) (o |a |os |as )?|resumo (de|do|da|dos|das|sobre)|resume[- ]?me|explica[- ]?me|explica|informacao sobre|info sobre|sobre)\s+/;
export function summaryEntry(q) {
  const nq = flat(q);
  let best = null;
  const groups = [[RESUMOS?.palavras || [], 25], [RESUMOS?.capitulos || [], 0]]; // palavra-chave específica ganha ao capítulo
  for (const [arr, bonus] of groups) {
    for (const e of arr) {
      if ((e.exatas || []).some((k) => flat(k) === nq)) return e; // "nós" sozinho
      for (const k of e.chaves || []) {
        const fk = flat(k);
        if (fk.trim() && nq.includes(fk)) {
          const sc = fk.trim().split(' ').length * 10 + fk.length + bonus;
          if (!best || sc > best.sc) best = { e, sc };
        }
      }
    }
  }
  return best?.e || null;
}
async function summaryAnswer(qIn) {
  const raw = norm(qIn).replace(/[?!.]+/g, ' ').trim();
  const words = raw.replace(TOPIC_PREFIX, '').split(/\s+/).filter(Boolean).length;
  if (!TOPIC_PREFIX.test(raw) && words > 9) return null; // pergunta longa e específica: resposta extraída das páginas
  const e = summaryEntry(qIn);
  if (!e) return null;
  const idx = await getIndex();
  const cap = flat(e.capitulo).trim();
  const chapter = idx.units.filter((u) => u.source === 'kb' && /guia/i.test(u.doc || '') && flat(u.title).includes(cap));
  if (!chapter.length) return null; // Guia desativado/ausente: usa a pesquisa normal
  const terms = (e.procura || []).map((t) => norm(t));
  const hit = terms.length ? chapter.filter((u) => terms.some((t) => norm(u.text).includes(t))) : [];
  const units = hit.length ? hit : chapter;
  const pages = [...new Set(units.map((u) => u.page))].sort((a, b) => a - b);
  const where = pages.length > 1 ? `páginas ${pages[0]}–${pages[pages.length - 1]}` : `página ${pages[0]}`;
  const u0 = units[0];
  const related = (RESUMOS?.palavras || []).filter((x) => x.capitulo === e.capitulo && x !== e).map((x) => `Fala-me de: ${x.tema}`);
  const followups = [`Saber mais sobre: ${chapter[0].title}`, ...related.sort(() => Math.random() - 0.5)].slice(0, 3);
  return {
    text: `${opener()} Com base n${u0.doc}, ${where}, ${lowerLead(e.texto)}\n\n${question()}`,
    refs: [refOfUnit(u0, units.slice(0, 8))],
    followups,
    found: true,
  };
}

const VAGUE = /\b(isso|isto|aquilo|o outro|a outra|aquele|aquela|tal|coisa|cena|aquilo la|la do)\b/;

export async function answerLocally(qIn, { reason = 'offline', history = [] } = {}) {
  let qtext = qIn;
  const offline = reason === 'offline';
  const intent = intentOf(qtext);

  // 1. Conversa: saudações, quem sou, agradecimentos (Fórmula C)
  if (intent === 'greet' || intent === 'who' || intent === 'thanks') {
    const t = await topics(3);
    const text = intent === 'greet' ? `${greeting(offline)} Em que te posso ser útil?`
      : intent === 'who' ? `${identity()}\n\n${starter()}`
        : thanks();
    return { text, refs: [], followups: intent === 'greet' ? [] : t.map((x) => `Fala-me de: ${x}`), found: true }; // na saudação, espera pelo utilizador
  }

  // 2. Continuação / resumo do tema anterior
  if (intent === 'continue' || intent === 'summary') {
    const ctx = await lastUsed(history);
    if (ctx && ctx.used.length) {
      const { used, sameDoc } = ctx; const main = used[0];
      if (intent === 'summary') {
        const pts = keySentences(used, '', 5);
        if (pts.length) return { text: `Em resumo, segundo ${main.doc || 'os teus ficheiros'}${main.page ? ` (${pageWord(main)} ${main.page})` : ''}:\n\n${pts.map((p) => `- ${esc(p.text)}`).join('\n')}\n\n${question()}`, refs: [refOfUnit(main, used)], followups: await followupsFor(main.title), found: true };
      } else {
        const lastPos = Math.max(...used.map((u) => sameDoc.indexOf(u)));
        const after = sameDoc.slice(lastPos + 1);
        const sameTopic = after.filter((u) => u.title === main.title);
        const next = (sameTopic.length ? sameTopic : after).slice(0, 2);
        const sents = keySentences(next, '', 4);
        if (next.length && sents.length) {
          return { text: `${cited(sents, '', false)}\n\n${question()}`, refs: [refOfUnit(next[0], next)], followups: ['Continua', 'Resume isso', `Saber mais sobre: ${next[0].title}`], found: true };
        }
        return { text: `Já cobrimos o essencial de **${main.title}**. Queres passar a outro tema ou ver o capítulo completo no Manual?`, refs: [refOfUnit(main, used)], followups: await followupsFor(main.title), found: true };
      }
    }
    const prevQ = [...(history || [])].reverse().find((m) => m.role === 'user' && !intentOf(m.text) && !/^\(Contexto/.test(m.text));
    if (!prevQ) return { text: rephrase(), refs: [], followups: [], found: false };
    qtext = prevQ.text;
  }

  // 2a. Piadas (piadas.json)
  if (isJoke(qtext)) return { text: joke(), refs: [], followups: ['Conta outra piada'], found: true };

  // 2b. Conversa de café ("estou cansado", "que frio", "conta uma piada"): mensagens curtas respondem logo
  const chat = smallTalk(qtext);
  const nWords = norm(qtext).split(/\s+/).filter(Boolean).length;
  // ...a não ser que seja uma pergunta técnica com resposta nos ficheiros ("o que comer numa emergência")
  const technical = /\b(como|o que|qual|quais|quanto|quantos|onde|porque|emergencia|sobreviv\w*|guia|manual)\b/.test(norm(qtext));
  // conversa (desabafo, opinião, boa notícia, pergunta ao Mr. Steel): responde como amigo, sem ir aos manuais
  if (isConversation(qtext) && !technical) return { text: offlineChatReply(qtext), refs: [], followups: [], found: true };
  if (chat && nWords <= 6 && !technical) return { text: chat.text, refs: [], followups: [], found: true };

  // 3. "Saber mais sobre: X" -> os pontos-chave do tema (organizados, nunca o texto cru)
  const more = String(qtext).match(/^saber mais sobre:?\s*(.+)$/i);
  if (more) {
    const idx = await getIndex();
    const parts = idx.units.filter((u) => u.title === more[1].trim());
    if (parts.length) {
      const u0 = parts[0];
      const blocks = formulaSentences(parts.slice(0, 14), more[1]);
      if (blocks.flat().length >= 4) {
        const used = [...new Set(blocks.flat().map((c) => c.u))];
        const pg = [...new Set(blocks.flat().map((c) => c.u.page).filter(Boolean))].sort((a, b) => a - b);
        const paras = blocks.map((b) => b.map((c) => esc(c.text)).join(' '));
        paras[0] = `Com base ${u0.doc ? `n${u0.doc}` : 'nos teus ficheiros'}${pg.length > 1 ? `, ${u0.unit === 'pág.' ? 'páginas' : 'secções'} ${pg[0]}–${pg[pg.length - 1]}` : pg.length ? `, ${pageWord(u0)} ${pg[0]}` : ''}, sobre **${u0.title}**: ${lowerFirst(paras[0])}`;
        return { text: `${paras.join('\n\n')}\n\n${question()}`, refs: [refOfUnit(used[0], used)], followups: ['Continua', 'Resume isso'], found: true };
      }
      const pts = keySentences(parts.slice(0, 6), '', 8);
      return { text: `Segundo ${u0.doc || 'os teus ficheiros'}${u0.page ? `, a partir da ${pageWord(u0)} ${u0.page}` : ''}, estes são os pontos-chave de **${u0.title}**:\n\n${pts.map((p) => `- ${esc(p.text)}`).join('\n')}\n\n_Para ler o texto completo, toca na referência e abre o documento no Manual._\n\n${question()}`, refs: [refOfUnit(u0, parts.slice(0, 6))], followups: ['Continua', 'Resume isso'], found: true };
    }
  }

  // 3b. Tema ou palavra-chave do Guia -> resumo em prosa (resumos.json)
  const sum = await summaryAnswer(String(qtext).replace(/^fala-me de:?\s*/i, ''));
  if (sum) return sum;

  // 4. Pesquisa e composição em prosa (Fórmula A)
  const q = String(qtext).replace(/^fala-me de:?\s*/i, '');
  const { hits, coverage, terms } = await search(q, 20, { only: 'kb' }); // só a informação dos PDFs/documentos
  const best = hits[0];
  const enough = best && best.score >= 1.4 && coverage >= 0.25;
  const words = norm(q).split(/\s+/).filter(Boolean).length;
  // pedido vago ("e o outro lá do texto tal") -> pedir para reformular antes de arriscar uma resposta ao lado
  if (VAGUE.test(norm(q)) && words <= 7 && (!best || best.score < 3 || coverage < 0.6)) return { text: rephrase(), refs: [], followups: [], found: false };
  if (!enough) {
    // pedido vago ou confuso -> pedir para reformular (Fórmula D); claro mas sem dados -> transparência (Fórmula B offline)
    if (chat) return { text: chat.text, refs: [], followups: [], found: true }; // era conversa, não pergunta técnica
    if (!terms || (VAGUE.test(norm(q)) && words <= 7)) return { text: rephrase(), refs: [], followups: [], found: false };
    const t = await topics(3);
    return { text: missing(t, reason), refs: [], followups: t.map((x) => `Fala-me de: ${x}`), found: false };
  }
  // Fórmula de resumo (10–15 linhas) para qualquer documento da Base de Conhecimento
  const fa = await formulaAnswer(q, hits).catch(() => null);
  if (fa) return fa;
  const main = best.u;
  // várias passagens do mesmo tema, para escolher as frases que respondem mesmo à pergunta
  const mainUnits = [main, ...hits.slice(1).filter((h) => h.u.title === main.title && h.score > best.score * 0.45).map((h) => h.u)].slice(0, 4);
  // frases que falam mesmo da pergunta: primeiro no tema principal, depois nas outras passagens encontradas
  let sents = keySentences(mainUnits, q, 3, true);
  // a melhor frase pode estar noutra passagem: compara com as frases das outras passagens encontradas
  const pool = keySentences(hits.slice(0, 20).map((h) => h.u), q, 3, true);
  const top = (arr) => Math.max(0, ...arr.map((x) => x.score));
  if (!sents.length || top(pool) > top(sents) * 1.5) sents = pool.length ? pool : sents;
  if (!sents.length) sents = keySentences(mainUnits, q, 3);
  if (!sents.length) { // só tabelas/listas sem frases: mostra os pontos limpos
    const t = await topics(3);
    return { text: missing(t, reason), refs: [], followups: t.map((x) => `Fala-me de: ${x}`), found: false };
  }
  let text = `${opener(/guia/i.test(sents[0]?.u?.doc || ''))} ${cited(sents, q)}`;
  const other = hits.slice(1).find((h) => h.u.title !== main.title && h.score > best.score * 0.5);
  // as referências são as passagens de onde saíram as frases citadas
  const usedUnits = [...new Set(sents.map((x) => x.u))];
  const refs = [refOfUnit(usedUnits[0] || main, usedUnits.length ? usedUnits : mainUnits)];
  if (other) {
    const extra = keySentences([other.u], q, 1, true); // a segunda fonte só entra se falar mesmo do tema
    if (extra.length && !sents.some((x) => x.text === extra[0].text)) { text += `\n\n${cited(extra, '', false).replace(/^Segundo /, 'Também segundo ')}`; refs.push(refOfUnit(other.u, [other.u])); }
  }
  text += `\n\n${question()}`;
  return { text, refs, followups: await followupsFor(main.title, hits), found: true };
}
