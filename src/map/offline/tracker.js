// Seguimento GPS em tempo real (funciona em modo avião: o GPS não precisa de rede).
// watchPosition com alta precisão; rasto guardado no aparelho; direção pela bússola do telemóvel ou pelo movimento.
import { useSyncExternalStore } from 'react';
import { haversine } from './tileMath';

const KEY = 'sd_gps_trail';
let state = {
  tracking: false,
  pos: null,           // { lat, lng, acc, alt, altAcc, speed, heading, t }
  trail: (() => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } })(), // [[lat,lng,t,alt]]
  heading: null,       // graus (0 = norte)
  error: '',
  distance: 0,         // metros percorridos no rasto
};
state.distance = trailDistance(state.trail);
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getTracker = () => state;
export const useTracker = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getTracker);

function trailDistance(tr) { let d = 0; for (let i = 1; i < tr.length; i++) d += haversine(tr[i - 1][0], tr[i - 1][1], tr[i][0], tr[i][1]); return d; }
let watchId = null; let saveTimer = null;
const save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(state.trail.slice(-5000))); } catch { /* sem espaço */ } }, 1500); };

// bússola: iOS (webkitCompassHeading) e Android (alpha absoluto)
function onOrient(e) {
  let h = null;
  if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
  else if (e.absolute && typeof e.alpha === 'number') h = (360 - e.alpha) % 360;
  if (h != null) set({ heading: Math.round(h) });
}
async function startCompass() {
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const p = await DeviceOrientationEvent.requestPermission(); if (p !== 'granted') return;
    }
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
  } catch { /* sem bússola */ }
}
function stopCompass() { window.removeEventListener('deviceorientationabsolute', onOrient, true); window.removeEventListener('deviceorientation', onOrient, true); }

function onPos(p) {
  const c = p.coords;
  const pos = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, alt: c.altitude, altAcc: c.altitudeAccuracy, speed: c.speed, heading: c.heading, t: p.timestamp };
  const tr = state.trail; const last = tr[tr.length - 1];
  let trail = tr; let distance = state.distance;
  // só junta ao rasto se andou ≥ 5 m e a precisão é aceitável (evita "saltos" do GPS parado)
  if (c.accuracy <= 60 && (!last || haversine(last[0], last[1], pos.lat, pos.lng) >= 5)) {
    if (last) distance += haversine(last[0], last[1], pos.lat, pos.lng);
    trail = [...tr, [pos.lat, pos.lng, pos.t, pos.alt]]; save();
  }
  const heading = Number.isFinite(c.heading) && c.speed > 0.5 ? Math.round(c.heading) : state.heading; // a andar: direção do movimento
  set({ pos, trail, distance, heading, error: '' });
}
function onErr(e) { set({ error: e.code === 1 ? 'A localização está bloqueada para esta app.' : e.code === 3 ? 'O GPS ainda não fixou a posição (tenta ao ar livre).' : 'GPS sem sinal.' }); }

export function startTracking() {
  if (!('geolocation' in navigator)) { set({ error: 'Este dispositivo não tem GPS.' }); return; }
  if (watchId != null) return;
  watchId = navigator.geolocation.watchPosition(onPos, onErr, { enableHighAccuracy: true, maximumAge: 2000, timeout: 30000 });
  startCompass();
  set({ tracking: true, error: '' });
}
export function stopTracking() {
  if (watchId != null) navigator.geolocation.clearWatch(watchId);
  watchId = null; stopCompass(); set({ tracking: false });
}
export const toggleTracking = () => (state.tracking ? stopTracking() : startTracking());
export function clearTrail() { try { localStorage.removeItem(KEY); } catch { /* */ } set({ trail: [], distance: 0 }); }
