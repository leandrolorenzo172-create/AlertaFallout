// Configuração da IA online (fora do claude.ai): fornecedor escolhido e, para cada um, chave e modelo.
// Tudo fica guardado só neste browser (localStorage). Cada chave só é enviada para o serviço a que pertence.
import { useSyncExternalStore } from 'react';
import { PROVIDERS } from './providers';

const KEY = 'pb_ai_config';
const blank = () => Object.fromEntries(Object.keys(PROVIDERS).map((p) => [p, { key: '', model: PROVIDERS[p].defaultModel, baseUrl: '' }]));
const DEFAULTS = { provider: 'anthropic', providers: blank() };

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY)) || {};
    const providers = blank();
    for (const p of Object.keys(providers)) Object.assign(providers[p], (v.providers || {})[p] || {});
    if (v.apiKey && !providers.anthropic.key) { providers.anthropic.key = v.apiKey; if (v.model) providers.anthropic.model = v.model; } // configuração antiga (só Claude)
    return { provider: PROVIDERS[v.provider] ? v.provider : DEFAULTS.provider, providers };
  } catch { return { ...DEFAULTS, providers: blank() }; }
}
let state = read();
const listeners = new Set();
const write = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem armazenamento */ } listeners.forEach((l) => l()); };

export function getAiConfig() { return state; }
export function setProvider(provider) { state = { ...state, provider }; write(); }
export function setProviderConfig(provider, patch) {
  state = { ...state, providers: { ...state.providers, [provider]: { ...state.providers[provider], ...patch } } };
  write();
}
// Configuração do fornecedor ativo, se estiver pronta a usar
export function activeProvider() {
  const p = state.provider; const c = state.providers[p];
  if (!c) return null;
  if (p === 'custom') return c.baseUrl && c.model ? { id: p, cfg: c } : null; // servidores locais podem não pedir chave
  return c.key && c.model ? { id: p, cfg: c } : null;
}
export function useAiConfig() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getAiConfig);
}
