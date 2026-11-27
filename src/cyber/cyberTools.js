// Ferramentas rápidas da aba CIBERATAQUES (menu ≡): estado partilhado entre o menu (HotBar) e a página (CyberTab).
import { useSyncExternalStore } from 'react';

let state = { type: null, criticalOnly: false, sub: null, loading: false, lastSync: null, criticalCount: 0, risk: null };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getCyber = () => state;
export const useCyberTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getCyber);
export const reportCyber = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };
export const setThreatType = (type) => set({ type });
export const toggleCritical = () => set({ criticalOnly: !state.criticalOnly });
export const toggleCyberSub = (sub) => set({ sub: state.sub === sub ? null : sub });

// ATUALIZAR FEED (volta a ler as 13 fontes recolhidas) e RECALCULAR RISCO (refaz a pontuação 0–100 com a hora atual)
const REFRESH = 'steeldeck:cyber-refresh'; const RECALC = 'steeldeck:cyber-recalc';
export const onRefreshCyber = () => window.dispatchEvent(new Event(REFRESH));
export const onCyberRefresh = (fn) => { window.addEventListener(REFRESH, fn); return () => window.removeEventListener(REFRESH, fn); };
export const onRecalcRisk = () => window.dispatchEvent(new Event(RECALC));
export const onCyberRecalc = (fn) => { window.addEventListener(RECALC, fn); return () => window.removeEventListener(RECALC, fn); };
