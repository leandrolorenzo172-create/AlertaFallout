// Ficha IDU (ID Utilizador): identificação, contactos de emergência e ficha médica.
// Guardada só neste aparelho (localStorage 'sd_idu'); entra no backup das Definições como o resto da app.
import { useSyncExternalStore } from 'react';

const KEY = 'sd_idu';
export const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const contact = () => ({ name: '', relation: '', phone: '' });
export const emptyProfile = () => ({
  // identificação
  name: '', birth: '', address: '', docId: '', idNotes: '',
  // contactos de emergência (o 2.º é opcional)
  contact1: contact(), contact2: contact(),
  // ficha médica
  blood: '', allergies: '', allergiesCritical: false, medication: '', conditions: '',
  updated: 0,
});

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw || typeof raw !== 'object') return emptyProfile();
    const base = emptyProfile();
    return { ...base, ...raw, contact1: { ...base.contact1, ...raw.contact1 }, contact2: { ...base.contact2, ...raw.contact2 } };
  } catch { return emptyProfile(); }
}

let profile = load();
// pedido de edição vindo de fora da aba (ex.: SOS sem número): { field, msg }
let editRequest = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };

// outra aba do browser (ou um restauro de backup) mudou a ficha
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === KEY) { profile = load(); emit(); } });

export const getProfile = () => profile;
export const useIdu = () => useSyncExternalStore(subscribe, getProfile);
export const useEditRequest = () => useSyncExternalStore(subscribe, () => editRequest);

// Guarda a ficha (limpa espaços e normaliza telefones). Devolve a ficha guardada.
export function saveProfile(next) {
  const clean = (s) => (typeof s === 'string' ? s.trim() : s);
  const tel = (s) => clean(s).replace(/[^\d+]/g, '');
  const c = (x) => ({ name: clean(x.name), relation: clean(x.relation), phone: tel(x.phone || '') });
  profile = {
    ...emptyProfile(),
    ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, clean(v)])),
    contact1: c(next.contact1), contact2: c(next.contact2),
    allergiesCritical: !!next.allergiesCritical,
    updated: Date.now(),
  };
  localStorage.setItem(KEY, JSON.stringify(profile));
  editRequest = null;
  emit();
  return profile;
}

export function requestEdit(field, msg) { editRequest = { field, msg, at: Date.now() }; emit(); }
export function clearEditRequest() { if (editRequest) { editRequest = null; emit(); } }

// Idade a partir de AAAA-MM-DD (null se inválida)
export function ageFrom(birth) {
  const d = birth ? new Date(`${birth}T00:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a >= 0 && a < 130 ? a : null;
}

// Primeiro contacto com número (principal, senão o 2.º)
export const emergencyContact = (p = profile) => [p.contact1, p.contact2].find((c) => c?.phone) || null;
export const isEmpty = (p = profile) => !p.updated;
