// Ferramentas rápidas da aba METEO (menu ≡): estado partilhado entre o menu (HotBar) e a página (WeatherTab).
import { useSyncExternalStore } from 'react';

// Secções da página (ids fixos para o scroll)
export const METEO_SECTIONS = [
  { id: 'meteo-cidades', label: 'Cidades' },
  { id: 'meteo-15dias', label: 'Previsão 15 dias' },
  { id: 'meteo-mar', label: 'Avisos marítimos' },
];
// Cidades de referência rápidas (ids do IPMA, iguais a src/location.js)
export const MAIN_CITIES = ['Braga', 'Porto', 'Lisboa', 'Coimbra', 'Faro', 'Évora'];

let state = { loading: false, lastSync: null, seaActive: 0, seaTotal: 0, sub: null }; // sub: null | 'jump' | 'city'
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getMeteo = () => state;
export const useMeteoTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getMeteo);
export const reportMeteo = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };
export const toggleSub = (sub) => set({ sub: state.sub === sub ? null : sub });

// "Atualizar agora": a página ouve este evento e volta a pedir os dados (IPMA / Open-Meteo)
const EVT = 'steeldeck:meteo-refresh';
export const onRefreshWeather = () => window.dispatchEvent(new Event(EVT));
export const onWeatherRefresh = (fn) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); };
