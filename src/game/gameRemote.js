// Comando remoto dos minijogos (Guerra das Eras, Patrulha Estelar, Cobra) para o menu ≡ da aba MINI JOGO.
// O menu envia comandos; o jogo em curso executa-os e devolve o estado (em partida, pausado, ecrã inteiro).

export const GAME_IDS = ['erawar', 'space', 'snake'];
export const GAME_LABEL = { erawar: 'Guerra das Eras', space: 'Patrulha Estelar', snake: 'Cobra' };

let state = {
  game: 'erawar',   // jogo escolhido no seletor
  inMatch: false,   // há uma partida aberta (jogo montado)
  paused: false,
  lcdMode: null,    // jogos LCD: 'title' | 'play' | 'over'… (pausa só durante 'play')
  fullscreen: false,
  panel: null,      // null | 'stats' | 'help'
  tick: 0,          // muda quando o som é alterado pelo menu (o seletor relê as preferências)
};
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((l) => l()); };
export const getGame = () => state;
export const subscribeGame = (l) => { listeners.add(l); return () => listeners.delete(l); };
export const reportGame = (patch) => { if (Object.keys(patch).some((k) => state[k] !== patch[k])) set(patch); };

// ---- comandos (menu -> jogo/separador) ----
const EVT = 'steeldeck:game-cmd';
const send = (cmd) => window.dispatchEvent(new CustomEvent(EVT, { detail: cmd }));
export const onTogglePause = () => send('pause');     // ⏸ / ▶ (só com partida ativa)
export const onRestart = () => send('restart');       // ↻ recomeça já (ou começa, se estiver no seletor)
export const onSwitchGame = () => send('switch');     // 🎮 próximo jogo, de volta ao seletor
export const onToggleSound = () => send('sound');     // 🔊 / 🔇 (sincronizado com MÚSICA / EFEITOS)
export const onFullscreen = () => send('fullscreen'); // ⛶ ecrã inteiro + horizontal
export const openGamePanel = (panel) => set({ panel });
export const closeGamePanel = () => set({ panel: null });
export const bumpSound = () => set({ tick: state.tick + 1 });

export function onGameCommand(handler) {
  const fn = (e) => handler(e.detail);
  window.addEventListener(EVT, fn);
  return () => window.removeEventListener(EVT, fn);
}

// Ecrã inteiro genérico (jogos LCD): pede ecrã inteiro e tenta rodar para horizontal; o browser pode recusar
export async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      await screen.orientation?.lock?.('landscape').catch(() => {});
    } else await document.exitFullscreen?.();
  } catch { /* sem suporte: fica como está */ }
  reportGame({ fullscreen: !!document.fullscreenElement });
}
if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', () => reportGame({ fullscreen: !!document.fullscreenElement }));
