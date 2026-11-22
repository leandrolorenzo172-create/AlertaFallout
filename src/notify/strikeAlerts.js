// Avisos de greve: "ALERTA — Greve da Função Pública dia 26/11/26".
// Usa strikes.upcoming de data/news.json (gerado de hora a hora em scripts/fetch-news.mjs).
// Avisa ANTECEDENCIA_DIAS antes (uma vez) e de novo no próprio dia.
// - Com a app aberta: faixa no topo do ecrã + notificação do sistema (se o utilizador deu permissão).
// - Com a app fechada: o service worker (sw.js) faz a mesma verificação quando o Android o deixa correr
//   (Periodic Background Sync, só na app instalada no Chrome/Android).
// O registo dos avisos já mostrados fica na Cache Storage, partilhado entre a página e o service worker.
import { IS_ARTIFACT } from '@/api/base44Client';

export const ANTECEDENCIA_DIAS = 2;
const STATE_CACHE = 'pipboy-avisos';
const STATE_URL = './__avisos-greve.json';
const SKIP_SECTORS = new Set(['Internacional']); // só greves em Portugal

// ---------- texto dos avisos ----------
const SECTOR_TXT = {
  'Função pública': 'Greve da Função Pública', Saúde: 'Greve na Saúde', Educação: 'Greve nas escolas',
  Transportes: 'Greve nos Transportes', 'Greve geral': 'Greve geral', Justiça: 'Greve na Justiça',
  Segurança: 'Greve nas forças de segurança', Autarquias: 'Greve nas autarquias',
};
const dmy = (d) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y.slice(2)}`; };
const ymdLocal = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00`) - new Date(`${a}T12:00`)) / 86400000);

export function strikeMessage(s, kind) {
  const what = SECTOR_TXT[s.sector] || 'Greve';
  const when = s.days.length > 1 ? `de ${dmy(s.days[0])} a ${dmy(s.days[s.days.length - 1])}` : `dia ${dmy(s.days[0])}`;
  const title = kind === 'dia' ? `ALERTA — HOJE: ${what} (${dmy(ymdLocal())})` : `ALERTA — ${what} ${when}`;
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
async function systemNotify({ title, body }, tag) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const opts = { body, tag, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url: './#/greves' } };
  try {
    // espera pelo service worker (na primeira abertura ainda pode estar a instalar)
    const reg = navigator.serviceWorker ? await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 5000))]) : null;
    if (reg) { await reg.showNotification(title, opts); return; }
  } catch { /* cai para a Notification normal */ }
  try { new Notification(title, opts); } catch { /* Android sem service worker não aceita new Notification */ }
}
function banner({ title, body }) {
  window.dispatchEvent(new CustomEvent('pb-strike-alert', { detail: { title, body } }));
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
export async function testAlert() {
  const msg = strikeMessage({ sector: 'Função pública', days: [ymdLocal(new Date(Date.now() + 2 * 86400000))], title: 'Exemplo: assim chegam os avisos de greve.' }, 'pre');
  banner(msg); await systemNotify(msg, 'greve-teste');
}

let running = false;
export async function checkStrikeAlerts() {
  if (running || IS_ARTIFACT) return; running = true;
  try {
    const enabled = enabledInSettings();
    const st = await readState();
    st.enabled = enabled;
    st.prefs = readPrefs();
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
  } catch { /* sem rede: tenta mais tarde */ } finally { running = false; }
}

export function startStrikeAlerts() {
  if (IS_ARTIFACT || typeof window === 'undefined') return;
  setTimeout(checkStrikeAlerts, 4000);
  setInterval(checkStrikeAlerts, 30 * 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkStrikeAlerts(); });
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') registerBackground();
}
