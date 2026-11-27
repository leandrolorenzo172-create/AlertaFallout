// Ferramentas rápidas do MAPA (menu ≡ flutuante quando a aba ativa é MAPA).
// Estado partilhado entre o menu (HotBar) e o mapa (BragaMapTab): modo de clique ativo e camada visível.
// Só um modo de clique de cada vez ('pin' ou 'measure'): ativar um desliga o outro, para não haver conflitos.
import { useSyncExternalStore } from 'react';

export const LAYERS = ['road', 'terrain', 'sat'];
export const LAYER_LABEL = { road: 'Rodoviário', terrain: 'Terreno', sat: 'Satélite' };
const KEY = 'sd_map_layer';

let state = {
  mode: null, // null | 'pin' | 'measure' | 'route' (rota a pé no mapa online)
  layer: (() => { try { const v = localStorage.getItem(KEY); return LAYERS.includes(v) ? v : 'road'; } catch { return 'road'; } })(),
  route: false, // painel da rota a pé offline aberto
};
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const set = (patch) => { state = { ...state, ...patch }; emit(); };

export const getMapTools = () => state;
export const useMapTools = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getMapTools);

// Ativa um modo (ou desliga-o se já estava ativo). O painel de rota fecha.
export function toggleMode(mode) { set({ mode: state.mode === mode ? null : mode, route: false }); }
export function setMode(mode) { set({ mode }); }
export function nextLayer() {
  const layer = LAYERS[(LAYERS.indexOf(state.layer) + 1) % LAYERS.length];
  try { localStorage.setItem(KEY, layer); } catch { /* sem armazenamento */ }
  set({ layer });
}
export function openRoute(open = true) { set({ route: open, mode: open ? null : state.mode }); }

// Ações pontuais (centrar posição): o mapa ouve este evento dentro do MapContainer
const EVT = 'steeldeck:map-action';
export const runMapAction = (id) => window.dispatchEvent(new CustomEvent(EVT, { detail: { id } }));
export function onMapAction(handler) {
  const fn = (e) => handler(e.detail?.id);
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}
