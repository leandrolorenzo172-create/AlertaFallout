// Modo de resposta do Mr. Steel, escolhido pela ferramenta "Modo IA" do menu ≡ (aba IA).
//  - completa: usa a IA online quando há rede e chave (com recurso automático à base local);
//  - local:    responde sempre com a base local, mesmo com rede e chave (poupa dados e tokens);
//  - tatico:   IA online (se houver) com respostas curtas e diretas, em passos numerados quando for um procedimento.
// Fica guardado no dispositivo.
import { useSyncExternalStore } from 'react';

const KEY = 'pb_ai_mode';
export const AI_MODES = ['completa', 'local', 'tatico'];
export const AI_MODE_LABEL = { completa: 'IA completa', local: 'Base local', tatico: 'Modo tático' };

const read = () => { try { const v = localStorage.getItem(KEY); return AI_MODES.includes(v) ? v : 'completa'; } catch { return 'completa'; } };
let mode = read();
const listeners = new Set();

export const getAiMode = () => mode;
export function setAiMode(next) {
  mode = AI_MODES.includes(next) ? next : 'completa';
  try { localStorage.setItem(KEY, mode); } catch { /* sem armazenamento */ }
  listeners.forEach((l) => l());
  return mode;
}
export const cycleAiMode = () => setAiMode(AI_MODES[(AI_MODES.indexOf(mode) + 1) % AI_MODES.length]);
export function useAiMode() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getAiMode, getAiMode);
}
