import { t, getLang } from '@/i18n';
// Notificações push (chegam com a app fechada).
// Ao carregar em "Ativar notificações", o telemóvel regista-se sozinho no serviço de registo da SteelDeck
// (Cloudflare Worker, código em worker/push-registry.js). O GitHub Actions (scripts/send-push.mjs) lê de lá a lista
// e envia os avisos só das categorias que cada pessoa ligou. Não há códigos para copiar.
// Chave pública VAPID (não é secreta); a privada está só no GitHub (secret VAPID_PRIVATE_KEY).
export const VAPID_PUBLIC = 'BJUMloYPF_iiynd3u8ispKS3NqXUXDwR2Nc7-MIy0BcBF5d9TaNQaYNkvXQFpj-PtuBMzZcbNLaQTg0UAcj9xi0';
export const PUSH_REGISTRY = 'https://steeldeck-push.steeldeck.workers.dev';

const toBytes = (b64) => { const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); };
export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';

const PREF_DEFAULTS = { guerra_enabled: true, catastrofes_enabled: true, meteorologia_enabled: true, tensao_global_enabled: true, pizza_index_enabled: false, greves_enabled: true };
function localPrefs() {
  try { const r = JSON.parse(localStorage.getItem('b44_NotificationSettings') || '[]')[0] || {}; return Object.fromEntries(Object.keys(PREF_DEFAULTS).map((k) => [k, r[k] ?? PREF_DEFAULTS[k]])); } catch { return { ...PREF_DEFAULTS }; }
}
function localTheme() { try { return JSON.parse(localStorage.getItem('pb_settings') || '{}').theme || 'green'; } catch { return 'green'; } }

async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}
export async function isRegistered() { try { return !!(await currentSub()); } catch { return false; } }

async function send(sub) {
  const body = { subscription: sub.toJSON(), prefs: localPrefs(), theme: localTheme(), lang: getLang() };
  const res = await fetch(`${PUSH_REGISTRY}/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(t('O serviço de notificações não respondeu. Tenta outra vez daqui a pouco.'));
  try { localStorage.setItem('pb_push_sync', JSON.stringify({ ep: sub.endpoint, prefs: body.prefs, theme: body.theme, lang: body.lang })); } catch { /* sem armazenamento */ }
}

// Botão "Ativar notificações no telemóvel": pede autorização, cria o registo e envia-o ao serviço. Tudo automático.
export async function enableNotifications() {
  if (!pushSupported()) throw new Error(t('Este browser não suporta notificações. No Android usa o Chrome (ou Edge, Firefox, Samsung Internet) com a app instalada no ecrã inicial.'));
  const perm = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  if (perm !== 'granted') throw new Error(t('As notificações estão bloqueadas. Ativa-as nas definições do telemóvel para esta app.'));
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try { sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(VAPID_PUBLIC) }); } catch {
      throw new Error(t('O browser recusou o registo. No Brave, ativa em brave://settings/privacy "Usar os serviços Google para mensagens push".'));
    }
  }
  await send(sub);
  return true;
}

// Desligar no telemóvel: apaga o registo no serviço e no browser
export async function disableNotifications() {
  const sub = await currentSub(); if (!sub) return;
  await fetch(`${PUSH_REGISTRY}/unsubscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
  try { localStorage.removeItem('pb_push_sync'); } catch { /* */ }
}

// Mantém o serviço a par dos interruptores e da cor (só envia quando algo mudou)
export async function syncPush() {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const sub = await currentSub(); if (!sub) return;
    const now = JSON.stringify({ ep: sub.endpoint, prefs: localPrefs(), theme: localTheme(), lang: getLang() });
    if (localStorage.getItem('pb_push_sync') === now) return;
    await send(sub);
  } catch { /* tenta outra vez mais tarde */ }
}
