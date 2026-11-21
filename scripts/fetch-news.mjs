// Recolhe notícias de feeds RSS de jornais portugueses e grava public/data/news.json.
// Corre no GitHub Actions antes de compilar a app (o browser não pode ler estes feeds diretamente).
import { mkdirSync, writeFileSync } from 'node:fs';

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
];
// Endereço da app publicada: o script lê o news.json anterior para acumular a contagem anual de greves
// e o histórico do índice económico entre execuções (o GitHub Actions não guarda ficheiros de uma vez para a outra).
const PUBLISHED = process.env.PUBLISHED_NEWS_URL || 'https://leandrolorenzo172-create.github.io/AlertaFallout/data/news.json';

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const WAR = /\b(guerra|ataques?|misse?is|missil|bombarde\w*|tropas|exercito|invas\w+|ofensiva|drones?|conflito armado|combates?|rebeldes|cessar-fogo|frente de batalha|artilharia|refens|hamas|hezbollah|houthis?|gaza|kiev|kremlin|ucrania|ucranian\w+|faixa de gaza)\b/;
const PREP = /\b(nato|otan|rearm\w+|armamento|exercicios militares|orcamento da defesa|defesa antiaerea|sancoes|mobilizacao|nuclear|teste de missil|forcas armadas|servico militar|caças|porta-avioes)\b/;
const ECON = /\b(inflacao|recessao|crise economica|crise financeira|bolsas?|tarifas|divida publica|falencia|desemprego|taxas de juro|bce|petroleo|cotacao)\b/;
// economia: notícias que apontam para instabilidade (o índice mede a parte das notícias económicas que são más)
const ECON_NEG = /\b(crise|recessao|inflacao (sobe|dispara|acelera|aumenta)|subida (dos precos|da inflacao)|falencias?|insolvenc\w+|despedimentos?|layoff|desemprego (sobe|aumenta)|quedas? (das bolsas|nas bolsas)|bolsas? (afundam?|caem|em queda)|tarifas|guerra comercial|divida (sobe|aumenta)|resgate|incumprimento|abrandamento|estagnacao|contracao|perdas?|prejuizos?|cortes?)\b/;
// greves: notícias sobre greves e paralisações (exclui "greve de fome")
// notícias de economia (para a lista do separador): têm de falar de economia, não basta virem do feed
const ECON_WIDE = /\b(economi\w+|empresas?|precos?|salari\w+|orcamento|oe20\d\d|impostos?|irs|iva|pib|bolsas?|bancos?|banca|mercados?|investi\w+|exportac\w+|inflacao|juros|euribor|credito|habitacao|rendas?|combustive\w+|gasolina|gasoleo|energia|eletricidade|lucros?|receitas|despesa|divida|defice|emprego|desemprego|tarifas|accoes|acoes|cotac\w+|fiscal)\b/;
const STRIKE = /\b(greves?|grevistas?|paralisac\w+|pre-avisos? de greve|plenarios? de trabalhadores)\b/;
const STRIKE_EXCLUDE = /greve de fome/;
const SECTORS = [
  [/medic|enfermeir|hospital|saude|sns|farmac/, 'Saúde'],
  [/professor|escola|ensino|educacao|universidad|fenprof/, 'Educação'],
  [/greve geral/, 'Greve geral'],
  [/italia|franca|espanha|alemanha|belgica|reino unido|grecia|brasil|eua|estados unidos|argentina/, 'Internacional'],
  [/comboio|\bcp\b|metro|carris|stcp|\btap\b|sata|azores airlines|ryanair|easyjet|handling|tripulantes|pilotos|aeroporto|aviacao|transportes?|motoristas|camionistas|portos?|estivadores|ferrovia/, 'Transportes'],
  [/funcao publica|administracao publica|funcionarios publicos|frente comum/, 'Função pública'],
  [/oficiais de justica|tribuna|justica|magistrad|guardas prisionais/, 'Justiça'],
  [/policia|psp|gnr|bombeiros|forcas de seguranca/, 'Segurança'],
  [/recolha do lixo|lixo|limpeza urbana|autarquia|camara municipal/, 'Autarquias'],
  [/correios|ctt|banca|bancarios|comercio|industria|fabrica|call center/, 'Privado'],
];
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
  .replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };

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
    return { source, topic: topic || 'mundo', title: tag(it, 'title'), summary: tag(it, 'description').slice(0, 240), url: /^https?:\/\//.test(linkTag) ? linkTag : '', date: Date.parse(tag(it, 'pubDate')) || Date.now() };
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
  if (STRIKE.test(text) && !STRIKE_EXCLUDE.test(text)) {
    strikesNow.push({ title: a.title, summary: a.summary, url: a.url, source: a.source, date: a.date, sector: (SECTORS.find(([re]) => re.test(text)) || [null, 'Outros'])[1] });
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
for (const x of strikesNow) if (new Date(x.date).getFullYear() === year && !items.has(strikeKey(x.title))) items.set(strikeKey(x.title), x);
const strikeItems = [...items.values()].sort((x, y) => y.date - x.date);
const monthAgo = Date.now() - 30 * 86400000;
const bySector = {};
for (const x of strikeItems) bySector[x.sector] = (bySector[x.sector] || 0) + 1;
const strikes = {
  year, since: prevStrikes?.since || new Date().toISOString(), reference: REFERENCIA_ANUAL,
  count: strikeItems.length, last30: strikeItems.filter((x) => x.date > monthAgo).length,
  level: Math.min(10, Math.round((1 + (strikeItems.length / REFERENCIA_ANUAL) * 9) * 10) / 10),
  bySector, items: strikeItems.slice(0, 400),
};

// ---------- Histórico diário do índice económico (últimos 60 dias) ----------
const today = new Date().toISOString().slice(0, 10);
const hist = (previous?.economy?.history || []).filter((h) => h.d !== today);
hist.push({ d: today, v: econLevel });
const economy = { level: econLevel, total: econTotal, negative: econNeg, history: hist.slice(-60), articles: econArticles.slice(0, 25) };

mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/news.json', JSON.stringify({ generated: new Date().toISOString(), counts, war: war.slice(0, 30), economy, strikes }));
console.log(`news.json: ${counts.total} notícias do mundo, ${war.length} sobre conflitos; economia ${econTotal} (${econNeg} negativas, índice ${econLevel}); greves no ano ${strikes.count} (${strikesNow.length} recentes)`);
