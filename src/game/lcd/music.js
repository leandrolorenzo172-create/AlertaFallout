// Música chiptune dos jogos LCD (mesmo sintetizador 8-bit da Guerra das Eras). Segue o botão SOM do jogo.
import * as audio from '../eraWar/audio';
import { getSound } from './engine';

export function lcdMusic(which) {
  let on = false;
  const m = {
    play(level = 1) { on = true; if (!getSound()) return; audio.unlock(); audio.playMusic(which, level); audio.setTension(false); audio.pauseMusic(false); },
    stop() { on = false; audio.stopMusic(); },
    pause(p) { audio.pauseMusic(p); },
    speed(n) { audio.setMusicEra(n); },
    tense(t) { audio.setTension(t); },
    sound(enabled) { if (!on) return; if (enabled) m.play(); else audio.stopMusic(); },
  };
  return m;
}
