// MÚSICA — controla o leitor (estado em src/music/musicRemote.js). Fica aberto para se verem os estados.
import { Disc3, Play, Pause, SkipForward, SkipBack, SlidersHorizontal, AudioLines, Shuffle } from 'lucide-react';
import { useMusicRemote, onTogglePlay, onNextTrack, onPrevTrack, onCycleEq, onCycleBoost, onToggleShuffle, EQ_LABEL, BOOST_LABEL } from '@/music/musicRemote';
import { t } from '@/i18n';

const noTracks = (m) => !m.hasTracks;

export default {
  tab: { id: 'musica', path: '/musica', label: 'Música', icon: Disc3 },
  ariaLabel: 'Controlo de música',
  minWidth: 210,
  useContext: useMusicRemote,
  status: (m) => ({ text: m.track ? `${m.isPlaying ? '▶' : '||'} ${m.track}` : t('Sem faixas: adiciona músicas no leitor') }),
  items: [
    { id: 'play', label: 'Play / Pause', icon: (m) => (m.isPlaying ? Pause : Play), keepOpen: true, toggle: true, shortcut: 'p', disabledWhen: noTracks,
      isActive: (m) => m.isPlaying, badge: (m) => (m.isPlaying ? 'PAUSE' : 'PLAY'), run: () => onTogglePlay() },
    { id: 'next', label: 'Próxima faixa', icon: SkipForward, keepOpen: true, shortcut: 'n', disabledWhen: noTracks, badge: () => '>>|', run: () => onNextTrack() },
    { id: 'prev', label: 'Faixa anterior', icon: SkipBack, keepOpen: true, shortcut: 'b', disabledWhen: noTracks, badge: () => '|<<', run: () => onPrevTrack() },
    { id: 'eq', label: 'Equalizador', icon: SlidersHorizontal, keepOpen: true, toggle: true, isActive: (m) => m.eq !== 'normal',
      badge: (m) => t(EQ_LABEL[m.eq]).toUpperCase(), run: () => onCycleEq() },
    { id: 'boost', label: 'Bass / Loudness', icon: AudioLines, keepOpen: true, toggle: true, isActive: (m) => m.boost !== 'off',
      badge: (m) => BOOST_LABEL[m.boost], run: () => onCycleBoost() },
    { id: 'shuffle', label: 'Aleatório', icon: Shuffle, keepOpen: true, toggle: true, isActive: (m) => m.shuffle,
      badge: (m) => (m.shuffle ? 'ON' : 'OFF'), run: () => onToggleShuffle() },
  ],
};
