// Ações do ecrã SOS (menu ≡ da aba IDU): número de emergência do país, SMS com localização, estroboscópio, sirene e ligar ao contacto.
import { useSyncExternalStore } from 'react';
import { getProfile, emergencyContact, requestEdit } from './iduStore';
import { startSiren, stopSiren, isSirenOn, onSirenChange } from './siren';
import { toggleStrobe, stopStrobe, getStrobe, onStrobeChange } from './strobe';
import { getLoc } from '@/location';
import { getCountry } from '@/geo/country';
import { emergencyNumber } from '@/geo/emergency';
import { t, locale } from '@/i18n';

// Estado agregado para o menu: { siren, strobe, lit, sms: 'idle'|'gps'|'sent', notice }
let state = { siren: false, strobe: 'off', lit: false, sms: 'idle', notice: '' };
const subs = new Set();
const set = (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const useSos = () => useSyncExternalStore(subscribe, () => state);
onSirenChange((on) => set({ siren: on }));
onStrobeChange(({ mode, lit }) => set({ strobe: mode, lit }));

// aviso curto no menu SOS (desaparece sozinho)
let noticeTimer = null;
const say = (notice, ms = 6000) => { clearTimeout(noticeTimer); set({ notice }); if (notice) noticeTimer = setTimeout(() => set({ notice: '' }), ms); };

const dial = (n) => { window.location.href = `tel:${n}`; };

// 1) Número de emergência do país onde o utilizador está (112 / 999 / 911 …; 112 se o país não for conhecido)
export const currentEmergencyNumber = () => emergencyNumber(getCountry().code);
export const callEmergency = () => dial(currentEmergencyNumber());

// Sem número de emergência: avisa e abre a ficha no campo do telefone
function missingContact() {
  const msg = t('Ainda não tens contacto de emergência. Preenche o telefone na ficha IDU.');
  say(msg);
  requestEdit('contact1.phone', msg);
}

// Posição atual (GPS, até 10 s); se falhar, a última conhecida ou a cidade de referência da app
const getPosition = () => new Promise((resolve) => {
  if (!navigator.geolocation) { resolve(null); return; }
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: Math.round(p.coords.accuracy), src: 'gps' }),
    () => resolve(null),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
});
function fallbackPosition() {
  try { const tr = JSON.parse(localStorage.getItem('sd_gps_trail') || '[]'); const last = tr[tr.length - 1]; if (last) return { lat: last.lat ?? last[0], lng: last.lng ?? last[1], src: 'trail' }; } catch { /* sem rasto */ }
  const l = getLoc(); return l ? { lat: l.lat, lng: l.lon, src: 'city', city: l.name } : null;
}

// Texto do SMS: nome, posição (link de mapa) e hora
export function buildSosText(p, pos, when = new Date()) {
  const who = p.name || t('Utilizador SteelDeck');
  const hora = when.toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const lines = [t('SOS! {n} precisa de ajuda.', { n: who })];
  if (pos) {
    const c = `${pos.lat.toFixed(5)},${pos.lng.toFixed(5)}`;
    lines.push(pos.src === 'gps' ? t('Localização GPS (±{a} m): {c}', { a: pos.acc, c }) : pos.src === 'trail' ? t('Última posição GPS conhecida: {c}', { c }) : t('Sem GPS. Cidade de referência: {n} ({c})', { n: pos.city, c }));
    lines.push(`https://maps.google.com/?q=${c}`);
  }
  if (p.address) lines.push(t('Morada: {m}', { m: p.address }));
  if (p.blood) lines.push(t('Grupo sanguíneo: {g}', { g: p.blood }));
  lines.push(t('Hora: {h}', { h: hora }));
  return lines.join('\n');
}

// 2) SMS SOS ao contacto de emergência
export async function smsSos() {
  const p = getProfile(); const c = emergencyContact(p);
  if (!c) { missingContact(); return false; }
  if (state.sms === 'gps') return false;
  set({ sms: 'gps' }); say(t('A obter a localização GPS…'), 15000);
  const pos = (await getPosition()) || fallbackPosition();
  const body = encodeURIComponent(buildSosText(p, pos));
  set({ sms: 'sent' }); say(pos?.src === 'gps' ? t('SMS pronto a enviar com a tua localização.') : t('GPS indisponível: enviei a última posição conhecida.'));
  window.location.href = `sms:${c.phone}?body=${body}`;
  setTimeout(() => set({ sms: 'idle' }), 4000);
  return true;
}

// 3) Estroboscópio SOS (lanterna ou ecrã)
export const toggleSosStrobe = () => toggleStrobe();

// 4) Sirene
export const toggleSosSiren = () => { if (isSirenOn()) stopSiren(); else if (!startSiren()) say(t('Este browser não tem Web Audio: não consigo tocar a sirene.')); };

// 5) Ligar ao contacto de emergência
export function callContact() {
  const c = emergencyContact();
  if (!c) { missingContact(); return false; }
  dial(c.phone); return true;
}

// Para tudo (ao sair da aba IDU)
export function stopAllSos() { stopSiren(); if (getStrobe().mode !== 'off') stopStrobe(); }
export const clearNotice = () => say('');
