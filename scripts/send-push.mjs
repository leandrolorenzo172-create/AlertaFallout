// Envia avisos de greve como notificações push para os telemóveis registados (corre no GitHub Actions, de hora a hora,
// depois de scripts/fetch-news.mjs). Funciona com a app fechada.
// Precisa de:
//  - secret VAPID_PRIVATE_KEY no repositório (a chave pública está abaixo e em src/notify/push.js);
//  - telemóveis registados: secret PUSH_SUBSCRIPTIONS (lista JSON) ou o ficheiro push-subscriptions.json na raiz do repositório.
//    O código de cada telemóvel obtém-se na app: Definições > Notificações > "Ativar notificações no telemóvel".
// Regra: avisa ANTECEDENCIA_DIAS antes e no próprio dia (a partir das 8h). Nunca envia entre as 23h e as 8h (hora de Lisboa).
// Os avisos já enviados ficam em news.json (pushSent), lido do site publicado na execução seguinte.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import webpush from 'web-push';

export const VAPID_PUBLIC = 'BJUMloYPF_iiynd3u8ispKS3NqXUXDwR2Nc7-MIy0BcBF5d9TaNQaYNkvXQFpj-PtuBMzZcbNLaQTg0UAcj9xi0';
const ANTECEDENCIA_DIAS = 2;
const PUBLISHED = process.env.PUBLISHED_NEWS_URL || 'https://leandrolorenzo172-create.github.io/AlertaFallout/data/news.json';
const SECTOR_TXT = {
  'Função pública': 'Greve da Função Pública', Saúde: 'Greve na Saúde', Educação: 'Greve nas escolas', Transportes: 'Greve nos Transportes',
  'Greve geral': 'Greve geral', Justiça: 'Greve na Justiça', Segurança: 'Greve nas forças de segurança', Autarquias: 'Greve nas autarquias',
};
const dmy = (d) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };

const priv = process.env.VAPID_PRIVATE_KEY;
let subs = [];
try { subs = JSON.parse(process.env.PUSH_SUBSCRIPTIONS || '[]'); } catch { console.log('PUSH_SUBSCRIPTIONS inválido'); }
if (!subs.length && existsSync('push-subscriptions.json')) subs = JSON.parse(readFileSync('push-subscriptions.json', 'utf8'));
if (!Array.isArray(subs)) subs = [subs];
const newsPath = 'public/data/news.json';
const news = JSON.parse(readFileSync(newsPath, 'utf8'));

// hora e dia em Lisboa
const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  .formatToParts(new Date()).map((p) => [p.type, p.value]));
const today = process.env.PUSH_TODAY || `${parts.year}-${parts.month}-${parts.day}`; const hour = process.env.PUSH_TODAY ? 12 : +parts.hour; // PUSH_TODAY só para testes

let previous = null;
try { const r = await fetch(PUBLISHED, { signal: AbortSignal.timeout(15000) }); if (r.ok) previous = await r.json(); } catch { /* sem anterior */ }
const sent = { ...(previous?.pushSent || {}) };
const old = Date.now() - 60 * 86400000;
for (const k of Object.keys(sent)) if (sent[k] < old) delete sent[k];

const due = [];
if (hour >= 8 && hour < 23) {
  for (const s of news.strikes?.upcoming || []) {
    if (!s.days?.length || s.sector === 'Internacional') continue;
    const first = s.days[0], last = s.days[s.days.length - 1];
    const until = Math.round((new Date(first + 'T12:00Z') - new Date(today + 'T12:00Z')) / 86400000);
    const what = SECTOR_TXT[s.sector] || 'Greve';
    if (today >= first && today <= last) due.push({ key: `${s.id}|dia|${today}`, title: `ALERTA — HOJE: ${what} (${dmy(today)})`, body: s.title });
    else if (until > 0 && until <= ANTECEDENCIA_DIAS) due.push({ key: `${s.id}|pre`, title: `ALERTA — ${what} ${s.days.length > 1 ? `de ${dmy(first)} a ${dmy(last)}` : `dia ${dmy(first)}`}`, body: s.title });
  }
}
const todo = due.filter((d) => !sent[d.key]);

if (!priv || !subs.length) {
  console.log(`push: ${todo.length} avisos por enviar, mas falta ${!priv ? 'VAPID_PRIVATE_KEY' : 'algum telemóvel registado'} — nada enviado`);
} else if (todo.length) {
  webpush.setVapidDetails('https://leandrolorenzo172-create.github.io/AlertaFallout/', VAPID_PUBLIC, priv);
  for (const d of todo) {
    const payload = JSON.stringify({ title: d.title, body: d.body, tag: 'greve-' + d.key, url: './#/greves' });
    const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload, { TTL: 12 * 3600, urgency: 'high' })));
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    results.forEach((r) => { if (r.status === 'rejected') console.log('push falhou:', r.reason?.statusCode, r.reason?.body || r.reason?.message); });
    if (ok) sent[d.key] = Date.now();
    console.log(`push: "${d.title}" -> ${ok}/${subs.length} telemóveis`);
  }
} else console.log('push: nenhum aviso de greve para enviar agora');

news.pushSent = sent;
writeFileSync(newsPath, JSON.stringify(news));
