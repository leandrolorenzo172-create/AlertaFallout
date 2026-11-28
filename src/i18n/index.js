// Idiomas da app: Português (PT) e English (US).
// Os textos estão escritos em português no código e passam por t('texto'); em inglês, t() procura a tradução em en.js
// (se faltar, mostra o português). Variáveis: t('Greves {ano}', { ano: 2026 }).
// O idioma fica em pb_settings.lang (Definições > Idioma); sem escolha, segue o idioma do telemóvel.
import EN from './en.js';
import { usesFahrenheit, usesMph } from '../geo/emergency';

export const LANGS = [
  { id: 'pt', label: 'Português (PT)', flag: '🇵🇹' },
  { id: 'en', label: 'English (US)', flag: '🇺🇸' },
];

// Não importa theme.js de propósito (este módulo também entra no rádio e nos jogos autónomos): lê pb_settings diretamente.
const deviceLang = () => (typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language || '') ? 'en' : 'pt');
const saved = () => { try { return JSON.parse(localStorage.getItem('pb_settings') || '{}').lang; } catch { return null; } };
let LANG = null;
export const getLang = () => { if (!LANG) { const v = saved(); LANG = v === 'en' || v === 'pt' ? v : deviceLang(); } return LANG; };
export const refreshLang = () => { LANG = null; return getLang(); }; // chamado por theme.js quando o idioma muda
export const isEn = () => getLang() === 'en';
export const locale = () => (isEn() ? 'en-US' : 'pt-PT');

export function t(pt, vars) {
  let s = isEn() ? (EN[pt] ?? pt) : pt;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}

// Idioma atual para componentes React (ao mudar de idioma a app recarrega, por isso não precisa de subscrição)
export const useLang = () => getLang();

// Unidades pelo país detetado (src/geo/country.js guarda-o em sd_country): °F só nos EUA (e poucos outros);
// mph nos EUA e no Reino Unido; o resto °C e km/h. Lê o localStorage diretamente porque este módulo também
// entra no rádio e nos jogos autónomos (sem React).
const COUNTRY = () => { try { return JSON.parse(localStorage.getItem('sd_country') || '{}').code || null; } catch { return null; } };
const FAHRENHEIT = () => usesFahrenheit(COUNTRY());
const MPH = () => usesMph(COUNTRY());
const num = (v) => (v === null || v === undefined || v === '' || v === '—' || Number.isNaN(Number(v)) ? null : Number(v));
export const tempUnit = () => (FAHRENHEIT() ? '°F' : '°C');
export const windUnit = () => (MPH() ? 'mph' : 'km/h');
export const tempVal = (c) => { const n = num(c); return n === null ? '—' : Math.round(FAHRENHEIT() ? n * 9 / 5 + 32 : n); };
export const temp = (c) => { const v = tempVal(c); return v === '—' ? v : `${v}${tempUnit()}`; };
export const windVal = (kmh) => { const n = num(kmh); return n === null ? '—' : Math.round(MPH() ? n * 0.621371 : n); };
export const wind = (kmh) => { const v = windVal(kmh); return v === '—' ? v : `${v} ${windUnit()}`; };
