// Estado da rede em tempo real: navigator.onLine + eventos online/offline + verificação real (ping).
// O ping pede o sw.js ao próprio site com cache desligada; o service worker deixa esse pedido passar,
// por isso uma resposta prova que há mesmo ligação (e não só Wi-Fi sem internet).
import { useSyncExternalStore } from 'react';

let state = typeof navigator === 'undefined' || navigator.onLine !== false ? 'online' : 'offline';
const listeners = new Set();
const set = (s) => { if (s !== state) { state = s; listeners.forEach((l) => l()); } };

let checking = null;
export function checkNow() {
  if (typeof window === 'undefined') return Promise.resolve(state);
  if (navigator.onLine === false) { set('offline'); return Promise.resolve(state); }
  if (window.claude?.use) { set('online'); return Promise.resolve(state); } // dentro do claude.ai não há ficheiros próprios para testar
  if (!checking) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    checking = fetch(`./sw.js?ping=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: ctrl.signal })
      .then(() => set('online')) // qualquer resposta HTTP (mesmo 404) prova que há rede
      .catch(() => set('offline'))
      .finally(() => { clearTimeout(t); checking = null; });
  }
  return checking.then(() => state);
}

let timer = null;
function start() {
  if (timer || typeof window === 'undefined') return;
  window.addEventListener('online', () => checkNow());
  window.addEventListener('offline', () => set('offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkNow(); });
  timer = setInterval(() => { if (document.visibilityState === 'visible') checkNow(); }, 30000);
  checkNow();
}

export function getNetwork() { return state; }
export function useNetwork() {
  start();
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getNetwork);
}
