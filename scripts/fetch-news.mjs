// Recolhe notícias de feeds RSS de jornais portugueses e grava public/data/news.json.
// Corre no GitHub Actions antes de compilar a app (o browser não pode ler estes feeds diretamente).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { isValidStrikeNotice, strikeSector } from '../src/lib/strikeFilter.js';
import { CYBER_SOURCES, classifyCyber, isSecurityNews, computeCyberRisk } from '../src/lib/cyberRisk.js';

const FEEDS = [
  { source: 'RTP', url: 'https://www.rtp.pt/noticias/rss/mundo' },
  { source: 'Notícias ao Minuto', url: 'https://www.noticiasaominuto.com/rss/mundo' },
  { source: 'Euronews', url: 'https://pt.euronews.com/rss?level=theme&name=news' },
  { source: 'Observador', url: 'https://observador.pt/feed/' },
  { source: 'CNN Portugal', url: 'https://cnnportugal.iol.pt/rss.xml' },
  { source: 'Público', url: 'https://feeds.feedburner.com/PublicoRSS' },
  // nacional e economia (para os separadores Instabilidade Económica e Greves)
  { source: 'RTP', url: 'https://www.rtp.pt/noticias/rss/pais', topic: 'pais' },
  { source: 'RTP', url: 'https://www.rtp.pt/noticias/rss/economia', topic: 'economia' },
  { source: 'Notícias ao Minuto', url: 'https://www.noticiasaominuto.com/rss/pais', topic: 'pais' },
  { source: 'Notícias ao Minuto', url: 'https://www.noticiasaominuto.com/rss/economia', topic: 'economia' },
  { source: 'ECO', url: 'https://eco.sapo.pt/feed/', topic: 'economia' },
  { source: 'Jornal de Negócios', url: 'https://www.jornaldenegocios.pt/rss', topic: 'economia' },
  // Investing.com Portugal: mercados, ações, matérias-primas, forex e cripto (pt.investing.com/news)
  { source: 'Investing.com', url: 'https://pt.investing.com/rss/news.rss', topic: 'economia' },
  { source: 'Investing.com', url: 'https://pt.investing.com/rss/news_25.rss', topic: 'economia' },  // mercado de ações
  { source: 'Investing.com', url: 'https://pt.investing.com/rss/news_301.rss', topic: 'economia' }, // criptomoedas
];
// Endereço da app publicada: o script lê o news.json anterior para acumular a contagem anual de greves
// e o histórico do índice económico entre execuções (o GitHub Actions não guarda ficheiros de uma vez para a outra).
const PUBLISHED = process.env.PUBLISHED_NEWS_URL || 'https://steeldeck.github.io/SteelDeck/data/news.json';

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const WAR = /\b(guerra|ataques?|misse?is|missil|bombarde\w*|tropas|exercito|invas\w+|ofensiva|drones?|conflito armado|combates?|rebeldes|cessar-fogo|frente de batalha|artilharia|refens|hamas|hezbollah|houthis?|gaza|kiev|kremlin|ucrania|ucranian\w+|faixa de gaza)\b/;
const PREP = /\b(nato|otan|rearm\w+|armamento|exercicios militares|orcamento da defesa|defesa antiaerea|sancoes|mobilizacao|nuclear|teste de missil|forcas armadas|servico militar|caças|porta-avioes)\b/;
const ECON = /\b(inflacao|recessao|crise economica|crise financeira|bolsas?|tarifas|divida publica|falencia|desemprego|taxas de juro|bce|petroleo|cotacao)\b/;
// economia: notícias que apontam para instabilidade (o índice mede a parte das notícias económicas que são más)
const ECON_NEG = /\b(crise|recessao|inflacao (sobe|dispara|acelera|aumenta)|subida (dos precos|da inflacao)|falencias?|insolvenc\w+|despedimentos?|layoff|desemprego (sobe|aumenta)|quedas? (das bolsas|nas bolsas)|bolsas? (afundam?|caem|em queda)|tarifas|guerra comercial|divida (sobe|aumenta)|resgate|incumprimento|abrandamento|estagnacao|contracao|perdas?|prejuizos?|cortes?)\b/;
// greves: notícias sobre greves e paralisações (exclui "greve de fome")
// notícias de economia (para a lista do separador): têm de falar de economia, não basta virem do feed
const ECON_WIDE = /\b(economi\w+|empresas?|precos?|salari\w+|orcamento|oe20\d\d|impostos?|irs|iva|pib|bolsas?|bancos?|banca|mercados?|investi\w+|exportac\w+|inflacao|juros|euribor|credito|habitacao|rendas?|combustive\w+|gasolina|gasoleo|energia|eletricidade|lucros?|receitas|despesa|divida|defice|emprego|desemprego|tarifas|accoes|acoes|cotac\w+|fiscal|ouro|prata|petroleo|brent|gas natural|forex|cambio|dolar|cripto\w*|bitcoin|ethereum|nasdaq|wall street|dow jones|s&p|euro stoxx|psi|futuros|materias-primas|obrigac\w+|etfs?|fundos?)\b/;
// greves: o validador e os setores estão em src/lib/strikeFilter.js (partilhado com a app)
// ---------- Data da greve (o dia em que acontece, tirado do título/resumo) ----------
// Reconhece: "12 de dezembro", "11 e 12 de dezembro", "de 3 a 5 de dezembro", "12/12", "amanhã", "hoje",
// "esta/próxima sexta-feira", "no sábado". Datas relativas contam a partir da data da notícia.
// Devolve os dias da greve em 'AAAA-MM-DD' (no máximo 7), ou [] se a notícia não diz o dia.
const MESES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function strikeDays(text, pubTime) {
  const pub = new Date(pubTime); pub.setHours(12, 0, 0, 0);
  const at = (m, d) => { // dia/mês -> data, no ano que fica mais perto da notícia (dezembro -> janeiro passa o ano)
    const x = new Date(pub.getFullYear(), m, d, 12);
    if (x - pub > 200 * 86400000) x.setFullYear(x.getFullYear() - 1);
    if (pub - x > 160 * 86400000) x.setFullYear(x.getFullYear() + 1);
    return x;
  };
  const plus = (n) => new Date(pub.getTime() + n * 86400000);
  let days = [];
  const mes = MESES.join('|');
  // intervalo: "de 3 a 5 de dezembro", "entre 3 e 5 de dezembro"
  let m = text.match(new RegExp(`\\b(?:de|entre) (\\d{1,2}) (?:a|e) (\\d{1,2}) de (${mes})\\b`));
  if (m) { const a = +m[1], b = +m[2], mo = MESES.indexOf(m[3]); if (b >= a && b - a < 7) for (let d = a; d <= b; d++) days.push(at(mo, d)); }
  // lista ou dia simples: "11 e 12 de dezembro", "dia 12 de dezembro"
  if (!days.length && (m = text.match(new RegExp(`\\b((?:\\d{1,2}(?:, | e ))*\\d{1,2}) de (${mes})\\b`)))) {
    const mo = MESES.indexOf(m[2]); days = m[1].split(/, | e /).map(Number).filter((d) => d >= 1 && d <= 31).slice(0, 7).map((d) => at(mo, d));
  }
  if (!days.length && (m = text.match(/\b(\d{1,2})\/(\d{1,2})\b/)) && +m[2] >= 1 && +m[2] <= 12) days = [at(+m[2] - 1, +m[1])];
  if (!days.length && /\bamanha\b/.test(text)) days = [plus(1)];
  if (!days.length && (m = text.match(/\b(?:esta|nesta|proxima|na proxima|neste|no|na|de|desta) (segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/))) {
    const w = DIAS_SEMANA.indexOf(m[1]); let n = (w - pub.getDay() + 7) % 7; if (/proxim/.test(m[0]) && n === 0) n = 7; days = [plus(n)];
  }
  if (!days.length && /\b(hoje|esta manha|em curso|arranca|arrancou|comecou)\b/.test(text)) days = [pub];
  // só datas plausíveis: de 2 dias antes da notícia até 90 dias depois
  return [...new Set(days.filter((d) => d - pub > -2 * 86400000 && d - pub < 90 * 86400000).map(ymd))].sort();
}

const CYBER = /\b(ciberataque\w*|ciberseguranca|hackers?|pirat\w+ informatic\w+|ransomware|apagao|falha informatica|fuga de dados|malware)\b/;
const REGIONS = [
  [/ucrania|russia|kiev|moscovo|kremlin|bielorrussia/, 'Europa de Leste'],
  [/gaza|israel|hamas|hezbollah|libano|siria|irao|iemen|houthi|iraque|cisjordania/, 'Médio Oriente'],
  [/sudao|congo|sahel|mali|somalia|etiopia|nigeria|mocambique|burkina/, 'África'],
  [/taiwan|china|coreia|japao|india|paquistao|myanmar|filipinas/, 'Ásia-Pacífico'],
  [/venezuela|colombia|mexico|haiti|eua|estados unidos|washington|pentagono/, 'Américas'],
  [/nato|otan|uniao europeia|bruxelas|polonia|alemanha|franca|reino unido/, 'Europa'],
];

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;|&#0?39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_m, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/<\/?[a-z][^>]*>/gi, ' ') // HTML que vinha codificado (&lt;p&gt;) só aparece depois de descodificar
  .replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };

