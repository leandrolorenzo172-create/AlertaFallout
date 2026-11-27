// Ferramentas rápidas da aba GREVES (menu ≡): estado partilhado entre o menu (HotBar) e a página (StrikesTab).
import { useSyncExternalStore } from 'react';

export const STRIKE_SECTIONS = [
  { id: 'greves-proximas', label: 'Em curso / Próximas' },
  { id: 'greves-setor', label: 'Por setor' },
  { id: 'greves-lista', label: 'Notícias em foco' },
];

let state = {
  sector: 'Todos',     // filtro por setor
  query: '',           // pesquisa por palavra-chave (título, fonte)
  onlyActive: false,   // só greves em curso / marcadas para hoje e próximos dias
  searchOpen: false,   // campo de pesquisa visível na página
  sub: null,           // sublista aberta no menu: null | 'jump' | 'sector'
  sectors: [],         // [[setor, n]] (para o menu)
  activeCount: 0,      // greves marcadas de hoje em diante
  loading: false,
  lastSync: null,
};
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getStrikes = () => state;
export const useStrikesTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getStrikes);
export const reportStrikes = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };

export const setSector = (sector) => set({ sector });
export const setQuery = (query) => set({ query });
export const toggleOnlyActive = () => set({ onlyActive: !state.onlyActive });
export const openSearch = (open = true) => set({ searchOpen: open, ...(open ? {} : { query: '' }) });
export const toggleStrikeSub = (sub) => set({ sub: state.sub === sub ? null : sub });
export const strikesFiltered = (s = state) => s.sector !== 'Todos' || !!s.query.trim() || s.onlyActive;

// "Atualizar dados": a página ouve e volta a pedir o ficheiro de notícias sem cache
const EVT = 'steeldeck:strikes-refresh';
export const onRefreshStrikes = () => window.dispatchEvent(new Event(EVT));
export const onStrikesRefresh = (fn) => { window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); };
