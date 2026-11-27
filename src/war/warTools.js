// Ferramentas rápidas da aba GUERRA (menu ≡): estado partilhado entre o menu (HotBar) e a página (WarNewsTab).
import { useSyncExternalStore } from 'react';

export const SEV_STEPS = [0, 5, 7];          // Todas -> >= 5/10 -> >= 7/10
export const ALERT_SEV = 7;                  // alerta ativo/urgente: gravidade 7/10 ou mais
export const WAR_REGIONS = ['Global', 'Europa de Leste', 'Médio Oriente', 'África', 'Ásia-Pacífico', 'Américas', 'Europa'];

let state = { alertsOnly: false, minSev: 0, region: null, query: '', searchOpen: false, sub: null, alertCount: 0, regions: [], loading: false, lastSync: null };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getWar = () => state;
export const useWarTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getWar);
export const reportWar = (patch) => { if (Object.keys(patch).some((k) => JSON.stringify(state[k]) !== JSON.stringify(patch[k]))) set(patch); };
export const toggleAlerts = () => set({ alertsOnly: !state.alertsOnly });
export const cycleSeverity = () => set({ minSev: SEV_STEPS[(SEV_STEPS.indexOf(state.minSev) + 1) % SEV_STEPS.length] });
export const setWarRegion = (region) => set({ region });
export const setWarQuery = (query) => set({ query });
export const openWarSearch = (open = true) => set({ searchOpen: open, ...(open ? {} : { query: '' }) });
export const toggleWarSub = (sub) => set({ sub: state.sub === sub ? null : sub });
export const clearWarFilters = () => set({ alertsOnly: false, minSev: 0, region: null, query: '' });
export const warFiltered = (s = state) => s.alertsOnly || s.minSev > 0 || !!s.region || !!s.query.trim();

const EVT = 'steeldeck:war-refresh';
export const onRefreshWar = () => window.dispatchEvent(new Event(EVT));
export const onWarRefresh = (fn) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); };
