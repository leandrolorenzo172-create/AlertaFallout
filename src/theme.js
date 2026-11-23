// Temas de cor e preferências da barra de navegação, guardados no browser.
// As cores da app são variáveis CSS (--c cor principal, --cd fundo de painéis, --cb fundo do ecrã),
// por isso mudar de tema muda tudo de uma vez, sem recarregar.
import { useSyncExternalStore } from 'react';
import { refreshLang } from './i18n';

export const THEMES = [
  { id: 'green', label: 'Verde (clássico)', c: '0 255 65', cd: '0 26 0', cb: '0 10 0' },
  { id: 'white', label: 'Branco', c: '226 238 232', cd: '20 23 22', cb: '7 8 8' },
  { id: 'amber', label: 'Laranja / Âmbar', c: '255 176 0', cd: '28 18 0', cb: '10 6 0' },
  { id: 'blue', label: 'Azul', c: '46 207 255', cd: '0 20 30', cb: '0 7 11' },
  { id: 'red', label: 'Vermelho', c: '255 70 56', cd: '30 5 3', cb: '11 2 1' },
  // Easter egg: no lilás a mascote passa à versão feminina (painel, clima e miniaturas das notificações)
  { id: 'lilac', label: 'Lilás', c: '226 152 255', cd: '26 9 32', cb: '10 3 14' },
];

const KEY = 'pb_settings';
const DEFAULTS = { theme: 'green', order: [], hidden: [], compact: false, lang: null }; // lang: 'pt' | 'en' | null (segue o telemóvel)

function read() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...DEFAULTS }; }
}
let state = read();
const listeners = new Set();

export function applyTheme(id = state.theme) {
  const t = THEMES.find((x) => x.id === id) || THEMES[0];
  const s = document.documentElement.style;
  s.setProperty('--c', t.c); s.setProperty('--cd', t.cd); s.setProperty('--cb', t.cb);
  document.documentElement.dataset.pb = t.id;
}

export function getSettings() { return state; }
export function setSettings(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem armazenamento */ }
  if ('lang' in patch) {
    refreshLang();
    document.documentElement.lang = patch.lang === 'en' ? 'en' : 'pt';
    import('./notify/strikeAlerts').then((m) => m.checkStrikeAlerts()).catch(() => {}); // notificações no idioma novo
  }
  if ('loc' in patch) import('./notify/strikeAlerts').then((m) => m.checkStrikeAlerts()).catch(() => {}); // notificações do tempo da cidade nova
  if (patch.theme) {
    applyTheme(state.theme);
    // as miniaturas das notificações passam logo a usar a cor nova
    import('./notify/strikeAlerts').then((m) => m.checkStrikeAlerts()).catch(() => {});
  }
  listeners.forEach((l) => l());
}
export function resetSettings() { setSettings({ ...DEFAULTS, lang: state.lang }); } // repor não muda o idioma
const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l); };
export function useSettings() { return useSyncExternalStore(subscribe, getSettings); }

// Ordena os separadores pela preferência guardada; separadores novos ficam no fim.
export function orderTabs(tabs, order) {
  const pos = (id) => { const i = order.indexOf(id); return i < 0 ? 1000 + tabs.findIndex((t) => t.id === id) : i; };
  return tabs.slice().sort((a, b) => pos(a.id) - pos(b.id));
}

// Junta transparência a uma cor: aceita '#rrggbb' ou as cores do tema 'rgb(var(--c))'.
export function alpha(color, hex) {
  const a = (parseInt(hex, 16) / 255).toFixed(2);
  if (typeof color !== 'string') return color;
  if (color.startsWith('#')) return color.slice(0, 7) + hex;
  return color.replace(/rgb\((var\(--\w+\))(?:\s*\/\s*[\d.]+)?\)/, `rgb($1 / ${a})`);
}

export { resolveColor, themedCtx } from './radio/canvasTheme';
