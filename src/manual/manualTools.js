// Ferramentas rápidas da aba MANUAL (menu ≡ flutuante): estado partilhado entre o menu (HotBar) e a estante (DocLibrary).
// Os filtros e a ordenação ficam guardados no dispositivo e mantêm-se quando a vista atualiza.
import { useSyncExternalStore } from 'react';

export const DOC_TYPES = ['pdf', 'docx', 'txt', 'md', 'json', 'csv', 'xml'];
export const SORTS = [
  { id: 'default', label: 'Predefinida (Guia primeiro, recentes)' },
  { id: 'new', label: 'Data de inserido: mais recentes' },
  { id: 'old', label: 'Data de inserido: mais antigos' },
  { id: 'az', label: 'Ordem alfabética: A–Z' },
  { id: 'za', label: 'Ordem alfabética: Z–A' },
  { id: 'small', label: 'Tamanho: menor primeiro' },
  { id: 'big', label: 'Tamanho: maior primeiro' },
];
const KEY = 'sd_manual_view';

const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
let state = {
  sort: SORTS.some((s) => s.id === saved.sort) ? saved.sort : 'default',
  types: Array.isArray(saved.types) ? saved.types.filter((x) => DOC_TYPES.includes(x)) : [], // vazio = todos
  group: !!saved.group,          // agrupar por tipo de documento
  themes: Array.isArray(saved.themes) ? saved.themes : [], // temáticas selecionadas (vazio = todas)
  panel: null,                   // null | 'filter' | 'organize'
  tick: 0,                       // sobe a cada "Atualizar vista"
};
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  try { const { sort, types, group, themes } = state; localStorage.setItem(KEY, JSON.stringify({ sort, types, group, themes })); } catch { /* sem armazenamento */ }
  listeners.forEach((l) => l());
};

export const getManualView = () => state;
export const useManualView = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getManualView);

export const refreshView = () => set({ tick: state.tick + 1 });
export const openPanel = (panel) => set({ panel: state.panel === panel ? null : panel });
export const closePanel = () => set({ panel: null });
export const setSort = (sort) => set({ sort });
export const toggleType = (t) => set({ types: state.types.includes(t) ? state.types.filter((x) => x !== t) : [...state.types, t] });
export const setGroup = (group) => set({ group });
export const toggleTheme = (id) => set({ themes: state.themes.includes(id) ? state.themes.filter((x) => x !== id) : [...state.themes, id] });
export const clearThemes = () => set({ themes: [] });
export const clearOrganize = () => set({ sort: 'default', types: [], group: false });
export const filtersActive = (s = state) => s.themes.length > 0 || s.types.length > 0 || s.sort !== 'default' || s.group;

// Voltar ao topo da aba (a página faz scroll na janela)
export function scrollTop() {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
