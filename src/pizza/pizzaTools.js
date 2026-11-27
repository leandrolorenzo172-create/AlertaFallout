// Ferramentas rápidas da aba PIZZA (menu ≡): estado partilhado entre o menu (HotBar) e a página (PizzaIndexTab).
import { useSyncExternalStore } from 'react';

export const PIZZA_PEAK = 7.5; // limiar crítico do alerta de pico
const KEY = 'sd_pizza_alert';
let state = {
  isPizzaAlertActive: (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })(),
  loading: false, level: null, delta: null, lastSync: null,
};
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getPizza = () => state;
export const usePizzaTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getPizza);
export const reportPizza = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };

// 🚨 modo de alerta de pico: guardado no dispositivo; com o índice >= 7,5 a página mostra o aviso (e notifica, se autorizado)
export function onTogglePizzaAlert() {
  const on = !state.isPizzaAlertActive;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* sem armazenamento */ }
  if (on && typeof Notification !== 'undefined' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  set({ isPizzaAlertActive: on });
}
// ↻ recalcula o índice a partir das notícias mais recentes · 📰 mostra as fontes do cálculo
const REFRESH = 'steeldeck:pizza-refresh';
export const onRefreshPizzaIndex = () => window.dispatchEvent(new Event(REFRESH));
export const onPizzaRefresh = (fn) => { window.addEventListener(REFRESH, fn); return () => window.removeEventListener(REFRESH, fn); };
export const PIZZA_SOURCES_ID = 'pizza-fontes';
