import React, { useEffect, useRef } from 'react';
import { mountVinylPlayer } from '../music/vinylPlayer';
import '../music/vinylPlayer.css';

// Leitor de vinil offline: toca ficheiros de áudio do próprio dispositivo.
// Ao sair do separador o leitor é desmontado e a música pára, tal como o rádio,
// por isso os dois nunca tocam ao mesmo tempo.
export default function MusicTab() {
  const ref = useRef(null);

  useEffect(() => {
    const destroy = mountVinylPlayer(ref.current);
    return destroy;
  }, []);

  return <div ref={ref} />;
}
