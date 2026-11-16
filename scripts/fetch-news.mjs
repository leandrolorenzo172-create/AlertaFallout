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
];

const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const WAR = /\b(guerra|ataques?|misse?is|missil|bombarde\w*|tropas|exercito|invas\w+|ofensiva|drones?|conflito armado|combates?|rebeldes|cessar-fogo|frente de batalha|artilharia|refens|hamas|hezbollah|houthis?|gaza|kiev|kremlin|ucrania|ucranian\w+|faixa de gaza)\b/;
const PREP = /\b(nato|otan|rearm\w+|armamento|exercicios militares|orcamento da defesa|defesa antiaerea|sancoes|mobilizacao|nuclear|teste de missil|forcas armadas|servico militar|caças|porta-avioes)\b/;
const ECON = /\b(inflacao|recessao|crise economica|crise financeira|bolsas?|tarifas|divida publica|falencia|desemprego|taxas de juro|bce|petroleo|cotacao)\b/;
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
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
  .replace(/\s+/g, ' ').trim();
const tag = (xml, name) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i')); return m ? decode(m[1]) : ''; };

async function readFeed({ source, url }) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; rss-reader)' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.map((it) => {
    const linkTag = tag(it, 'link');
    return { source, title: tag(it, 'title'), summary: tag(it, 'description').slice(0, 240), url: /^https?:\/\//.test(linkTag) ? linkTag : '', date: Date.parse(tag(it, 'pubDate')) || Date.now() };
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
const counts = { total: recent.length, war: 0, prep: 0, econ: 0, cyber: 0 };
const war = [];
for (const a of recent) {
  const text = norm(`${a.title} ${a.summary}`);
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
war.sort((x, y) => y.date - x.date);
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/news.json', JSON.stringify({ generated: new Date().toISOString(), counts, war: war.slice(0, 30) }));
console.log(`news.json: ${counts.total} notícias, ${war.length} sobre conflitos`);
