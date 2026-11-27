// RÁDIO FM — liga/desliga, muda de estação e grava (estado em src/audio/radioRemote.js). Fica aberto para se ver o estado.
import { useEffect, useState } from 'react';
import { Radio as RadioIcon } from 'lucide-react';
import { useRadioRemote, onToggleRadio, onNextStation, onPrevStation, onToggleRecordMp3, requestRadioState } from '@/audio/radioRemote';
import { mmss } from '../helpers';

// estado do sintonizador + relógio da gravação (atualiza a cada segundo enquanto grava)
function useRadioContext() {
  const radio = useRadioRemote();
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!radio.isRecording) return undefined;
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [radio.isRecording]);
  return radio;
}

export default {
  tab: { id: 'radio', path: '/radio', label: 'Rádio FM', icon: RadioIcon },
  ariaLabel: 'Ferramentas do rádio',
  minWidth: 230,
  useContext: useRadioContext,
  onEnter: () => requestRadioState(), // estado real do sintonizador ao entrar na aba
  status: (r) => {
    if (!r.station && !r.recMsg) return null;
    if (r.recMsg && (r.isRecording || !r.station)) return { text: r.recMsg, color: r.isRecording ? '#ef4444' : undefined };
    const freq = r.freq ? ` · ${r.band === 'AM' ? Math.round(r.freq) : Number(r.freq).toFixed(1)}` : '';
    return { text: `${r.isRadioOn ? '▶' : '■'} ${r.station}${freq}`, color: r.isRecording ? '#ef4444' : undefined };
  },
  fabAlert: (r) => r.isRecording,
  items: [
    { id: 'power', label: 'Ligar / Desligar', symbol: '⏻', keepOpen: true, toggle: true, shortcut: 'p', isActive: (r) => r.isRadioOn,
      badge: (r) => (r.isRadioOn ? 'ON' : 'OFF'), run: () => onToggleRadio() },
    { id: 'next', label: 'Próxima estação', symbol: '>>|', keepOpen: true, shortcut: 'n', run: () => onNextStation() },
    { id: 'prev', label: 'Estação anterior', symbol: '|<<', keepOpen: true, shortcut: 'b', run: () => onPrevStation() },
    { id: 'rec', label: 'Rec', symbol: '●', symbolColor: '#ef4444', keepOpen: true, toggle: true, isActive: (r) => r.isRecording,
      tone: (r) => (r.isRecording ? 'rec' : 'default'), dot: (r) => r.isRecording,
      badge: (r) => (r.isRecording ? mmss(Date.now() - r.recStart) : 'REC'), run: () => onToggleRecordMp3() },
  ],
};
