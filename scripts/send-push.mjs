// Notificações push para os telemóveis registados (corre no GitHub Actions, de hora a hora, depois de scripts/fetch-news.mjs).
// Funcionam com a app fechada. Cada notificação leva a categoria (cat); o telemóvel só a mostra se essa categoria
// estiver ligada em Definições > Notificações (o service worker filtra).
//
// Categorias e quando avisam (só entre as 8h e as 23h de Lisboa):
//  - greves        : ANTECEDENCIA_DIAS antes e no próprio dia (data tirada das notícias)
//  - meteorologia  : avisos do IPMA (amarelo, laranja, vermelho) para o distrito DISTRITO, no próprio dia
//  - catastrofes   : no próprio dia: alertas vermelhos do GDACS, sismos de magnitude >= 6.5 no mundo e >= 4 em Portugal
//  - guerra        : no próprio dia, notícias de conflitos muito graves (gravidade >= 8), no máximo 2 por dia
//  - tensao_global : uma vez por dia, se a tensão geopolítica estiver em >= 7/10 ou subir 1 ponto face a ontem
//  - pizza_index   : uma vez por dia, se o Índice Pizza estiver em >= 7/10
//
// Precisa de: secret VAPID_PRIVATE_KEY e secret PUSH_SUBSCRIPTIONS (lista JSON dos códigos dos telemóveis, obtidos na app em
// Definições > Notificações > "Ativar notificações no telemóvel"). Teste manual: Actions > Run workflow > "Enviar uma notificação de teste" (um exemplo de cada categoria).
// Os avisos já enviados ficam em news.json (pushSent), lido do site publicado na execução seguinte.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import webpush from 'web-push';

export const VAPID_PUBLIC = 'BJUMloYPF_iiynd3u8ispKS3NqXUXDwR2Nc7-MIy0BcBF5d9TaNQaYNkvXQFpj-PtuBMzZcbNLaQTg0UAcj9xi0';
const ANTECEDENCIA_DIAS = 2;
const DISTRITO = { id: 'BRG', nome: 'Braga' };
const PUBLISHED = process.env.PUBLISHED_NEWS_URL || 'https://leandrolorenzo172-create.github.io/AlertaFallout/data/news.json';
const SECTOR_TXT = {
  'Função pública': 'Greve da Função Pública', Saúde: 'Greve na Saúde', Educação: 'Greve nas escolas', Transportes: 'Greve nos Transportes',
  'Greve geral': 'Greve geral', Justiça: 'Greve na Justiça', Segurança: 'Greve nas forças de segurança', Autarquias: 'Greve nas autarquias',
};
const dmy = (d) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
const getJson = async (url) => { try { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); return r.ok ? await r.json() : null; } catch { return null; } };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round1 = (v) => Math.round(v * 10) / 10;

const priv = process.env.VAPID_PRIVATE_KEY;
let subs = [];
try { subs = JSON.parse(process.env.PUSH_SUBSCRIPTIONS || '[]'); } catch { console.log('PUSH_SUBSCRIPTIONS inválido'); }
if (!subs.length && existsSync('push-subscriptions.json')) subs = JSON.parse(readFileSync('push-subscriptions.json', 'utf8'));
if (!Array.isArray(subs)) subs = [subs];
const newsPath = 'public/data/news.json';
const news = JSON.parse(readFileSync(newsPath, 'utf8'));

// hora e dia em Lisboa
const lisbon = (t) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  .formatToParts(t).map((p) => [p.type, p.value]));
const L = lisbon(new Date());
const today = process.env.PUSH_TODAY || `${L.year}-${L.month}-${L.day}`; const hour = process.env.PUSH_TODAY ? 12 : +L.hour; // PUSH_TODAY só para testes
const dayOf = (t) => { const p = lisbon(new Date(t)); return `${p.year}-${p.month}-${p.day}`; };
const hm = (t) => { const p = lisbon(new Date(t)); return `${p.hour}:${p.minute}`; };

let previous = null;
try { const r = await fetch(PUBLISHED, { signal: AbortSignal.timeout(15000) }); if (r.ok) previous = await r.json(); } catch { /* sem anterior */ }
const sent = { ...(previous?.pushSent || {}) };
const meta = { ...(previous?.pushMeta || {}) }; // valores do dia anterior (ex.: tensão)
const old = Date.now() - 60 * 86400000;
for (const k of Object.keys(sent)) if (sent[k] < old) delete sent[k];
const sentToday = (cat) => Object.keys(sent).filter((k) => k.startsWith(`${cat}|`) && k.includes(today)).length;

