// "A tocar" para o painel principal: junta os avisos do Rádio e da Música (evento global 'pb-now-playing').
// Se os dois estiverem a tocar ao mesmo tempo, mostra o que começou ou mudou de faixa mais recentemente.
import { useSyncExternalStore } from 'react';

let state = { radio: null, music: null }; // { station?, track, at }
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('pb-now-playing', (e) => {
    const d = e.detail || {};
    if (d.kind !== 'radio' && d.kind !== 'music') return;
    const prev = state[d.kind];
    const next = d.playing ? { station: d.station || '', track: d.track || '', at: prev && prev.station === d.station && prev.track === d.track ? prev.at : Date.now() } : null;
    state = { ...state, [d.kind]: next };
    listeners.forEach((l) => l());
  });
}
const get = () => state;
export function useNowPlaying() {
  const s = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, get);
  const cands = [s.radio && { kind: 'radio', ...s.radio }, s.music && { kind: 'music', ...s.music }].filter(Boolean);
  return cands.sort((a, b) => b.at - a.at)[0] || null;
}
