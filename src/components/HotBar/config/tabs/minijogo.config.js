// MINI JOGO — partida, som e ecrã (estado em src/game/gameRemote.js + useGameRemote)
import { Gamepad2, Play, Pause, RotateCw, Volume2, VolumeX, Maximize, Trophy, HelpCircle } from 'lucide-react';
import { onTogglePause, onRestart, onSwitchGame, onToggleSound, onFullscreen, openGamePanel, bumpSound, GAME_LABEL } from '@/game/gameRemote';
import { useGameRemote } from '@/game/useGameRemote';
import { getPrefs as getGamePrefs } from '@/game/eraWar/audio';
import { getSound as getLcdSound } from '@/game/lcd/engine';
import { t } from '@/i18n';

// estado do jogo + som ([texto, ligado]) e se o LCD está num menu (sem partida para pausar)
function useGameContext() {
  const g = useGameRemote();
  let sound;
  if (g.game === 'erawar') { const p = getGamePrefs(); sound = p.music && p.sfx ? ['SOM ON', true] : p.music ? ['SÓ MÚSICA', true] : p.sfx ? ['SÓ EFEITOS', true] : ['SOM OFF', false]; }
  else sound = getLcdSound() ? ['SOM ON', true] : ['SOM OFF', false];
  const lcdIdle = g.game !== 'erawar' && g.lcdMode && g.lcdMode !== 'play';
  return { ...g, sound, lcdIdle };
}

export default {
  tab: { id: 'minijogo', path: '/minijogo', label: 'Mini Jogo', icon: Gamepad2 },
  ariaLabel: 'Ferramentas do jogo',
  minWidth: 220,
  useContext: useGameContext,
  items: [
    { id: 'pause', label: 'Pausar / Retomar', icon: (g) => (g.paused ? Play : Pause), keepOpen: true, toggle: true, shortcut: 'p',
      isActive: (g) => g.paused, disabledWhen: (g) => !g.inMatch || g.lcdIdle,
      badge: (g) => t(!g.inMatch ? 'SEM PARTIDA' : g.lcdIdle ? 'NO MENU' : g.paused ? 'PAUSADO' : 'EM JOGO'), run: () => onTogglePause() },
    { id: 'restart', label: 'Reiniciar partida', icon: RotateCw, badge: (g) => (g.inMatch ? '↻' : t('JOGAR')), run: () => onRestart() },
    { id: 'switch', label: 'Trocar de jogo', icon: Gamepad2, keepOpen: true, badge: (g) => t(GAME_LABEL[g.game]).toUpperCase(), run: () => onSwitchGame() },
    { id: 'sound', label: 'Áudio do jogo', icon: (g) => (g.sound[1] ? Volume2 : VolumeX), keepOpen: true, toggle: true, shortcut: 'm',
      isActive: (g) => g.sound[1], badge: (g) => t(g.sound[0]), run: (_g, api) => { onToggleSound(); api.later(bumpSound, 120); } },
    { id: 'fullscreen', label: 'Ecrã inteiro', icon: Maximize, toggle: true, shortcut: 'f', isActive: (g) => g.fullscreen,
      badge: (g) => (g.fullscreen ? 'ON' : 'OFF'), run: () => onFullscreen() },
    { id: 'stats', label: 'Recordes', icon: Trophy, run: () => openGamePanel('stats') },
    { id: 'help', label: 'Ajuda / Controlos', icon: HelpCircle, run: () => openGamePanel('help') },
  ],
};