const due = [];
const add = (cat, key, title, body, url) => { if (!sent[key]) due.push({ cat, key, title, body, url }); };

if (hour >= 8 && hour < 23) {
  // ---- Greves: antecedência e no próprio dia ----
  for (const s of news.strikes?.upcoming || []) {
    if (!s.days?.length || s.sector === 'Internacional') continue;
    const first = s.days[0], last = s.days[s.days.length - 1];
    const until = Math.round((new Date(first + 'T12:00Z') - new Date(today + 'T12:00Z')) / 86400000);
    const what = SECTOR_TXT[s.sector] || 'Greve';
    // as chaves antigas (sem "greves|") continuam a contar como já enviadas
    if (today >= first && today <= last) { const k = `${s.id}|dia|${today}`; if (!sent[k]) add('greves', k, `ALERTA — HOJE: ${what} (${dmy(today)})`, s.title, './#/greves'); }
    else if (until > 0 && until <= ANTECEDENCIA_DIAS) { const k = `${s.id}|pre`; if (!sent[k]) add('greves', k, `ALERTA — ${what} ${s.days.length > 1 ? `de ${dmy(first)} a ${dmy(last)}` : `dia ${dmy(first)}`}`, s.title, './#/greves'); }
  }

  // ---- Meteorologia: avisos do IPMA para o distrito, ativos hoje ----
  const LV = { yellow: 'AMARELO', orange: 'LARANJA', red: 'VERMELHO' };
  const warnings = await getJson('https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json');
  for (const w of warnings || []) {
    if (w.idAreaAviso !== DISTRITO.id || !LV[w.awarenessLevelID]) continue;
    const s = dayOf(w.startTime), e = dayOf(w.endTime);
    if (today < s || today > e || new Date(w.endTime) < new Date()) continue;
    add('meteorologia', `meteorologia|${today}|${w.awarenessLevelID}|${w.awarenessTypeName}|${w.startTime}`,
      `ALERTA ${LV[w.awarenessLevelID]} — ${w.awarenessTypeName} em ${DISTRITO.nome} hoje (${hm(w.startTime)} às ${hm(w.endTime)})`,
      w.text || `Aviso ${LV[w.awarenessLevelID].toLowerCase()} do IPMA.`, './#/meteo');
  }

  // ---- Catástrofes: GDACS vermelho e sismos fortes, de hoje ----
  const [gdacs, quakes] = await Promise.all([
    getJson('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?alertlevel=red'),
    getJson('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'),
  ]);
  const GT = { EQ: 'Sismo', TC: 'Ciclone tropical', FL: 'Cheias', VO: 'Erupção vulcânica', DR: 'Seca', WF: 'Incêndio florestal', TS: 'Tsunami' };
  for (const f of gdacs?.features || []) {
    const p = f.properties; if (!/red/i.test(p.alertlevel) || dayOf(p.fromdate) !== today) continue;
    add('catastrofes', `catastrofes|${today}|gdacs-${p.eventtype}-${p.eventid}`, `ALERTA VERMELHO — ${GT[p.eventtype] || p.eventtype}: ${p.country || p.name}`, `${p.name}. ${p.severitydata?.severitytext || ''}`.trim(), './#/catastrofes');
  }
  for (const f of (quakes?.features || []).sort((a, b) => b.properties.mag - a.properties.mag)) {
    if (sentToday('catastrofes') + due.filter((d) => d.cat === 'catastrofes').length >= 3) break; // máx. 3 por dia
    const p = f.properties; const pt = /portugal|azores|madeira|açores/i.test(p.place || '');
    if (dayOf(p.time) !== today || !(p.mag >= 6.5 || (pt && p.mag >= 4))) continue;
    add('catastrofes', `catastrofes|${today}|usgs-${f.id}`, `ALERTA — Sismo de magnitude ${p.mag.toFixed(1)} hoje${pt ? ' (Portugal)' : ''}`, `${p.place}, às ${hm(p.time)}.${p.tsunami ? ' Possível tsunami.' : ''}`, './#/catastrofes');
  }

  // ---- Guerra: notícias muito graves de hoje (máx. 2 por dia) ----
  let n = sentToday('guerra');
  for (const a of (news.war || []).filter((x) => x.severity >= 8 && dayOf(x.date) === today).sort((x, y) => y.severity - x.severity)) {
    if (n >= 2) break;
    const k = `guerra|${today}|${a.title.slice(0, 60)}`; if (sent[k]) continue;
    add('guerra', k, `ALERTA — Guerra & Conflitos (${a.region})`, `${a.title} (${a.source})`, './#/guerra'); n++;
  }

  // ---- Tensão global e Índice Pizza: uma vez por dia (mesmas contas que a app) ----
  const c = news.counts || { total: 0, war: 0, prep: 0 };
  const tension = clamp(round1(1 + ((c.war + c.prep) / Math.max(1, c.total)) * 22), 1, 10);
  const pizza = clamp(round1(1 + ((c.war + c.prep) / Math.max(1, c.total)) * 24), 1, 10);
  const yesterday = meta.tension_day && meta.tension_day !== today ? meta.tension : meta.tension_prev;
  if (meta.tension_day !== today) { meta.tension_prev = meta.tension; meta.tension_day = today; }
  meta.tension = tension;
  if (tension >= 7 || (yesterday != null && tension - yesterday >= 1)) {
    add('tensao_global', `tensao_global|${today}`, `ALERTA — Tensão global hoje: ${tension.toFixed(1)}/10`, yesterday != null ? `Ontem: ${Number(yesterday).toFixed(1)}/10. ${c.war + c.prep} de ${c.total} notícias falam de conflitos ou preparação militar.` : `${c.war + c.prep} de ${c.total} notícias falam de conflitos ou preparação militar.`, './#/dashboard');
  }
  if (pizza >= 7) add('pizza_index', `pizza_index|${today}`, `ALERTA — Índice Pizza hoje: ${pizza.toFixed(1)}/10`, 'Muitas notícias sobre conflitos e atividade militar.', './#/pizza');
}

