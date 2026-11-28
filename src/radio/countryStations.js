// Emissoras do país onde o utilizador está, a partir do diretório público radio-browser.info (CORS aberto).
// Portugal continua a usar a lista curada (src/radio/defaultStations.js + src/data/stationsPT.json).
// Sem dependências (também corre no rádio autónomo). Cache de 24 h por país para funcionar sem rede.
import { BAND_LIMITS, SPACING } from './defaultStations';

const MIRRORS = ['https://de1.api.radio-browser.info', 'https://fi1.api.radio-browser.info', 'https://de2.api.radio-browser.info'];
const CACHE = (cc) => `rf_country_${cc}`;
const DAY = 86400000;

// País detetado pela app (sd_country); senão a região do idioma do aparelho
export function currentCountry() {
  try { const c = JSON.parse(localStorage.getItem('sd_country') || '{}').code; if (c) return c; } catch { /* sem armazenamento */ }
  try { return new Intl.Locale(navigator.language).maximize().region || null; } catch { return null; }
}

// País das emissoras: o escolhido no botão 🌍 do rádio (ex.: ouvir rádio francesa estando em Portugal) ou o detetado
const OVERRIDE = 'rf_country_override';
export function radioCountryOverride() { try { return localStorage.getItem(OVERRIDE) || null; } catch { return null; } }
export const radioCountry = () => radioCountryOverride() || currentCountry();
export function setRadioCountry(code) { // null = volta ao automático
  try { if (code) localStorage.setItem(OVERRIDE, code); else localStorage.removeItem(OVERRIDE); } catch { /* sem armazenamento */ }
  try { window.dispatchEvent(new CustomEvent('steeldeck:radio-country', { detail: code })); } catch { /* fora do browser */ }
}

// Países com emissoras no radio-browser.info (por nº de emissoras). Cache de 7 dias; sem rede, lista base.
const COUNTRIES_KEY = 'rf_countries';
const BASE_COUNTRIES = ['PT', 'BR', 'ES', 'FR', 'GB', 'IE', 'US', 'CA', 'DE', 'IT', 'NL', 'BE', 'CH', 'AT', 'LU', 'AO', 'MZ', 'CV', 'MX', 'AR', 'PL', 'SE', 'NO', 'DK', 'GR', 'TR', 'JP', 'AU'];
export async function loadCountryList() {
  try { const c = JSON.parse(localStorage.getItem(COUNTRIES_KEY) || 'null'); if (c && Date.now() - c.at < 7 * DAY) return c.list; } catch { /* sem cache */ }
  for (const base of MIRRORS) {
    try {
      const r = await fetch(`${base}/json/countries?hidebroken=true&order=stationcount&reverse=true`, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const list = (await r.json()).filter((c) => /^[A-Z]{2}$/.test(c.iso_3166_1 || '') && c.stationcount > 0).map((c) => ({ code: c.iso_3166_1, n: c.stationcount }));
      const merged = new Map(list.map((c) => [c.code, c]));
      for (const code of BASE_COUNTRIES) if (!merged.has(code)) merged.set(code, { code, n: null });
      const out = [...merged.values()];
      try { localStorage.setItem(COUNTRIES_KEY, JSON.stringify({ at: Date.now(), list: out })); } catch { /* sem espaço */ }
      return out;
    } catch { /* tenta o espelho seguinte */ }
  }
  return BASE_COUNTRIES.map((code) => ({ code, n: null }));
}

export function cachedCountryStations(cc) {
  try { const c = JSON.parse(localStorage.getItem(CACHE(cc)) || 'null'); return c?.stations?.length ? c : null; } catch { return null; }
}

// Frequências fictícias mas estáveis: as mais ouvidas na FM (espaçadas como no dial real), o resto na AM
function allocate(list) {
  const fmSlots = Math.floor((BAND_LIMITS.FM.max - BAND_LIMITS.FM.min) / SPACING.FM) + 1;
  return list.map((s, i) => (i < fmSlots
    ? { ...s, band: 'FM', freq: Math.round((BAND_LIMITS.FM.min + i * SPACING.FM) * 10) / 10 }
    : { ...s, band: 'AM', freq: BAND_LIMITS.AM.min + (i - fmSlots) * SPACING.AM }))
    .filter((s) => (s.band === 'FM' ? s.freq <= BAND_LIMITS.FM.max : s.freq <= BAND_LIMITS.AM.max));
}

/**
 * Emissoras do país (código ISO alpha-2), por popularidade, só com streams https (o site é https).
 * @returns {Promise<{ stations: Array<{id:string,name:string,url:string,genre:string,page:string,band:'FM'|'AM',freq:number}>, at:number, cc:string }>}
 */
export async function loadCountryStations(cc, { fresh = false } = {}) {
  const code = String(cc || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) throw new Error('código de país inválido');
  const cached = cachedCountryStations(code);
  if (cached && !fresh && Date.now() - cached.at < DAY) return cached;
  let lastErr = null;
  for (const base of MIRRORS) {
    try {
      const r = await fetch(`${base}/json/stations/bycountrycodeexact/${code}?hidebroken=true&order=clickcount&reverse=true&limit=200`, { signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const raw = await r.json();
      const seen = new Set();
      const list = raw
        .filter((s) => /^https:\/\//.test(s.url_resolved || s.url) && /mp3|aac|ogg|opus|hls|unknown|^$/i.test(s.codec || ''))
        .filter((s) => { const k = (s.name || '').trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; })
        .map((s) => ({ id: s.stationuuid, name: s.name.trim(), url: s.url_resolved || s.url, genre: (s.tags || '').split(',').slice(0, 3).join(', '), page: s.homepage || '' }));
      if (!list.length) throw new Error('sem emissoras');
      const out = { stations: allocate(list), at: Date.now(), cc: code };
      try { localStorage.setItem(CACHE(code), JSON.stringify(out)); } catch { /* sem espaço: fica só em memória */ }
      return out;
    } catch (e) { lastErr = e; }
  }
  if (cached) return cached; // sem rede: usa as últimas que conhecemos, mesmo antigas
  throw lastErr || new Error('radio-browser indisponível');
}
