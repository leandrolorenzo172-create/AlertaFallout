// Avisos de greve: "ALERTA — Greve da Função Pública dia 26/11/26".
// Usa strikes.upcoming de data/news.json (gerado de hora a hora em scripts/fetch-news.mjs).
// Avisa ANTECEDENCIA_DIAS antes (uma vez) e de novo no próprio dia.
// - Com a app aberta: faixa no topo do ecrã + notificação do sistema (se o utilizador deu permissão).
// - Com a app fechada: o service worker (sw.js) faz a mesma verificação quando o Android o deixa correr
//   (Periodic Background Sync, só na app instalada no Chrome/Android).
// O registo dos avisos já mostrados fica na Cache Storage, partilhado entre a página e o service worker.
import { IS_ARTIFACT } from '@/api/base44Client';
import { syncPush } from './push';
import { t, isEn } from '@/i18n';

export const ANTECEDENCIA_DIAS = 2;
const STATE_CACHE = 'pipboy-avisos';
const STATE_URL = './__avisos-greve.json';
const SKIP_SECTORS = new Set(['Internacional']); // só greves em Portugal

// ---------- texto dos avisos ----------
const SECTOR_TXT = {
  'Função pública': t('Greve da Função Pública'), Saúde: t('Greve na Saúde'), Educação: t('Greve nas escolas'),
  Transportes: t('Greve nos Transportes'), 'Greve geral': t('Greve geral'), Justiça: t('Greve na Justiça'),
  Segurança: t('Greve nas forças de segurança'), Autarquias: t('Greve nas autarquias'),
};
const dmy = (d) => { const [y, m, dd] = d.split('-'); return isEn() ? `${m}/${dd}/${y.slice(2)}` : `${dd}/${m}/${y.slice(2)}`; }; // EUA: mês/dia/ano
const ymdLocal = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000);

export function strikeMessage(s, kind) {
  const what = SECTOR_TXT[s.sector] || t('Greve');
  const when = s.days.length > 1 ? t('de {a} a {b}', { a: dmy(s.days[0]), b: dmy(s.days[s.days.length - 1]) }) : t('dia {a}', { a: dmy(s.days[0]) });
  const title = kind === 'dia' ? `${t('ALERTA — HOJE:')} ${what} (${dmy(ymdLocal())})` : `${t('ALERTA')} — ${what} ${when}`;
  return { title, body: s.title };
}

// Escolhe os avisos a dar agora. kind 'pre' = antecedência, 'dia' = no próprio dia (durante a greve).
export function dueAlerts(upcoming, shown, today = ymdLocal()) {
  const out = [];
  for (const s of upcoming || []) {
    if (!s.days?.length || SKIP_SECTORS.has(s.sector)) continue;
    const first = s.days[0], last = s.days[s.days.length - 1];
    const until = daysBetween(today, first);
    if (today >= first && today <= last) { if (!shown[`${s.id}|dia|${today}`]) out.push({ s, kind: 'dia', key: `${s.id}|dia|${today}` }); }
    else if (until > 0 && until <= ANTECEDENCIA_DIAS && !shown[`${s.id}|pre`]) out.push({ s, kind: 'pre', key: `${s.id}|pre` });
  }
  return out;
}

// ---------- estado partilhado com o service worker ----------
async function readState() {
  try { const r = await (await caches.open(STATE_CACHE)).match(STATE_URL); if (r) return await r.json(); } catch { /* sem cache */ }
  return { enabled: true, shown: {} };
}
async function writeState(st) {
  try { await (await caches.open(STATE_CACHE)).put(STATE_URL, new Response(JSON.stringify(st), { headers: { 'content-type': 'application/json' } })); } catch { /* sem cache */ }
}
// Interruptores de Definições > Notificações (o service worker usa-os para filtrar as notificações push)
const PREF_DEFAULTS = { guerra_enabled: true, catastrofes_enabled: true, meteorologia_enabled: true, tensao_global_enabled: true, pizza_index_enabled: false, greves_enabled: true };
function readPrefs() {
  try { const rows = JSON.parse(localStorage.getItem('b44_NotificationSettings') || '[]'); const r = rows[0] || {}; return Object.fromEntries(Object.keys(PREF_DEFAULTS).map((k) => [k, r[k] ?? PREF_DEFAULTS[k]])); } catch { return { ...PREF_DEFAULTS }; }
}
function enabledInSettings() { return readPrefs().greves_enabled !== false; }

// ---------- entrega ----------
// cor da app escolhida (as miniaturas das notificações existem nas 5 cores)
const themeId = () => { try { const t = JSON.parse(localStorage.getItem('pb_settings') || '{}').theme; return /^(green|white|amber|blue|red)$/.test(t) ? t : 'green'; } catch { return 'green'; } };
const thumb = (mode = 'base') => `./icons/tempo/${themeId()}/${mode}.png`;