// teste manual: envia um exemplo de cada categoria, a qualquer hora. Cada um leva a sua categoria,
// por isso o telemóvel só mostra os das categorias ligadas em Definições > Notificações (serve para testar os interruptores).
if (process.env.PUSH_TEST) {
  const t = Date.now();
  const EX = [
    ['greves', 'ALERTA — Greve da Função Pública dia 00/00/00 (TESTE)', 'Exemplo de aviso de greve: chega 2 dias antes e no próprio dia.', './#/greves'],
    ['meteorologia', `ALERTA AMARELO — Precipitação em ${DISTRITO.nome} hoje (TESTE)`, 'Exemplo de aviso do IPMA para o teu distrito.', './#/meteo'],
    ['catastrofes', 'ALERTA — Sismo de magnitude 6.8 hoje (TESTE)', 'Exemplo de aviso de catástrofe (GDACS / USGS).', './#/catastrofes'],
    ['guerra', 'ALERTA — Guerra & Conflitos (TESTE)', 'Exemplo de notícia de conflito muito grave.', './#/guerra'],
    ['tensao_global', 'ALERTA — Tensão global hoje: 7.4/10 (TESTE)', 'Exemplo de aviso de tensão global alta ou a subir.', './#/dashboard'],
    ['pizza_index', 'ALERTA — Índice Pizza hoje: 7.2/10 (TESTE)', 'Exemplo do Índice Pizza (desligado por omissão).', './#/pizza'],
  ];
  for (const [cat, title, body, url] of EX) due.push({ cat, key: `teste-${cat}-${t}`, title, body, url });
}

if (!priv || !subs.length) {
  console.log(`push: ${due.length} avisos por enviar, mas falta ${!priv ? 'VAPID_PRIVATE_KEY' : 'algum telemóvel registado'} — nada enviado`);
  for (const d of due) console.log(`  por enviar [${d.cat}]: ${d.title}`);
} else if (due.length) {
  webpush.setVapidDetails('https://leandrolorenzo172-create.github.io/AlertaFallout/', VAPID_PUBLIC, priv);
  for (const d of due.slice(0, 10)) { // nunca mais de 10 de uma vez
    const payload = JSON.stringify({ cat: d.cat, title: d.title, body: d.body, tag: d.key.slice(0, 120), url: d.url });
    const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload, { TTL: 12 * 3600, urgency: 'high' })));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    results.forEach((r) => { if (r.status === 'rejected') console.log('push falhou:', r.reason?.statusCode, r.reason?.body || r.reason?.message); });
    if (ok) sent[d.key] = Date.now();
    console.log(`push [${d.cat}]: "${d.title}" -> ${ok}/${subs.length} telemóveis`);
  }
} else console.log('push: nenhum aviso para enviar agora');

news.pushSent = sent;
news.pushMeta = meta;
writeFileSync(newsPath, JSON.stringify(news));
