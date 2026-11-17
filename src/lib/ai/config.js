// Configuração da IA online (fora do claude.ai): chave da API da Anthropic e modelo.
// A chave fica guardada só neste browser (localStorage) e só é enviada para api.anthropic.com.
import { useSyncExternalStore } from 'react';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (mais capaz)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (equilibrado)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (mais rápido e barato)' },
];
const KEY = 'pb_ai_config';
const DEFAULTS = { apiKey: '', model: 'claude-opus-5-5' };

function read() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...DEFAULTS }; }
}
let state = read();
const listeners = new Set();

export function getAiConfig() { return state; }
export function setAiConfig(patch) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem armazenamento */ }
  listeners.forEach((l) => l());
}
export function useAiConfig() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getAiConfig);
}
