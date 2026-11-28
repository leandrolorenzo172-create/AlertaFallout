// País do utilizador (ISO 3166-1 alpha-2), detetado automaticamente e partilhado por toda a app.
// Ordem: 1) GPS + geocodificação inversa (OpenStreetMap Nominatim) — só se a localização já estiver autorizada
//        ou se o utilizador tocar em "Usar GPS" (o pedido de autorização nasce sempre de um toque);
//        2) endereço IP (GeoJS, com ipwho.is de reserva); 3) região do idioma do telemóvel (sem coordenadas).
// O resultado fica em cache para a app abrir já com o país certo, e volta a ser confirmado ao regressar à app
// (assim, quem viaja passa a ver o novo país sem fazer nada).
import { useSyncExternalStore } from 'react';
import { getLang } from '../i18n';

const KEY = 'sd_country';
const STALE_MS = 20 * 60000; // volta a confirmar ao fim de 20 min (ao voltar à app ou com rede de novo)

/**
 * @typedef {'loading'|'ready'} CountryStatus
 * @typedef {'gps'|'ip'|'locale'} CountrySource
 * @typedef {'granted'|'denied'|'prompt'|'unavailable'} GeoPermission
 * @typedef {{ status: CountryStatus, code: string|null, name: string, city: string, lat: number|null, lon: number|null,
 *   source: CountrySource|null, permission: GeoPermission, at: number, error: string }} CountryState
 */

const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
const cached = load();
/** @type {CountryState} */
let state = cached?.code
  ? { ...cached, status: 'ready', permission: 'prompt', error: '' }
  : { status: 'loading', code: null, name: '', city: '', lat: null, lon: null, source: null, permission: 'prompt', at: 0, error: '' };
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const set = (p) => { state = { ...state, ...p }; emit(); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

export const getCountry = () => state;
export const useCountry = () => useSyncExternalStore(subscribe, getCountry);
export const onCountryChange = (f) => { let prev = state.code; return subscribe(() => { if (state.code !== prev) { prev = state.code; f(state); } }); };

// Nome do país no idioma da app (não no do browser)
export function countryName(code, lang) {
  if (!code) return '';
  try { return new Intl.DisplayNames([lang || (getLang() === 'en' ? 'en-GB' : 'pt-PT')], { type: 'region' }).of(code) || code; } catch { return code; }
}

const timeout = (ms) => AbortSignal.timeout(ms);
const getJson = async (url, ms = 8000) => { const r = await fetch(url, { signal: timeout(ms), headers: { Accept: 'application/json' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); };

async function permissionState() {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return 'unavailable';
  try { const p = await navigator.permissions?.query({ name: 'geolocation' }); return p?.state || 'prompt'; } catch { return 'prompt'; }
}

function gpsPosition(ms = 12000) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(Object.assign(new Error(e.code === 1 ? 'denied' : 'unavailable'), { code: e.code })),
      { enableHighAccuracy: false, timeout: ms, maximumAge: 10 * 60000 },
    );
  });
}

// Coordenadas -> país e localidade (Nominatim, 1 pedido; política do serviço: sem pedidos em massa)
async function reverseCountry(lat, lon) {
  const j = await getJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=${encodeURIComponent((navigator.language || 'pt').slice(0, 2))}`, 10000);
  const a = j.address || {};
  if (!a.country_code) throw new Error('sem país');
  return { code: a.country_code.toUpperCase(), city: a.city || a.town || a.village || a.municipality || a.county || '' };
}

// País pelo endereço IP (cidade aproximada). Dois serviços gratuitos com CORS.
async function ipCountry() {
  try {
    const j = await getJson('https://get.geojs.io/v1/ip/geo.json');
    if (j.country_code) return { code: j.country_code.toUpperCase(), city: j.city || '', lat: Number(j.latitude) || null, lon: Number(j.longitude) || null };
  } catch { /* tenta o segundo */ }
  const j = await getJson('https://ipwho.is/');
  if (!j.success || !j.country_code) throw new Error('ip sem país');
  return { code: j.country_code.toUpperCase(), city: j.city || '', lat: Number(j.latitude) || null, lon: Number(j.longitude) || null };
}

// Região do idioma do sistema (ex.: en-GB -> GB). Último recurso, sem coordenadas.
function localeCountry() {
  const tags = typeof navigator !== 'undefined' ? [...(navigator.languages || []), navigator.language] : [];
  for (const tag of tags.filter(Boolean)) {
    try { const r = new Intl.Locale(tag).maximize().region; if (r && /^[A-Z]{2}$/.test(r)) return r; } catch { /* etiqueta inválida */ }
  }
  return null;
}

function commit(p) {
  const next = { ...p, name: countryName(p.code), at: Date.now(), status: 'ready', error: '' };
  set(next);
  try { localStorage.setItem(KEY, JSON.stringify({ code: next.code, name: next.name, city: next.city, lat: next.lat, lon: next.lon, source: next.source, at: next.at })); } catch { /* sem espaço */ }
}

let running = null;
/**
 * Deteta o país. askGps=true pede autorização de localização (usar só num toque do utilizador).
 * Devolve o estado final; nunca lança erro (os erros ficam em state.error).
 */
export function detectCountry({ askGps = false } = {}) {
  if (running) return running;
  running = (async () => {
    const permission = await permissionState();
    set({ permission });
    // 1) GPS
    if (permission === 'granted' || (askGps && permission === 'prompt')) {
      try {
        const pos = await gpsPosition();
        set({ permission: 'granted' });
        try {
          const r = await reverseCountry(pos.lat, pos.lon);
          commit({ code: r.code, city: r.city, lat: pos.lat, lon: pos.lon, source: 'gps' });
          return state;
        } catch {
          // sem rede para o nome do país: se estamos perto da última deteção, mantém o país e atualiza as coordenadas
          if (state.code && state.lat != null && Math.hypot(state.lat - pos.lat, state.lon - pos.lon) < 1.5) {
            commit({ code: state.code, city: state.city, lat: pos.lat, lon: pos.lon, source: 'gps' }); return state;
          }
        }
      } catch (e) { set({ permission: e.message === 'denied' ? 'denied' : permission === 'granted' ? 'granted' : 'unavailable' }); }
    }
    // 2) IP
    try { const r = await ipCountry(); commit({ ...r, source: 'ip' }); return state; } catch { /* sem rede ou serviço em baixo */ }
    // 3) idioma do sistema (mantém o país já conhecido se for o mesmo, para não perder as coordenadas)
    const lc = localeCountry();
    if (state.code && (!lc || lc === state.code)) { set({ status: 'ready' }); return state; }
    if (lc) { commit({ code: lc, city: '', lat: null, lon: null, source: 'locale' }); return state; }
    set({ status: 'ready', error: 'Não foi possível saber o país (sem GPS, sem rede e sem região no telemóvel).' });
    return state;
  })().finally(() => { running = null; });
  return running;
}

// Arranque: deteta já e volta a confirmar ao regressar à app ou quando a rede volta
let started = false;
export function startCountryDetection() {
  if (started || typeof window === 'undefined') return;
  started = true;
  detectCountry();
  const again = () => { if (document.visibilityState === 'visible' && Date.now() - state.at > STALE_MS) detectCountry(); };
  document.addEventListener('visibilitychange', again);
  window.addEventListener('online', () => detectCountry());
}
