// Widget "a tocar" do Painel: junta os avisos do Rádio e da Música (evento global 'pb-now-playing').
// Guarda também o estado em pausa (o widget mostra "musica pause - …" / "radio pause - …").
// Prioridade: o que está a tocar; entre dois iguais, o que começou ou mudou mais recentemente.
import { useSyncExternalStore } from 'react';
import { onTogglePlay } from '@/music/musicRemote';
import { onToggleRadio } from '@/audio/radioRemote';

let state = { radio: null, music: null }; // { station, track, at, paused }
const listeners = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('pb-now-playing', (e) => {
    const d = e.detail || {};
    if (d.kind !== 'radio' && d.kind !== 'music') return;
    const prev = state[d.kind];
    let next;
    if (d.clear) next = null;                                   // sem nada para retomar
    else if (d.playing) {
      const same = prev && prev.station === (d.station || '') && prev.track === (d.track || '');
      next = { station: d.station || '', track: d.track || '', at: same ? prev.at : Date.now(), paused: false };
    } else next = prev ? { ...prev, paused: true, at: Date.now() } : null; // pausa: mantém a última estação/faixa
    state = { ...state, [d.kind]: next };
    listeners.forEach((l) => l());
  });
}
const get = () => state;
export function useNowPlaying() {
  const s = useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, get);
  const cands = [s.radio && { kind: 'radio', ...s.radio }, s.music && { kind: 'music', ...s.music }].filter(Boolean);
  return cands.sort((a, b) => (a.paused - b.paused) || (b.at - a.at))[0] || null;
}
// Play / Pause no próprio widget: o mesmo comando dos botões das abas Música / Rádio e do menu ≡
export function toggleNowPlaying(np) {
  if (!np) return;
  if (np.kind === 'music') onTogglePlay();
  else onToggleRadio();
}