// RFC 822 ("Wed, 26 Nov 2026 19:45:00 GMT") ou "2026-11-26 19:45:00" (Investing.com, em UTC)
const TZ = { CET: '+0100', CEST: '+0200', WET: '+0000', WEST: '+0100', EET: '+0200', EEST: '+0300', BST: '+0100' }; // abreviaturas que o Date.parse não conhece (CERT-EU usa CET)
const parseDate = (v) => (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(v) ? Date.parse(`${v.replace(' ', 'T')}Z`) : Date.parse(String(v).replace(/\b(CEST|CET|WEST|WET|EEST|EET|BST)\b/, (z) => TZ[z]))) || Date.now();

async function readFeed({ source, url, topic }) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; rss-reader)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  // alguns jornais ainda usam ISO-8859-1: lê os bytes e descodifica com a codificação certa
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder('latin1').decode(buf.slice(0, 300));
  const cs = ((res.headers.get('content-type') || '').match(/charset=([\w-]+)/i) || head.match(/encoding=["']([\w-]+)["']/i) || [null, 'utf-8'])[1].toLowerCase();
  const xml = new TextDecoder(/8859|latin/.test(cs) ? 'latin1' : 'utf-8').decode(buf);
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.map((it) => {
    const linkTag = tag(it, 'link');
    return { source, topic: topic || 'mundo', title: tag(it, 'title'), summary: tag(it, 'description').slice(0, 240), url: /^https?:\/\//.test(linkTag) ? linkTag : '', date: parseDate(tag(it, 'pubDate')) };
  }).filter((a) => a.title);
}

function severity(text) {
  let s = 4;
  if (/nuclear/.test(text)) s += 3;
  if (/mortos|mortes|vitimas|massacre|bombarde|civis/.test(text)) s += 2;
  if (/ataque|missil|misseis|ofensiva|invas|drone/.test(text)) s += 1;
  if (/cessar-fogo|negociac|acordo de paz|tregua/.test(text)) s -= 1;
  return Math.min(10, Math.max(1, s));
}

const all = [];
for (const feed of FEEDS) {
  try { const items = await readFeed(feed); all.push(...items); console.log(`${feed.source}: ${items.length} itens`); }
  catch (e) { console.log(`${feed.source}: falhou (${e.message})`); }
}
if (!all.length) { console.log('Nenhum feed respondeu; news.json não foi gerado.'); process.exit(0); }

const cutoff = Date.now() - 3 * 86400000; // só os últimos 3 dias
const seen = new Set();
const recent = all.filter((a) => a.date > cutoff).filter((a) => { const k = norm(a.title).slice(0, 60); if (seen.has(k)) return false; seen.add(k); return true; });
const counts = { total: 0, war: 0, prep: 0, econ: 0, cyber: 0 };
const war = []; const econArticles = []; let econNeg = 0; const strikesNow = [];
for (const a of recent) {
  const text = norm(`${a.title} ${a.summary}`);
  const econFeed = a.topic === 'economia';
  // os contadores antigos (guerra, ciber, economia geral) usam só os feeds originais, para os índices não mudarem de escala
  if (a.topic === 'mundo' || a.topic == null) {
    counts.total++;
    const isWar = WAR.test(text); const isPrep = PREP.test(text);
    if (isWar) counts.war++; else if (isPrep) counts.prep++;
    if (ECON.test(text)) counts.econ++;
    if (CYBER.test(text)) counts.cyber++;
    if (isWar || isPrep) {
      war.push({
        title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date,
        severity: severity(text),
        region: (REGIONS.find(([re]) => re.test(text)) || [null, 'Global'])[1],
        category: isWar ? 'guerra' : 'preparacao_guerra',
      });
    }
  }
  if ((econFeed && ECON_WIDE.test(text)) || ECON.test(text)) {
    const neg = ECON_NEG.test(text);
    if (neg) econNeg++;
    econArticles.push({ title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date, negative: neg });
  }
  // só avisos de greve reais: o título tem de falar de greve e não pode ser desporto, direto sobre outro tema, opinião...
  if (isValidStrikeNotice(a)) {
    strikesNow.push({ title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date, sector: strikeSector(a.title.replace(/^\s*\d{1,2}h\S*\s*/, ''), a.summary) });
  }
}
war.sort((x, y) => y.date - x.date);
econArticles.sort((x, y) => y.date - x.date);

// ---------- Instabilidade económica ----------
// Índice 1-10 = 1 + 18 x (notícias económicas negativas / notícias económicas). Metade negativas = 10.
const econTotal = econArticles.length;
const econLevel = econTotal ? Math.min(10, Math.max(1, Math.round((1 + (econNeg / econTotal) * 18) * 10) / 10)) : 1;

// ---------- Greves no ano corrente (acumuladas entre execuções) ----------
// Índice 1-10 = 1 + 9 x (greves noticiadas no ano / REFERENCIA_ANUAL). Chega a 10 com REFERENCIA_ANUAL greves.
const REFERENCIA_ANUAL = 150;
const year = new Date().getFullYear();
let previous = null;
try { const r = await fetch(PUBLISHED, { signal: AbortSignal.timeout(15000) }); if (r.ok) previous = await r.json(); } catch { /* primeira vez ou site em baixo */ }
const prevStrikes = previous?.strikes?.year === year ? previous.strikes : null;
const strikeKey = (t) => norm(t).replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 3).slice(0, 7).join(' ');
const items = new Map((prevStrikes?.items || []).map((x) => [strikeKey(x.title), x]));
// greves recolhidas antes da mudança de endereço do site (o ficheiro publicado antigo deixou de existir)
let seedSince = null;
try {
  const seed = JSON.parse(readFileSync('scripts/strikes-seed.json', 'utf8'));
  if (seed.year === year) { seedSince = seed.since; for (const x of seed.items) if (!items.has(strikeKey(x.title))) items.set(strikeKey(x.title), x); }
} catch { /* sem ficheiro */ }
for (const x of strikesNow) if (new Date(x.date).getFullYear() === year && !items.has(strikeKey(x.title))) items.set(strikeKey(x.title), x);
// o filtro corre também sobre as greves acumuladas antes (limpa falsos positivos antigos) e recalcula o setor
const strikeItems = [...items.values()].filter(isValidStrikeNotice)
  .map((x) => ({ ...x, sector: strikeSector(x.title.replace(/^\s*\d{1,2}h\S*\s*/, ''), x.summary) }))
  .sort((x, y) => y.date - x.date);
// greves desconvocadas/suspensas/adiadas não geram aviso (e anulam as do mesmo setor nesses dias)
const CANCEL = /\b(suspens\w*|suspend\w*|desconvoc\w*|cancelad\w*|cancela\w*|adiad\w*|adia|sem efeito|levantad\w*|desmarcad\w*)\b/;
for (const x of strikeItems) { const t = norm(`${x.title} ${x.summary || ''}`); x.days = strikeDays(t, x.date); x.cancelled = CANCEL.test(norm(x.title)); }
const monthAgo = Date.now() - 30 * 86400000;
const bySector = {};
for (const x of strikeItems) bySector[x.sector] = (bySector[x.sector] || 0) + 1;
const strikes = {
  year, since: [prevStrikes?.since, seedSince, new Date().toISOString()].filter(Boolean).sort()[0], reference: REFERENCIA_ANUAL,
  count: strikeItems.length, last30: strikeItems.filter((x) => x.date > monthAgo).length,
  level: Math.min(10, Math.round((1 + (strikeItems.length / REFERENCIA_ANUAL) * 9) * 10) / 10),
  bySector, items: strikeItems.slice(0, 400),
  // greves com dia marcado de hoje em diante (a app usa esta lista para avisar com antecedência e no próprio dia)
  upcoming: (() => {
    const hoje = ymd(new Date()); const seenU = new Set(); const out = [];
    const off = new Set(strikeItems.filter((x) => x.cancelled).flatMap((x) => x.days.map((d) => `${x.sector}|${d}`)));
    for (const x of strikeItems.slice().sort((p, q) => q.date - p.date)) {
      if (x.cancelled || !x.days?.length || x.days[x.days.length - 1] < hoje) continue;
      if (x.days.some((d) => off.has(`${x.sector}|${d}`))) continue;
      const k = `${x.sector}|${x.days[0]}`; if (seenU.has(k)) continue; seenU.add(k);
      out.push({ id: k, sector: x.sector, days: x.days, title: x.title, url: x.url, source: x.source });
    }
    return out.sort((p, q) => p.days[0].localeCompare(q.days[0])).slice(0, 30);
  })(),
};

// ---------- Histórico diário do índice económico (últimos 60 dias) ----------
const today = new Date().toISOString().slice(0, 10);
const hist = (previous?.economy?.history || []).filter((h) => h.d !== today);
hist.push({ d: today, v: econLevel });
const economy = { level: econLevel, total: econTotal, negative: econNeg, history: hist.slice(-60), articles: econArticles.slice(0, 40) };

// ---------- Ciberataques: 13 fontes de cibersegurança (internacionais, PT/BR e alertas oficiais) ----------
const cyberStatus = new Map(); const cyberAll = [];
await Promise.all(CYBER_SOURCES.map(async (src) => {
  try {
    const items = (await readFeed({ source: src.name, url: src.url, topic: 'ciber' })).filter((a) => !src.filter || isSecurityNews(`${a.title} ${a.summary}`));
    cyberAll.push(...items.map((a) => ({ ...a, ...classifyCyber({ ...a, official: src.official }), domain: src.domain })));
    const st = cyberStatus.get(src.name) || { name: src.name, domain: src.domain, group: src.group, ok: false, n: 0 };
    cyberStatus.set(src.name, { ...st, ok: true, n: st.n + items.length });
  } catch (e) {
    if (!cyberStatus.get(src.name)?.ok) cyberStatus.set(src.name, { name: src.name, domain: src.domain, group: src.group, ok: false, n: 0, error: e.message });
  }
}));
const seenC = new Set();
const cyberItems = cyberAll.filter((a) => Date.now() - a.date <= 7 * 86400000)
  .sort((p, q) => q.date - p.date)
  .filter((a) => { const k = norm(a.title).slice(0, 70); if (seenC.has(k)) return false; seenC.add(k); return true; })
  .slice(0, 200)
  .map(({ topic, ...a }) => a);
const cyber = { items: cyberItems, sources: [...cyberStatus.values()], risk: computeCyberRisk(cyberItems) };
console.log(`ciber: ${cyberItems.length} ocorrências em 7 dias de ${cyber.sources.filter((x) => x.ok).length}/${cyber.sources.length} fontes; risco ${cyber.risk.score}/100 (${cyber.risk.level})`);

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/news.json', JSON.stringify({ generated: new Date().toISOString(), counts, war: war.slice(0, 30), economy, strikes, cyber }));
console.log(`news.json: ${counts.total} notícias do mundo, ${war.length} sobre conflitos; economia ${econTotal} (${econNeg} negativas, índice ${econLevel}); greves no ano ${strikes.count} (${strikesNow.length} recentes, ${strikes.upcoming.length} com dia marcado)`);
