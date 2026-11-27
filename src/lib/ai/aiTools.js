// Ferramentas rápidas da aba IA / MR. STEEL (menu ≡): estado partilhado entre o menu (HotBar), a aba (SurvivalAITab)
// e o motor de chat (aiService.ask).
import { useSyncExternalStore } from 'react';
import { getAiConfig, setProviderConfig, activeProvider } from './config';
import { PROVIDERS, ANTHROPIC_MODELS, listModels } from './providers';

const MODE_KEY = 'sd_ai_mode';
let state = {
  // aiMode: 'full' = IA completa (online quando há chave e rede) · 'local' = só a base local, mesmo com rede
  aiMode: (() => { try { return localStorage.getItem(MODE_KEY) === 'local' ? 'local' : 'full'; } catch { return 'full'; } })(),
  availableModels: [],   // lista real devolvida pela API do fornecedor configurado
  modelsLoading: false,
  modelsError: '',
  sub: null,             // sublista aberta no menu: null | 'model'
};
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getAiTools = () => state;
export const useAiTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getAiTools);
export const getAiMode = () => state.aiMode;

// 🧠 Base local <-> IA completa (guardado no dispositivo; aiService.ask respeita-o)
export function onToggleAiMode() {
  const aiMode = state.aiMode === 'local' ? 'full' : 'local';
  try { localStorage.setItem(MODE_KEY, aiMode); } catch { /* sem armazenamento */ }
  set({ aiMode });
}
export const toggleAiSub = (sub) => set({ sub: state.sub === sub ? null : sub });

// 🤖 Modelo atual: { provider, model, label } (null = sem chave configurada -> BASE LOCAL)
export function selectedModel() {
  const a = activeProvider();
  if (!a) return null;
  return { provider: a.id, model: a.cfg.model, label: a.cfg.model || PROVIDERS[a.id]?.short };
}
// Consulta a lista real de modelos a que a chave guardada tem acesso; se falhar, usa os modelos conhecidos do fornecedor
export async function loadAvailableModels() {
  const a = activeProvider();
  if (!a) { set({ availableModels: [], modelsError: 'nokey' }); return; }
  set({ modelsLoading: true, modelsError: '' });
  try {
    const list = await listModels(a.id, a.cfg);
    set({ availableModels: list.length ? list : fallbackModels(a.id), modelsLoading: false, modelsError: list.length ? '' : 'fallback' });
  } catch (e) {
    set({ availableModels: fallbackModels(a.id), modelsLoading: false, modelsError: e?.message || 'erro' });
  }
}
function fallbackModels(provider) {
  if (provider === 'anthropic') return ANTHROPIC_MODELS;
  const d = PROVIDERS[provider]?.defaultModel; const cur = getAiConfig().providers[provider]?.model;
  return [...new Set([cur, d].filter(Boolean))].map((id) => ({ id, label: id }));
}
// Ativa o modelo escolhido para as respostas seguintes (fica guardado na configuração da IA)
export function onSelectAiModel(id) {
  const a = activeProvider(); if (!a || !id) return;
  setProviderConfig(a.id, { model: id });
  set({ sub: null });
}

// Ações na aba (a aba ouve estes eventos): novo chat e histórico
const EVT = 'steeldeck:ai-tool';
const send = (id) => window.dispatchEvent(new CustomEvent(EVT, { detail: id }));
export const onNewChat = () => send('new');
export const onToggleHistory = () => send('history');
export function onAiTool(handler) { const fn = (e) => handler(e.detail); window.addEventListener(EVT, fn); return () => window.removeEventListener(EVT, fn); }
