// Ferramentas rápidas da aba CATÁSTROFES (menu ≡): estado partilhado entre o menu (HotBar) e a página (CatastropheTab).
import { useSyncExternalStore } from 'react';

export const ACTIVE_SEV = 7; // alerta ativo/crítico: gravidade 7/10 ou mais (GDACS laranja/vermelho, sismos fortes)
// Filtros de gravidade / tipo (pelas palavras do título e do resumo, sem acentos)
export const CAT_FILTERS = [
  { id: null, label: 'Todas' },
  { id: 'criticas', label: 'Críticas', test: (a) => a.sev >= 8 },
  { id: 'sismos', label: 'Sismos', test: (a) => /\b(sismo|terramoto|earthquake|tsunami)\b/.test(a.txt) },
  { id: 'incendios', label: 'Incêndios', test: (a) => /\b(incendio|fogo|wildfire|forest fire)\b/.test(a.txt) },
  { id: 'meteo', label: 'Meteorologia/Cheias', test: (a) => /\b(cheias?|inundac\w+|flood|ciclone|furacao|tufao|tempestade|storm|hurricane|typhoon|seca|drought|chuva|aviso (amarelo|laranja|vermelho))\b/.test(a.txt) },
];

let state = { activeOnly: false, filter: null, query: '', searchOpen: false, protocol: false, activeCount: 0, loading: false, lastSync: null };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getCat = () => state;
export const useCatTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getCat);
export const reportCat = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };
export const toggleActiveOnly = () => set({ activeOnly: !state.activeOnly });
export const cycleCatFilter = () => { const i = CAT_FILTERS.findIndex((f) => f.id === state.filter); set({ filter: CAT_FILTERS[(i + 1) % CAT_FILTERS.length].id }); };
export const setCatQuery = (query) => set({ query });
export const openCatSearch = (open = true) => set({ searchOpen: open, ...(open ? {} : { query: '' }) });
export const openProtocol = (open = true) => set({ protocol: open });
export const clearCatFilters = () => set({ activeOnly: false, filter: null, query: '' });
export const catFiltered = (s = state) => s.activeOnly || !!s.filter || !!s.query.trim();

const EVT = 'steeldeck:cat-refresh';
export const onRefreshCat = () => window.dispatchEvent(new Event(EVT));
export const onCatRefresh = (fn) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); };