async function systemNotify({ title, body, icon, url }, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const opts = { body, tag, icon: icon || thumb('base'), badge: './icons/icon-192.png', data: { url: url || './#/greves' } };
  try {
    // espera pelo service worker (na primeira abertura ainda pode estar a instalar)
    const reg = navigator.serviceWorker ? await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 5000))]) : null;
    if (reg) { await reg.showNotification(title, opts); return; }
  } catch { /* cai para a Notification normal */ }
  try { new Notification(title, opts); } catch { /* Android sem service worker não aceita new Notification */ }
}
function banner({ title, body, icon, url }) {
  window.dispatchEvent(new CustomEvent('pb-strike-alert', { detail: { title, body, icon, url } }));
}

// Pede autorização para notificações do sistema (tem de ser chamado a partir de um toque do utilizador).
export async function askPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  let p = Notification.permission;
  if (p === 'default') p = await Notification.requestPermission();
  if (p === 'granted') registerBackground();
  return p;
}
async function registerBackground() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    if (!reg?.periodicSync) return;
    const st = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (st.state === 'granted') await reg.periodicSync.register('avisos-greve', { minInterval: 3 * 3600 * 1000 });
  } catch { /* não suportado: os avisos ficam só com a app aberta */ }
}

// Aviso de teste (botão nas Notificações)
// Exemplos (botões nas Notificações): mostram na hora a faixa na app e a notificação do telemóvel, com a miniatura na cor da app.
export async function testAlert() {
  const msg = { ...strikeMessage({ sector: 'Função pública', days: [ymdLocal(new Date(Date.now() + 2 * 86400000))], title: t('Exemplo: assim chegam os avisos de greve.') }, 'pre'), icon: thumb('base'), url: './#/greves' };
  banner(msg); await systemNotify(msg, 'greve-teste');
}
// cada toque mostra o estado do tempo seguinte, para se verem todos
const TEMPO_EX = [
  ['rain', t('Aguaceiros · 11°/16°'), t('Chuva 85% · Vento moderado (SW). Leva impermeável ou guarda-chuva.')],
  ['sun', t('Céu limpo · 9°/21°'), t('Chuva 0% · Vento fraco (N). Aproveita o dia ao ar livre!')],
  ['cold', t('Geada · -1°/9°'), t('Chuva 5% · Vento fraco (NE). Agasalha-te bem.')],
  ['wind', t('Céu nublado · 10°/15°'), t('Chuva 30% · Vento forte (W). Atenção a objetos soltos com o vento.')],
  ['fog', t('Nevoeiro · 7°/14°'), t('Chuva 10% · Vento fraco (E). Visibilidade reduzida: cuidado na estrada.')],
  ['cloud', t('Céu parcialmente nublado · 8°/18°'), t('Chuva 35% · Vento fraco (W). Dia sem grandes surpresas.')],
];
let tempoIdx = 0;
export async function testWeatherAlert() {
  const [mode, tipo, body] = TEMPO_EX[tempoIdx++ % TEMPO_EX.length];
  const msg = { title: `${t('Tempo hoje em Braga:')} ${tipo} (${t('EXEMPLO')})`, body, icon: thumb(mode), url: './#/meteo' };
  banner(msg); await systemNotify(msg, `tempo-exemplo-${mode}`);
  return mode;
}

let running = false;
export async function checkStrikeAlerts() {
  if (running || IS_ARTIFACT) return; running = true;
  try {
    const enabled = enabledInSettings();
    const st = await readState();
    st.enabled = enabled;
    st.prefs = readPrefs();
    // cor da app escolhida neste telemóvel: as miniaturas das notificações usam a mesma (public/icons/tempo/<cor>/)
    try { st.theme = JSON.parse(localStorage.getItem('pb_settings') || '{}').theme || 'green'; } catch { st.theme = 'green'; }
    if (enabled) {
      const res = await fetch('./data/news.json', { cache: 'no-cache' });
      const news = res.ok ? await res.json() : null;
      for (const a of dueAlerts(news?.strikes?.upcoming, st.shown)) {
        const msg = strikeMessage(a.s, a.kind);
        banner(msg); await systemNotify(msg, `greve-${a.key}`);
        st.shown[a.key] = Date.now();
      }
      const old = Date.now() - 60 * 86400000; // esquece avisos com mais de 60 dias
      for (const k of Object.keys(st.shown)) if (st.shown[k] < old) delete st.shown[k];
    }
    await writeState(st);
    syncPush(); // interruptores e cor também no serviço de registo (só se mudaram)
  } catch { /* sem rede: tenta mais tarde */ } finally { running = false; }
}

export function startStrikeAlerts() {
  if (IS_ARTIFACT || typeof window === 'undefined') return;
  setTimeout(checkStrikeAlerts, 4000);
  setInterval(checkStrikeAlerts, 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkStrikeAlerts(); });
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') registerBackground();
}
