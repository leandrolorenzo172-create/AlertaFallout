// Recolhe notícias de feeds RSS por país e grava public/data/news-<PAÍS>.json (+ news.json = Portugal, compatível)
// e public/data/news-index.json (países disponíveis e idioma). A app escolhe o ficheiro do país detetado.
// Corre no GitHub Actions antes de compilar a app (o browser não pode ler estes feeds diretamente).
// Perfis: PT (jornais portugueses, palavras-chave em português), GB e US (jornais ingleses/americanos, em inglês).
// Os índices (guerra, economia, greves, ciber) são calculados da mesma forma em todos os perfis.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { isValidStrikeNotice as ptStrikeValid, strikeSector as ptStrikeSector } from '../src/lib/strikeFilter.js';
import { isValidStrikeNotice as enStrikeValid, strikeSector as enStrikeSector, strikeDaysEn, CANCEL_EN } from '../src/lib/strikeFilterEn.js';
import { CYBER_SOURCES, classifyCyber, isSecurityNews, computeCyberRisk } from '../src/lib/cyberRisk.js';

const FEEDS_PT = [
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
const FEEDS_GB = [
  { source: 'BBC News', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { source: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml' },
  { source: 'BBC News', url: 'https://feeds.bbci.co.uk/news/uk/rss.xml', topic: 'pais' },
  { source: 'The Guardian', url: 'https://www.theguardian.com/uk-news/rss', topic: 'pais' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/uk.xml', topic: 'pais' },
  { source: 'BBC News', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', topic: 'economia' },
  { source: 'The Guardian', url: 'https://www.theguardian.com/uk/business/rss', topic: 'economia' },
  { source: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/business.xml', topic: 'economia' },
];
const FEEDS_US = [
  { source: 'NPR', url: 'https://feeds.npr.org/1004/rss.xml' },
  { source: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/world' },
  { source: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml' },
  { source: 'NPR', url: 'https://feeds.npr.org/1003/rss.xml', topic: 'pais' },
  { source: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/us', topic: 'pais' },
  { source: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/US.xml', topic: 'pais' },
  { source: 'NPR', url: 'https://feeds.npr.org/1006/rss.xml', topic: 'economia' },
  { source: 'CBS News', url: 'https://www.cbsnews.com/latest/rss/moneywatch', topic: 'economia' },
  { source: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', topic: 'economia' },
];
// Endereço da app publicada: o script lê o ficheiro anterior de cada país para acumular a contagem anual de greves
// e o histórico do índice económico entre execuções (o GitHub Actions não guarda ficheiros de uma vez para a outra).
const PUBLISHED_BASE = (process.env.PUBLISHED_NEWS_URL || 'https://steeldeck.github.io/SteelDeck/data/news.json').replace(/[^/]+$/, '');

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

// ---------- Palavras-chave em inglês (perfis GB e US) ----------
const WAR_EN = /\b(war|attacks?|missiles?|bomb\w*|troops|army|invasion|invade\w*|offensive|drones?|armed conflict|fighting|rebels|ceasefire|front ?line|artillery|hostages|hamas|hezbollah|houthis?|gaza|kyiv|kiev|kremlin|ukrain\w*|air ?strikes?)\b/;
const PREP_EN = /\b(nato|rearm\w*|weapons|military exercises?|defen[cs]e (budget|spending)|air defen[cs]e|sanctions|mobili[sz]ation|nuclear|missile test|armed forces|conscription|military service|fighter jets?|aircraft carriers?)\b/;
const ECON_EN = /\b(inflation|recession|economic crisis|financial crisis|stock markets?|stocks|tariffs?|national debt|public debt|bankruptc\w+|unemployment|interest rates?|bank of england|federal reserve|ecb|oil prices?|share prices?)\b/;
const ECON_NEG_EN = /\b(crisis|recession|inflation (rises|jumps|soars|accelerates)|prices? (rise|soar|surge)|bankruptc\w+|insolvenc\w+|layoffs?|job cuts|redundanc\w+|unemployment (rises|jumps)|(stocks?|shares|markets?) (fall|tumble|plunge|slump|sink)|sell-?off|tariffs?|trade war|debt (rises|soars)|bailout|default|slowdown|stagnation|contraction|losses|cuts?)\b/;
const ECON_WIDE_EN = /\b(econom\w+|business(es)?|compan(y|ies)|prices?|wages?|salar\w+|budget|tax(es)?|vat|gdp|stocks?|shares|banks?|banking|markets?|invest\w+|exports?|inflation|interest|mortgages?|credit|housing|rents?|fuel|petrol|gasoline|energy|electricity|profits?|revenue|spending|debt|deficit|jobs|employment|unemployment|tariffs?|currency|dollar|pound|sterling|euro|crypto\w*|bitcoin|nasdaq|wall street|dow jones|s&p|ftse|bonds?|commodit\w+|gold|oil|brent)\b/;
const CYBER_EN = /\b(cyber ?attacks?|cyber ?security|hackers?|hacked|ransomware|data breach|outage|malware|it failure)\b/;
// as regiões ficam com os nomes em português (a app traduz)
const REGIONS_EN = [
  [/ukrain|russia|kyiv|kiev|moscow|kremlin|belarus/, 'Europa de Leste'],
  [/gaza|israel|hamas|hezbollah|lebanon|syria|iran|yemen|houthi|iraq|west bank/, 'Médio Oriente'],
  [/sudan|congo|sahel|mali|somalia|ethiopia|nigeria|mozambique|burkina/, 'África'],
  [/taiwan|china|korea|japan|india|pakistan|myanmar|philippines/, 'Ásia-Pacífico'],
  [/venezuela|colombia|mexico|haiti|united states|washington|pentagon/, 'Américas'],
  [/nato|european union|brussels|poland|germany|france|united kingdom|britain/, 'Europa'],
];
function severityEn(text) {
  let s = 4;
  if (/nuclear/.test(text)) s += 3;
  if (/killed|dead|deaths|casualties|massacre|bombing|bombed|civilians/.test(text)) s += 2;
  if (/attack|missile|offensive|invasion|drone/.test(text)) s += 1;
  if (/ceasefire|peace talks|truce|negotiat/.test(text)) s -= 1;
  return Math.min(10, Math.max(1, s));
}

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

const CANCEL_PT = /\b(suspens\w*|suspend\w*|desconvoc\w*|cancelad\w*|cancela\w*|adiad\w*|adia|sem efeito|levantad\w*|desmarcad\w*)\b/;
async function buildProfile(P, cyber) {
  const all = [];
  for (const feed of P.feeds) {
    try { const items = await readFeed(feed); all.push(...items); console.log(`[${P.code}] ${feed.source}: ${items.length} itens`); }
    catch (e) { console.log(`[${P.code}] ${feed.source}: falhou (${e.message})`); }
  }
  let previous = null;
  try { const r = await fetch(PUBLISHED_BASE + P.published, { signal: AbortSignal.timeout(15000) }); if (r.ok) previous = await r.json(); } catch { /* primeira vez ou site em baixo */ }
  if (!all.length) {
    console.log(`[${P.code}] nenhum feed respondeu; mantém-se o ficheiro publicado anterior.`);
    return previous ? { ...previous, cyber, country: P.code, lang: P.lang } : null;
  }

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
      const isWar = P.re.war.test(text); const isPrep = P.re.prep.test(text);
      if (isWar) counts.war++; else if (isPrep) counts.prep++;
      if (P.re.econ.test(text)) counts.econ++;
      if (P.re.cyber.test(text)) counts.cyber++;
      if (isWar || isPrep) {
        war.push({
          title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date,
          severity: P.severity(text),
          region: (P.regions.find(([re]) => re.test(text)) || [null, 'Global'])[1],
          category: isWar ? 'guerra' : 'preparacao_guerra',
        });
      }
    }
    if ((econFeed && P.re.econWide.test(text)) || P.re.econ.test(text)) {
      const neg = P.re.econNeg.test(text);
      if (neg) econNeg++;
      econArticles.push({ title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date, negative: neg });
    }
    // só avisos de greve reais: o título tem de falar de greve e não pode ser desporto, direto sobre outro tema, opinião...
    if (P.strike.valid(a)) {
      strikesNow.push({ title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date, sector: P.strike.sector(a.title.replace(/^\s*\d{1,2}h\S*\s*/, ''), a.summary) });
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
  const prevStrikes = previous?.strikes?.year === year ? previous.strikes : null;
  const strikeKey = (t) => norm(t).replace(/[^a-z0-9 ]/g, '').split(' ').filter((w) => w.length > 3).slice(0, 7).join(' ');
  const items = new Map((prevStrikes?.items || []).map((x) => [strikeKey(x.title), x]));
  // greves recolhidas antes da mudança de endereço do site (o ficheiro publicado antigo deixou de existir)
  let seedSince = null;
  try {
    if (!P.seed) throw new Error('sem semente');
    const seed = JSON.parse(readFileSync(P.seed, 'utf8'));
    if (seed.year === year) { seedSince = seed.since; for (const x of seed.items) if (!items.has(strikeKey(x.title))) items.set(strikeKey(x.title), x); }
  } catch { /* sem ficheiro */ }
  for (const x of strikesNow) if (new Date(x.date).getFullYear() === year && !items.has(strikeKey(x.title))) items.set(strikeKey(x.title), x);
  // o filtro corre também sobre as greves acumuladas antes (limpa falsos positivos antigos) e recalcula o setor
  const strikeItems = [...items.values()].filter(P.strike.valid)
    .map((x) => ({ ...x, sector: P.strike.sector(x.title.replace(/^\s*\d{1,2}h\S*\s*/, ''), x.summary) }))
    .sort((x, y) => y.date - x.date);
  // greves desconvocadas/suspensas/adiadas não geram aviso (e anulam as do mesmo setor nesses dias)
  for (const x of strikeItems) { const t = norm(`${x.title} ${x.summary || ''}`); x.days = P.strike.days(t, x.date); x.cancelled = P.strike.cancel.test(norm(x.title)); }
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
  console.log(`[${P.code}] ${counts.total} notícias do mundo, ${war.length} sobre conflitos; economia ${econTotal} (${econNeg} negativas, índice ${econLevel}); greves no ano ${strikes.count} (${strikesNow.length} recentes, ${strikes.upcoming.length} com dia marcado)`);
  return { generated: new Date().toISOString(), country: P.code, lang: P.lang, counts, war: war.slice(0, 30), economy, strikes, cyber };
}

// ---------- Perfis por país ----------
const PT_RE = { war: WAR, prep: PREP, econ: ECON, econNeg: ECON_NEG, econWide: ECON_WIDE, cyber: CYBER };
const EN_RE = { war: WAR_EN, prep: PREP_EN, econ: ECON_EN, econNeg: ECON_NEG_EN, econWide: ECON_WIDE_EN, cyber: CYBER_EN };
const EN_STRIKE = { valid: enStrikeValid, sector: enStrikeSector, days: strikeDaysEn, cancel: CANCEL_EN };
const PROFILES = [
  { code: 'PT', lang: 'pt', feeds: FEEDS_PT, re: PT_RE, severity, regions: REGIONS, files: ['news.json', 'news-PT.json'], published: 'news.json', seed: 'scripts/strikes-seed.json',
    strike: { valid: ptStrikeValid, sector: ptStrikeSector, days: strikeDays, cancel: CANCEL_PT } },
  { code: 'GB', lang: 'en', feeds: FEEDS_GB, re: EN_RE, severity: severityEn, regions: REGIONS_EN, files: ['news-GB.json'], published: 'news-GB.json', seed: null, strike: EN_STRIKE },
  { code: 'US', lang: 'en', feeds: FEEDS_US, re: EN_RE, severity: severityEn, regions: REGIONS_EN, files: ['news-US.json'], published: 'news-US.json', seed: null, strike: EN_STRIKE },
];

// ---------- Ciberataques (fontes internacionais, iguais para todos os países) ----------
async function buildCyber() {
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
  return cyber;
}

const cyber = await buildCyber();
mkdirSync('public/data', { recursive: true });
const index = { generated: new Date().toISOString(), countries: {} };
for (const P of PROFILES) {
  const out = await buildProfile(P, cyber);
  if (!out) { console.log(`[${P.code}] sem dados (nem ficheiro anterior): não foi gerado.`); continue; }
  for (const f of P.files) writeFileSync(`public/data/${f}`, JSON.stringify(out));
  index.countries[P.code] = { lang: P.lang, file: P.files[P.files.length - 1], generated: out.generated };
}
// Portugal: se o perfil falhar de vez, o news.json do repositório continua a servir
if (!index.countries.PT) index.countries.PT = { lang: 'pt', file: 'news.json', generated: null };
writeFileSync('public/data/news-index.json', JSON.stringify(index));
console.log(`news-index.json: ${Object.keys(index.countries).join(', ')}`);
