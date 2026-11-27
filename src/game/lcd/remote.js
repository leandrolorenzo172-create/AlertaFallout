// Liga um jogo LCD (Patrulha Estelar / Cobra) ao menu ≡ da aba MINI JOGO (src/game/gameRemote.js).
// Pausa e som entram como teclas virtuais ('ok' e 'mute'), exatamente como os botões do ecrã do jogo.
import { onGameCommand, reportGame, toggleFullscreen } from '../gameRemote';

export function attachLcdRemote(shell, game) {
  const extra = [];
  const take0 = shell.take;
  shell.take = () => [...extra.splice(0), ...take0()];
  const off = onGameCommand((cmd) => {
    const st = game.status;
    if (cmd === 'pause' && st.mode === 'play') extra.push('ok');
    else if (cmd === 'restart') game.restart();
    else if (cmd === 'sound') extra.push('mute');
    else if (cmd === 'fullscreen') toggleFullscreen();
  });
  // estado para o menu (pausado / em jogo)
  const timer = setInterval(() => { const st = game.status; reportGame({ paused: st.mode === 'play' && st.paused, lcdMode: st.mode }); }, 250);
  return () => { off(); clearInterval(timer); shell.take = take0; reportGame({ lcdMode: null }); };
}
