// Comando remoto do leitor de música (src/music/vinylPlayer.js) para o menu ≡ da aba MÚSICA.
// O menu envia comandos; o leitor executa-os e devolve o estado real (a tocar, faixa, EQ, graves, aleatório).
import { useSyncExternalStore } from 'react';

export const EQ_PRESETS = ['normal', 'pop', 'rock', 'jazz', 'classica', 'bass'];
export const EQ_LABEL = { normal: 'Normal', pop: 'Pop', rock: 'Rock', jazz: 'Jazz', classica: 'Clássica', bass: 'Graves' };
// Ganhos (dB) das 5 bandas: 60 Hz, 230 Hz, 910 Hz, 3,6 kHz, 14 kHz
export const EQ_GAINS = {
  normal: [0, 0, 0, 0, 0],
  pop: [-1, 2, 4, 2, -1],
  rock: [4, 2, -2, 2, 4],
  jazz: [3, 1, -1, 2, 3],
  classica: [4, 2, 0, 2, 3],
  bass: [7, 4, 0, -1, -1],
};
// Bass Boost / Loudness: OFF -> BASS -> LOUD -> BASS+LOUD
export const BOOST_MODES = ['off', 'bass', 'loud', 'both'];
export const BOOST_LABEL = { off: 'OFF', bass: 'BASS', loud: 'LOUD', both: 'BASS+LOUD' };

const KEY = 'sd_music_fx';
const saved = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } })();
let state = {
  isPlaying: false,
  track: null,        // nome da faixa atual
  hasTracks: false,
  eq: EQ_PRESETS.includes(saved.eq) ? saved.eq : 'normal',
  boost: BOOST_MODES.includes(saved.boost) ? saved.boost : 'off',
  shuffle: !!saved.shuffle,
};
const listeners = new Set();
const set = (patch) => {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify({ eq: state.eq, boost: state.boost, shuffle: state.shuffle })); } catch { /* sem armazenamento */ }
  listeners.forEach((l) => l());
};
export const getMusic = () => state;
export const useMusicRemote = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, getMusic);

// ---- comandos (menu -> leitor) ----
const EVT = 'steeldeck:music-cmd';
const send = (cmd) => window.dispatchEvent(new CustomEvent(EVT, { detail: cmd }));
export const onTogglePlay = () => send('toggle');       // ▶|| tocar / pausar
export const onNextTrack = () => send('next');          // >>| próxima (respeita o aleatório)
export const onPrevTrack = () => send('prev');          // |<< reinicia ou recua
// EQ, graves e aleatório mudam logo no estado (a UI reage ao clique) e o leitor aplica-os ao áudio
export const onCycleEq = () => set({ eq: EQ_PRESETS[(EQ_PRESETS.indexOf(state.eq) + 1) % EQ_PRESETS.length] });
export const onCycleBoost = () => set({ boost: BOOST_MODES[(BOOST_MODES.indexOf(state.boost) + 1) % BOOST_MODES.length] });
export const onToggleShuffle = () => set({ shuffle: !state.shuffle });

// ---- ligação do leitor (chamado por mountVinylPlayer) ----
export function attachPlayer(handler, onFx) {
  const fn = (e) => handler(e.detail);
  window.addEventListener(EVT, fn);
  listeners.add(onFx); // EQ/graves/aleatório mudaram: o leitor reaplica
  return () => { window.removeEventListener(EVT, fn); listeners.delete(onFx); };
}
export function reportMusic(patch) {
  // evita notificações desnecessárias (timeupdate, etc.)
  if (Object.keys(patch).every((k) => state[k] === patch[k])) return;
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
